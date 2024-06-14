"use client"

import { useEffect, useState } from "react"
import { AddressTrustlessManagementContract } from "@/contracts/AddressTrustlessManagement"
import { DAOContract } from "@/contracts/DAOContract"
import { PessimisticActionsContract } from "@/contracts/PessimisticActions"
import { TaskDisputesContract } from "@/openrd-indexer/contracts/TaskDisputes"
import { Task } from "@/openrd-indexer/types/tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { formatUnits } from "viem"
import { usePublicClient } from "wagmi"
import { z } from "zod"

import { chains } from "@/config/wagmi-config"
import { addToIpfs } from "@/lib/api"
import { errorsOfAbi } from "@/lib/error-decoding"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
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
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"

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
  const walletClient = useAbstractWalletClient({ chainId })
  const publicClient = usePublicClient({ chainId })
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({ chainId })
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
        abi: TaskDisputesContract.abi,
        address: TaskDisputesContract.address,
        functionName: "getCost",
        args: [task.disputeManager],
      })
      setDisputeCost(daoDisputeCost)
    }

    getDisputeCost().catch(console.error)
  }, [publicClient, task.disputeManager])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Dispute creation",
      transaction: async () => {
        const executorApplication = task.applications[task.executorApplication]
        if (!executorApplication) {
          loggers.onError?.({
            title: "Executor application not found",
            description: "Please try again later.",
          })
          return undefined
        }

        const metadata = {
          title: values.title,
          summary: values.summary,
          body: values.body,
        }
        const cid = await addToIpfs(metadata, loggers)
        if (!cid) {
          return undefined
        }

        // Assumes default dispute installation
        const managementInfo = {
          manager: AddressTrustlessManagementContract.address,
          role: BigInt(TaskDisputesContract.address),
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
        return {
          abi: [
            ...TaskDisputesContract.abi,
            ...errorsOfAbi(AddressTrustlessManagementContract.abi),
            ...errorsOfAbi(PessimisticActionsContract.abi),
            ...errorsOfAbi(DAOContract.abi),
          ],
          address: TaskDisputesContract.address,
          functionName: "createDispute",
          args: [
            task.disputeManager,
            `ipfs://${cid}`,
            managementInfo,
            trustlessActionsInfo,
            disputeInfo,
          ],
          value: disputeCost,
        }
      },
      onConfirmed: (receipt) => {
        refresh()
      },
    })
  }

  const [firstRender, setFirstRender] = useState(true)
  useEffect(() => {
    setFirstRender(false)
  }, [])

  if (
    firstRender ||
    !walletClient?.account?.address ||
    walletClient.account.address !==
      task.applications[task.executorApplication]?.applicant
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
        <Button type="submit" disabled={performingTransaction}>
          Create dispute ({formatUnits(disputeCost, nativeCurrency.decimals)}{" "}
          {nativeCurrency.symbol})
        </Button>
      </form>
    </Form>
  )
}
