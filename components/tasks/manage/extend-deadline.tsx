"use client"

import { useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { BaseError, ContractFunctionRevertedError, decodeEventLog } from "viem"
import { useChainId, usePublicClient, useSwitchChain } from "wagmi"
import { z } from "zod"

import { chains } from "@/config/wagmi-config"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
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

export function ExtendDeadline({
  chainId,
  taskId,
  deadline,
  refresh,
}: {
  chainId: number
  taskId: bigint
  deadline: bigint
  refresh: () => Promise<void>
}) {
  const deadlineAsDate = new Date(Number(deadline) * 1000)
  const formSchema = z.object({
    deadline: z
      .date()
      .min(deadlineAsDate, "New deadline must be after the current deadline."),
  })

  const connectedChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const walletClient = useAbstractWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deadline: deadlineAsDate,
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
          title: "Extend deadline failed",
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
          functionName: "extendDeadline",
          args: [
            taskId,
            BigInt(Math.round(values.deadline.getTime() / 1000)) - deadline,
          ],
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
          title: "Extend deadline failed",
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
          title: "Extend deadline failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Extend deadline transaction submitted",
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
        title: "Extend deadline transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let deadlineChanged = false
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
            eventName: "DeadlineChanged",
            topics: log.topics,
            data: log.data,
          })
          if (submissionCreatedEvent.args.taskId === taskId) {
            deadlineChanged = true
          }
        } catch {}
      })
      if (!deadlineChanged) {
        dismiss()
        toast({
          title: "Error retrieving deadline changed event",
          description: "The deadline extension possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The deadline has been extended.",
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="deadline"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Deadline</FormLabel>
              <FormControl>
                <DatePicker
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("deadline")
                  }}
                  minValue={deadlineAsDate}
                />
              </FormControl>
              <FormDescription>
                In case the task is not completed before this date, you will be
                able to refund the funds. The applicant can however apply for a
                partial reward. You are able to extend the deadline later.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting}>
          Extend deadline
        </Button>
      </form>
    </Form>
  )
}
