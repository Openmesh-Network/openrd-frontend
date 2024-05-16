"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { Task } from "@/openrd-indexer/types/tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useFieldArray, useForm } from "react-hook-form"
import {
  Address,
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  isAddress,
  parseEther,
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
import { Input } from "@/components/ui/input"
import { RichTextArea } from "@/components/ui/rich-textarea"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import {
  AddressPicker,
  SelectableAddresses,
} from "@/components/web3/address-picker"
import { ERC20BalanceInput } from "@/components/web3/erc20-balance-input"
import { NativeBalanceInput } from "@/components/web3/native-balance-input"
import { AddToIpfsRequest, AddToIpfsResponse } from "@/app/api/addToIpfs/route"
import {
  TokenMetadataRequest,
  TokenMetadataResponse,
} from "@/app/api/tokenMetadata/route"

const formSchema = z.object({
  // Onchain fields
  nativeReward: z
    .object({
      to: z.string().regex(validAddress, "To must be a valid address."),
      amount: z.coerce.bigint().min(BigInt(0), "Amount cannot be negative."),
    })
    .array(),
  reward: z
    .object({
      to: z.string().regex(validAddress, "To must be a valid address."),
      token: z.string().regex(validAddress, "Token must be a valid address."),
      amount: z.coerce.bigint().min(BigInt(0), "Amount cannot be negative."),
    })
    .array(),

  // Metadata fields
  teamSize: z.coerce.number().min(0, "Team size cannot be empty."),
  plan: z.string().min(1, "Plan cannot be empty."),
  background: z.string(),
})

export function ApplicationCreationForm({
  chainId,
  taskId,
  task,
  refresh,
}: {
  chainId: number
  taskId: bigint
  task: Task
  refresh: () => Promise<void>
}) {
  const connectedChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const walletClient = useAbstractWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()

  const [selectableAddresses, setSelectableAddresses] =
    useState<SelectableAddresses>({})
  useEffect(() => {
    if (!walletClient?.account?.address) {
      setSelectableAddresses({})
      return
    }

    setSelectableAddresses({
      [walletClient.account.address]: { name: "Yourself" },
    })
  }, [walletClient?.account?.address])

  const [budgetTokens, setBudgetTokens] = useState<SelectableAddresses>({})
  useEffect(() => {
    const getBudgetTokens = async () => {
      const request: TokenMetadataRequest = {
        chainId: chainId,
        addresses: task.budget.map((b) => b.tokenContract),
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
  }, [chainId, task.budget])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nativeReward: [],
      reward: [],

      teamSize: 0,
      plan: "",
      background: "",
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
        title: "Creating application",
        description: "Uploading metadata to IPFS...",
      })

      const metadata = {
        teamSize: values.teamSize,
        plan: values.plan,
        background: values.background,
      }
      const addToIpfsRequest: AddToIpfsRequest = {
        json: JSON.stringify(metadata),
      }
      const cid = await axios
        .post("/api/addToIpfs", addToIpfsRequest)
        .then((response) => (response.data as AddToIpfsResponse).cid)
        .catch((err) => {
          console.error(err)
          return undefined
        })
      if (!cid) {
        dismiss()
        toast({
          title: "Application creation failed",
          description: "Could not upload metadata to IPFS.",
          variant: "destructive",
        })
        return
      }
      console.log(`Sucessfully uploaded application metadata to ipfs: ${cid}`)

      dismiss()
      dismiss = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      }).dismiss

      const nativeReward = values.nativeReward.map((r) => {
        return {
          ...r,
          to: r.to as Address,
        }
      })
      const reward = task.budget
        .map((b) =>
          values.reward.filter((r) => r.token === b.tokenContract.toLowerCase())
        )
        .reduce(
          (acc, value) => {
            if (value.length === 0) {
              // Push record to skip this token
              acc.push({
                nextToken: true,
                to: "0x519ce4C129a981B2CBB4C3990B1391dA24E8EbF3",
                amount: BigInt(0),
              })
            } else {
              acc.push(
                ...value.map((v, i) => {
                  return {
                    nextToken: i === value.length - 1,
                    to: v.to as Address,
                    amount: v.amount,
                  }
                })
              )
            }
            return acc
          },
          [] as { nextToken: boolean; to: Address; amount: bigint }[]
        )
      if (!publicClient || !walletClient?.account) {
        dismiss()
        toast({
          title: "Application creation failed",
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
          functionName: "applyForTask",
          args: [taskId, `ipfs://${cid}`, nativeReward, reward],
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
          title: "Application creation failed",
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
          title: "Application creation failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Application transaction submitted",
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
        title: "Application transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let applicationId: number | undefined
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== TasksContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the tasks contract
            return
          }

          const applicationCreatedEvent = decodeEventLog({
            abi: TasksContract.abi,
            eventName: "ApplicationCreated",
            topics: log.topics,
            data: log.data,
          })
          if (applicationCreatedEvent.args.taskId === taskId) {
            applicationId = applicationCreatedEvent.args.applicationId
          }
        } catch {}
      })
      if (applicationId === undefined) {
        dismiss()
        toast({
          title: "Error retrieving application id",
          description: "The application creation possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The application has been created.",
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

  const {
    fields: nativeReward,
    append: appendNativeReward,
    remove: removeNativeReward,
    update: updateNativeReward,
  } = useFieldArray({
    name: "nativeReward",
    control: form.control,
  })

  const {
    fields: reward,
    append: appendReward,
    remove: removeReward,
    update: updateReward,
  } = useFieldArray({
    name: "reward",
    control: form.control,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="teamSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Team Size</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("teamSize")
                  }}
                />
              </FormControl>
              <FormDescription>
                How large is the team that will work on the task.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="plan"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Plan of Approach</FormLabel>
              <FormControl>
                <RichTextArea
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("plan")
                  }}
                />
              </FormControl>
              <FormDescription>
                Full description on how you will complete the task. This
                includes a list of deliverables.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="background"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Background</FormLabel>
              <FormControl>
                <RichTextArea
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("background")
                  }}
                />
              </FormControl>
              <FormDescription>
                Additonal section to tell the manager more about your expertise
                related to this task.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        {task.nativeBudget !== BigInt(0) && (
          <FormItem>
            <FormLabel>Native Rewards</FormLabel>
            <FormControl>
              <div>
                {nativeReward.map((nativeRewardItem, i) => (
                  <ErrorWrapper
                    key={i}
                    error={form.formState.errors.nativeReward?.at?.(i)}
                  >
                    <div className="flex gap-x-1 w-full">
                      <AddressPicker
                        addressName="receiver"
                        selectableAddresses={selectableAddresses}
                        value={nativeRewardItem.to}
                        onChange={(change) => {
                          updateNativeReward(i, {
                            ...nativeRewardItem,
                            to: change ?? "",
                          })
                          form.trigger("nativeReward")
                        }}
                        customAllowed={true}
                      />
                      <NativeBalanceInput
                        value={nativeRewardItem.amount}
                        onChange={(change) => {
                          updateNativeReward(i, {
                            ...nativeRewardItem,
                            amount: change,
                          })
                          form.trigger("nativeReward")
                        }}
                        account={walletClient?.account?.address}
                      />
                      <Button
                        onClick={() => removeNativeReward(i)}
                        variant="destructive"
                      >
                        X
                      </Button>
                    </div>
                  </ErrorWrapper>
                ))}
                <Button
                  onClick={() =>
                    appendNativeReward({ to: "", amount: BigInt(0) })
                  }
                >
                  Add native reward
                </Button>
              </div>
            </FormControl>
            <FormDescription>
              The amount of native currency that your require for completing
              this task. This can exceed the current budget amount.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
        {task.budget.length !== 0 && (
          <FormItem>
            <FormLabel>ERC20 Rewards</FormLabel>
            <FormControl>
              <div>
                {reward.map((rewardItem, i) => (
                  <ErrorWrapper
                    key={i}
                    error={form.formState.errors.reward?.at?.(i)}
                  >
                    <div className="flex gap-x-1 w-full">
                      <AddressPicker
                        addressName="receiver"
                        selectableAddresses={selectableAddresses}
                        value={rewardItem.to}
                        onChange={(change) => {
                          updateReward(i, {
                            ...rewardItem,
                            to: change ?? "",
                          })
                          form.trigger("reward")
                        }}
                        customAllowed={true}
                      />
                      <AddressPicker
                        addressName="ERC20 token"
                        selectableAddresses={budgetTokens}
                        value={rewardItem.token}
                        onChange={(change) => {
                          updateReward(i, {
                            ...rewardItem,
                            token: change ?? "",
                          })
                          form.trigger("reward")
                        }}
                      />
                      <ERC20BalanceInput
                        token={
                          isAddress(rewardItem.token)
                            ? rewardItem.token
                            : undefined
                        }
                        value={rewardItem.amount}
                        onChange={(change) => {
                          updateReward(i, { ...rewardItem, amount: change })
                          form.trigger("reward")
                        }}
                        account={walletClient?.account?.address}
                        showAvailable={false}
                      />
                      <Button
                        onClick={() => removeReward(i)}
                        variant="destructive"
                      >
                        X
                      </Button>
                    </div>
                  </ErrorWrapper>
                ))}
                <Button
                  onClick={() =>
                    appendReward({ to: "", token: "", amount: BigInt(0) })
                  }
                >
                  Add ERC20 reward
                </Button>
              </div>
            </FormControl>
            <FormDescription>
              The amount of ERC20 currency that your require for completing this
              task. This is limited to the ERC20 tokens set as budget, but can
              exceed the current budget amount.
            </FormDescription>
            <FormMessage />
          </FormItem>
        )}
        <Button type="submit" disabled={submitting}>
          Create application
        </Button>
      </form>
    </Form>
  )
}
