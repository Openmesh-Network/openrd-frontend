"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useForm } from "react-hook-form"
import {
  Address,
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  erc20Abi,
  formatUnits,
  isAddress,
  parseAbiItem,
} from "viem"
import { useChainId, usePublicClient } from "wagmi"
import { z } from "zod"

import { chains } from "@/config/wagmi-config"
import { validAddress } from "@/lib/regex"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { ERC20BalanceInput } from "@/components/web3/erc20-balance-input"
import { TokensRequest, TokensResponse } from "@/app/api/tokens/route"

const formSchema = z.object({
  erc20transfer: z.object({
    tokenContract: z
      .string()
      .regex(validAddress, "ERC20 contract must be a valid address."),
    amount: z.coerce.bigint().min(BigInt(0), "Amount cannot be negative."),
  }),
  to: z.string().regex(validAddress, "Receiver must be a valid address."),
})

export function Withdraw() {
  const chainId = useChainId()
  const walletClient = useAbstractWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()

  const [withdrawDone, setWithdrawDone] = useState<string>("")
  const [tokens, setTokens] = useState<SelectableAddresses>({})
  useEffect(() => {
    const getTokens = async () => {
      if (!walletClient?.account?.address) {
        setTokens({})
        return
      }

      const request: TokensRequest = {
        chainId: chainId,
        address: walletClient.account.address,
      }
      const tokensResponse = await axios.post(
        "/api/tokens/",
        JSON.stringify(request)
      )

      if (tokensResponse.status === 200) {
        const data = tokensResponse.data as TokensResponse
        setTokens(
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
        console.warn(`Token fetch failed: ${JSON.stringify(tokensResponse)}`)
      }
    }

    getTokens().catch(console.error)
  }, [walletClient?.account?.address, chainId])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      erc20transfer: {
        tokenContract: "",
        amount: BigInt(0),
      },
      to: "",
    },
  })

  const [submitting, setSubmitting] = useState<boolean>(false)
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (submitting) {
      toast({
        title: "Please wait",
        description: "The past submission is still running.",
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
          title: "Transfer failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      const transactionRequest = await publicClient
        .simulateContract({
          account: walletClient.account,
          abi: [parseAbiItem("function transfer(address to, uint amount)")],
          address: values.erc20transfer.tokenContract as Address,
          functionName: "transfer",
          args: [values.to as Address, values.erc20transfer.amount],
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
          title: "Transfer failed",
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
          title: "Transfer failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Transfer transaction submitted",
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
        title: "Transfer transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let transfer = false
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !==
            values.erc20transfer.tokenContract.toLowerCase()
          ) {
            // Only interested in logs originating from the erc20 contract
            return
          }

          const transferEvent = decodeEventLog({
            abi: erc20Abi,
            eventName: "Transfer",
            topics: log.topics,
            data: log.data,
          })
          transfer = true
        } catch {}
      })
      if (!transfer) {
        dismiss()
        toast({
          title: "Error retrieving transfer event",
          description: "The transfer possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The transfer has succeeded.",
        variant: "success",
      }).dismiss

      const erc20Info = await publicClient.multicall({
        contracts: [
          {
            abi: erc20Abi,
            address: values.erc20transfer.tokenContract as Address,
            functionName: "decimals",
          },
          {
            abi: erc20Abi,
            address: values.erc20transfer.tokenContract as Address,
            functionName: "symbol",
          },
        ],
        allowFailure: false,
      })
      setWithdrawDone(
        `Withdrawn ${formatUnits(values.erc20transfer.amount, erc20Info[0])} ${erc20Info[1]} to ${values.to}.`
      )
    }

    await submit().catch(console.error)
    setSubmitting(false)
  }

  if (withdrawDone) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdraw succeeded!</CardTitle>
          <CardDescription>{withdrawDone}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => setWithdrawDone("")}>Withdraw more</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="erc20transfer"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>ERC20 Transfer</FormLabel>
              <FormControl>
                <div className="flex gap-x-1 w-full">
                  <AddressPicker
                    addressName="ERC20 token"
                    selectableAddresses={tokens}
                    value={field.value.tokenContract}
                    onChange={(change) => {
                      field.value.tokenContract = change ?? ""
                      form.trigger("erc20transfer.tokenContract")
                    }}
                    customAllowed={true}
                  />
                  <ERC20BalanceInput
                    token={
                      isAddress(field.value.tokenContract)
                        ? field.value.tokenContract
                        : undefined
                    }
                    value={field.value.amount}
                    onChange={(change) => {
                      field.value.amount = change
                      form.trigger("erc20transfer.amount")
                    }}
                    account={walletClient?.account?.address}
                  />
                </div>
              </FormControl>
              <FormDescription>
                The type and amount of token you would like to withdraw.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="to"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Receiver</FormLabel>
              <FormControl>
                <AddressPicker
                  addressName="receiver"
                  value={field.value}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("to")
                  }}
                  customAllowed={true}
                />
              </FormControl>
              <FormDescription>
                The address which the tokens should be send to.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting}>
          Withdraw
        </Button>
      </form>
    </Form>
  )
}
