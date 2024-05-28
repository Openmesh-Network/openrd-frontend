"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { ERC20Transfer } from "@/openrd-indexer/types/tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useFieldArray, useForm } from "react-hook-form"
import {
  Address,
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
} from "viem"
import { useChainId, usePublicClient, useSwitchChain } from "wagmi"
import { z } from "zod"

import { chains } from "@/config/wagmi-config"
import { validAddress } from "@/lib/regex"
import { Button } from "@/components/ui/button"
import { ErrorWrapper } from "@/components/ui/error-wrapper"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import {
  AddressPicker,
  SelectableAddresses,
} from "@/components/web3/address-picker"
import { ERC20AllowanceCheck } from "@/components/web3/erc20-allowance-check"
import { ERC20BalanceInput } from "@/components/web3/erc20-balance-input"
import { NativeBalanceInput } from "@/components/web3/native-balance-input"
import {
  TokenMetadataRequest,
  TokenMetadataResponse,
} from "@/app/api/tokenMetadata/route"

const formSchema = z.object({
  nativeBudget: z.coerce
    .bigint()
    .min(BigInt(0), "Native budget cannot be negative."),
  budget: z
    .object({
      tokenContract: z
        .string()
        .regex(validAddress, "ERC20 contract must be a valid address."),
      amount: z.coerce.bigint().min(BigInt(0), "Amount cannot be negative."),
    })
    .array(),
})

