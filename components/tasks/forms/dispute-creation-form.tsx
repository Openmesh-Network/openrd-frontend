"use client"

import { useEffect, useState } from "react"
import { AddressTrustlessManagementContract } from "@/contracts/AddressTrustlessManagement"
import { DAOContract } from "@/contracts/DAOContract"
import { PessimisticActionsContract } from "@/contracts/PessimisticActions"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { TasksDisputesContract } from "@/openrd-indexer/contracts/TasksDisputes"
import { Task } from "@/openrd-indexer/types/tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useForm } from "react-hook-form"
import {
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  decodeFunctionData,
  formatUnits,
  toHex,
} from "viem"
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi"
import { z } from "zod"

import { chains } from "@/config/wagmi-config"
import { errorsOfAbi } from "@/lib/error-decoding"
import { Alert } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
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
import { Textarea } from "@/components/ui/textarea"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { AddToIpfsRequest, AddToIpfsResponse } from "@/app/api/addToIpfs/route"

const formSchema = z.object({
  title: z.string().min(1, "Title cannot be empty."),
  summary: z.string().min(1, "Summary cannot be empty."),
  body: z.string(),
  rewardPercentage: z.coerce
    .number()
    .min(0, "Negative rewards are not possible.")
    .max(
      100,
      "Cannot ask for more than 100% of your agreed completion reward."
    ),
})

export function DipsuteCreationForm({
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
  const account = useAccount()
  const connectedChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()
  const nativeCurrency =
    chains.find((c) => c.id === chainId)?.nativeCurrency ??
    chains[0].nativeCurrency

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      summary: "",
      body: "",
      rewardPercentage: 100,
    },
  })

  const [disputeCost, setDisputeCost] = useState<bigint>(BigInt(0))
  useEffect(() => {
    const getDisputeCost = async () => {
      if (!publicClient) {
        setDisputeCost(BigInt(0))
        return
      }

      const daoDisputeCost = await publicClient.readContract({
        abi: TasksDisputesContract.abi,
        address: TasksDisputesContract.address,
        functionName: "getCost",
        args: [task.disputeManager],
      })
      setDisputeCost(daoDisputeCost)
    }

    getDisputeCost().catch(console.error)
  }, [publicClient, task.disputeManager])

  const [submitting, setSubmitting] = useState<boolean>(false)
  async function onSubmit(values: z.infer<typeof formSchema>) {
    const executorApplication = task.applications[task.executorApplication]
    if (!executorApplication) {
      toast({
        title: "Executor application not found",
        description: "Please try again later.",
        variant: "destructive",
      })
      return
    }

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
        title: "Creating dispute",
        description: "Uploading metadata to IPFS...",
      })

      const metadata = {
        title: values.title,
        summary: values.summary,
        body: values.body,
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
          title: "Dispute creation failed",
          description: "Could not upload metadata to IPFS.",
          variant: "destructive",
        })
        return
      }
      console.log(`Sucessfully uploaded dispute metadata to ipfs: ${cid}`)

      dismiss()
      dismiss = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      }).dismiss

      if (!publicClient || !walletClient) {
        dismiss()
        toast({
          title: "Dispute creation failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      // Assumes default dispute installation
      const managementInfo = {
        manager: AddressTrustlessManagementContract.address,
        role: BigInt(TasksDisputesContract.address),
        trustlessActions: PessimisticActionsContract.address,
      }
      const trustlessActionsInfo = {
        manager: AddressTrustlessManagementContract.address,
        role: BigInt(PessimisticActionsContract.address),
      }
      const disputeInfo = {
        taskId: taskId,
        partialNativeReward: executorApplication.nativeReward.map(
          (reward) =>
            (reward.amount * BigInt(values.rewardPercentage)) / BigInt(100)
        ),
        partialReward: executorApplication.reward.map(
          (reward) =>
            (reward.amount * BigInt(values.rewardPercentage)) / BigInt(100)
        ),
      }
      const transactionRequest = await publicClient
        .simulateContract({
          account: walletClient.account.address,
          abi: [
            ...TasksDisputesContract.abi,
            ...errorsOfAbi(AddressTrustlessManagementContract.abi),
            ...errorsOfAbi(PessimisticActionsContract.abi),
            ...errorsOfAbi(DAOContract.abi),
          ],
          address: TasksDisputesContract.address,
          functionName: "createDispute",
          args: [
            task.disputeManager,
            `ipfs://${cid}`,
            managementInfo,
            trustlessActionsInfo,
            disputeInfo,
          ],
          chain: chains.find((c) => c.id == chainId),
          value: disputeCost,
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
          title: "Dispute creation failed",
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
          title: "Dispute creation failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Dispute transaction submitted",
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
        title: "Dispute transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let disputeCreated = false
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== TasksContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the tasks contract
            return
          }

          const disputeCreatedEvent = decodeEventLog({
            abi: PessimisticActionsContract.abi,
            eventName: "ActionCreated",
            topics: log.topics,
            data: log.data,
          })
          const tasksAction = decodeFunctionData({
            abi: TasksContract.abi,
            data: disputeCreatedEvent.args.actions[0].data,
          })
          if (
            tasksAction.functionName === "completeByDispute" &&
            tasksAction.args[0] === taskId
          ) {
            disputeCreated = true
          }
        } catch {}
      })
      if (disputeCreated === undefined) {
        dismiss()
        toast({
          title: "Error retrieving dispute created event",
          description: "The dispute creation possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The dispute has been created.",
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

  const [firstRender, setFirstRender] = useState(true)
  useEffect(() => {
    setFirstRender(false)
  }, [])

  if (
    firstRender ||
    !account.address ||
    account.address !== task.applications[task.executorApplication]?.applicant
  ) {
    // Not the executor
    return <Alert>Only the executor can create disputes.</Alert>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Title</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("title")
                  }}
                />
              </FormControl>
              <FormDescription>
                A single sentence or combination of keywords to describe the
                dispute.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="summary"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Summary</FormLabel>
              <FormControl>
                <Textarea
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("summary")
                  }}
                />
              </FormControl>
              <FormDescription>
                Short, high-level overview of what happened. Aim to provide 3-10
                sentences.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="body"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Detailed explanation</FormLabel>
              <FormControl>
                <RichTextArea
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("body")
                  }}
                />
              </FormControl>
              <FormDescription>
                Explain the events that happened leading you to create a
                dispute.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="rewardPercentage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Reward (%)</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step={1}
                  min={0}
                  max={100}
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("rewardPercentage")
                  }}
                />
              </FormControl>
              <FormDescription>
                How much of your application reward you think would be fair to
                receive as compensation for the work you have delivered.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting}>
          Create dispute ({formatUnits(disputeCost, nativeCurrency.decimals)}{" "}
          {nativeCurrency.symbol})
        </Button>
      </form>
    </Form>
  )
}
