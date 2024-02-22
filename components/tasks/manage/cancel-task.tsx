"use client"

import { useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { addToIpfs } from "@/openrd-indexer/utils/ipfs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { BaseError, ContractFunctionRevertedError, decodeEventLog } from "viem"
import {
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi"
import { z } from "zod"

import { chains } from "@/config/wagmi-config"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { RichTextArea } from "@/components/ui/rich-textarea"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

const formSchema = z.object({
  reason: z.string(),
})

export function CancelTask({
  chainId,
  taskId,
  needRequest,
  refresh,
}: {
  chainId: number
  taskId: bigint
  needRequest: boolean
  refresh: () => Promise<void>
}) {
  const connectedChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
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
        title: "Updating metadata",
        description: "Uploading metadata to IPFS...",
      })

      const metadata = {
        reason: values.reason,
      }
      const cid = await addToIpfs(JSON.stringify(metadata)).catch((err) => {
        console.error(err)
        return undefined
      })
      if (!cid) {
        dismiss()
        toast({
          title: "Cancel task failed",
          description: "Could not upload metadata to IPFS.",
          variant: "destructive",
        })
        return
      }
      console.log(`Sucessfully uploaded cancel task metadata to ipfs: ${cid}`)

      dismiss()
      dismiss = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      }).dismiss

      if (!publicClient || !walletClient) {
        dismiss()
        toast({
          title: "Cancel task failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      const transactionRequest = await publicClient
        .simulateContract({
          account: walletClient.account.address,
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "cancelTask",
          args: [taskId, `ipfs://${cid}`],
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
          title: "Cancel task failed",
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
          title: "Cancel task failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Cancel task transaction submitted",
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
        title: "Cancel task transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let taskCancelled = false
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
            eventName: "TaskCancelled",
            topics: log.topics,
            data: log.data,
          })
          if (submissionCreatedEvent.args.taskId === taskId) {
            taskCancelled = true
          }
        } catch {}
      })
      if (!taskCancelled) {
        dismiss()
        toast({
          title: "Error retrieving task cancelled event",
          description: "The task cancel possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: needRequest
          ? "The task request has been submitted."
          : "The task has been cancelled.",
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
    <Dialog>
      <DialogTrigger
        className={buttonVariants({ variant: "destructive" })}
        disabled={submitting}
      >
        Cancel task
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Are you absolutely sure?</DialogTitle>
          <DialogDescription>
            This action cannot be undone. This will permanently close this task.
            The task creator will be refunded the entire budget.
            <br />
            <br />
            {needRequest &&
              "The task has already been given to an applicant. Canceling the task will create a request, but it will only be cancelled if they accept it."}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason</FormLabel>
                  <FormControl>
                    <RichTextArea
                      {...field}
                      onChange={(change) => {
                        field.onChange(change)
                        form.trigger("reason")
                      }}
                    />
                  </FormControl>
                  <FormDescription>
                    The reason why the task is being cancelled.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" variant="destructive">
              Cancel task
            </Button>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