export function IncreaseBudget({
  chainId,
  taskId,
  nativeBudget,
  budget,
  refresh,
}: {
  chainId: number
  taskId: bigint
  nativeBudget: bigint
  budget: ERC20Transfer[]
  refresh: () => Promise<void>
}) {
  const connectedChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const walletClient = useAbstractWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nativeBudget: nativeBudget,
      budget: budget,
    },
  })

  const [submitting, setSubmitting] = useState<boolean>(false)
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (connectedChainId !== chainId) {
      const switchChainResult = await switchChainAsync?.({
        chainId: chainId,
      }).catch((err) => {
        console.error(err)
      })
      if (!switchChainResult || switchChainResult.id !== chainId) {
        toast({
          title: "Wrong chain",
          description: `Please switch to ${chains.find((c) => c.id === chainId)?.name ?? chainId}.`,
          variant: "destructive",
        })
        return
      }
    }
    if (submitting) {
      toast({
        title: "Please wait",
        description: "The past submission is still running.",
        variant: "destructive",
      })
      return
    }
    const submit = async () => {
      setSubmitting(true)

      let { dismiss } = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      })

      if (!publicClient || !walletClient?.account) {
        dismiss()
        toast({
          title: "Budget increase failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      const transactionRequest = await publicClient
        .simulateContract({
          account: walletClient.account,
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "increaseBudget",
          args: [
            taskId,
            values.budget.map((b, i) => b.amount - budget[i].amount),
          ],
          value: values.nativeBudget - nativeBudget,
          chain: chains.find((c) => c.id == chainId),
        })
        .catch((err) => {
          console.error(err)
          if (err instanceof BaseError) {
            let errorName = err.shortMessage ?? "Simulation failed."
            const revertError = err.walk(
              (err) => err instanceof ContractFunctionRevertedError
            )
            if (revertError instanceof ContractFunctionRevertedError) {
              errorName += ` -> ${revertError.data?.errorName}` ?? ""
            }
            return errorName
          }
          return "Simulation failed."
        })
      if (typeof transactionRequest === "string") {
        dismiss()
        toast({
          title: "Budget increase failed",
          description: transactionRequest,
          variant: "destructive",
        })
        return
      }
      const transactionHash = await walletClient
        .writeContract(transactionRequest.request)
        .catch((err) => {
          console.error(err)
          return undefined
        })
      if (!transactionHash) {
        dismiss()
        toast({
          title: "Budget increase failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Increase budget transaction submitted",
        description: "Waiting until confirmed on the blockchain...",
        action: (
          <ToastAction
            altText="View on explorer"
            onClick={() => {
              const chain = chains.find((c) => c.id === chainId)
              if (!chain) {
                return
              }

              window.open(
                `${chain.blockExplorers.default.url}/tx/${transactionHash}`,
                "_blank"
              )
            }}
          >
            View on explorer
          </ToastAction>
        ),
      }).dismiss

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      })
      dismiss()
      dismiss = toast({
        title: "Increase budget transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let budgetChanged = false
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== TasksContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the tasks contract
            return
          }

          const submissionCreatedEvent = decodeEventLog({
            abi: TasksContract.abi,
            eventName: "BudgetChanged",
            topics: log.topics,
            data: log.data,
          })
          if (submissionCreatedEvent.args.taskId === taskId) {
            budgetChanged = true
          }
        } catch {}
      })
      if (!budgetChanged) {
        dismiss()
        toast({
          title: "Error retrieving budget changed event",
          description: "The budget increase possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The budget has been increased.",
        variant: "success",
        action: (
          <ToastAction
            altText="Refresh"
            onClick={() => {
              refresh()
            }}
          >
            Refresh
          </ToastAction>
        ),
      }).dismiss
    }

    await submit().catch(console.error)
    setSubmitting(false)
  }

  const [budgetTokens, setBudgetTokens] = useState<SelectableAddresses>({})
  useEffect(() => {
    const getBudgetTokens = async () => {
      const request: TokenMetadataRequest = {
        chainId: chainId,
        addresses: budget.map((b) => b.tokenContract),
      }
      const tokensResponse = await axios.post(
        "/api/tokenMetadata/",
        JSON.stringify(request)
      )

      if (tokensResponse.status === 200) {
        const data = tokensResponse.data as TokenMetadataResponse
        setBudgetTokens(
          data.tokens.reduce((acc, token) => {
            let name: string = token.contractAddress
            if (token.name) {
              name = token.name
            }
            if (token.symbol) {
              name = `${name} (${token.symbol})`
            }

            acc[token.contractAddress as Address] = {
              name: name,
              logo: token.logo,
            }
            return acc
          }, {} as SelectableAddresses)
        )
      } else {
        console.warn(
          `Token metadata fetch failed: ${JSON.stringify(tokensResponse)}`
        )
      }
    }

    getBudgetTokens().catch(console.error)
  }, [chainId, budget])

  const {
    fields: newBudget,
    append: appendBudget,
    remove: removeBudget,
    update: updateBudget,
  } = useFieldArray({
    name: "budget",
    control: form.control,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="nativeBudget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Native Budget</FormLabel>
              <FormControl>
                <NativeBalanceInput
                  chainId={chainId}
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("nativeBudget")
                  }}
                  account={walletClient?.account?.address}
                />
              </FormControl>
              <FormDescription>
                The amount of native currency that is available as budget for
                this task (ETH on Ethereum, MATIC on Polygon).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>ERC20 Budget</FormLabel>
          <FormControl>
            <div>
              {newBudget.map((budgetItem, i) => (
                <ErrorWrapper
                  key={i}
                  error={form.formState.errors.budget?.at?.(i)}
                >
                  <div className="flex gap-x-1 w-full">
                    <AddressPicker
                      addressName="ERC20 token"
                      selectableAddresses={{
                        [budgetItem.tokenContract]:
                          budgetTokens[budgetItem.tokenContract as Address],
                      }}
                      value={budgetItem.tokenContract}
                    />
                    <ERC20BalanceInput
                      chainId={chainId}
                      token={budgetItem.tokenContract as Address}
                      min={budget[i].amount}
                      value={budgetItem.amount}
                      onChange={(change) => {
                        updateBudget(i, { ...budgetItem, amount: change })
                        form.trigger("budget")
                      }}
                      account={walletClient?.account?.address}
                    />
                  </div>
                  <ERC20AllowanceCheck
                    spender={TasksContract.address}
                    token={budgetItem.tokenContract as Address}
                    amount={budgetItem.amount - budget[i].amount}
                    account={walletClient?.account?.address}
                  />
                </ErrorWrapper>
              ))}
            </div>
          </FormControl>
          <FormDescription>
            The amount of ERC20 currency that is available as budget for this
            task. This can be any token, such as USDT, USDC, or WETH.
          </FormDescription>
          <FormMessage />
        </FormItem>
        <Button type="submit" disabled={submitting}>
          Increase budget
        </Button>
      </form>
    </Form>
  )
}
