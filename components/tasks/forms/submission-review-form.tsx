"use client"

import { useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { SubmissionJudgement } from "@/openrd-indexer/types/tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useForm } from "react-hook-form"
import { BaseError, ContractFunctionRevertedError, decodeEventLog } from "viem"
import { useChainId, usePublicClient, useSwitchChain } from "wagmi"
import { z } from "zod"

import { chains } from "@/config/wagmi-config"
import { useAbstractWalletClient } from "@/hooks/useAbstractWalletClient"
import { Button } from "@/components/ui/button"
import { Combobox } from "@/components/ui/combobox"
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
import { AddToIpfsRequest, AddToIpfsResponse } from "@/app/api/addToIpfs/route"

const formSchema = z.object({
  judgement: z.nativeEnum(SubmissionJudgement),

  feedback: z.string(),
})

export function SubmissionReviewForm({
  chainId,
  taskId,
  submissionId,
  refresh,
}: {
  chainId: number
  taskId: bigint
  submissionId: number
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
      judgement: SubmissionJudgement.Accepted,

      feedback: "",
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
        title: "Reviewing submission",
        description: "Uploading metadata to IPFS...",
      })

      const metadata = {
        feedback: values.feedback,
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
          title: "Submission review failed",
          description: "Could not upload metadata to IPFS.",
          variant: "destructive",
        })
        return
      }
      console.log(
        `Sucessfully uploaded submission review metadata to ipfs: ${cid}`
      )

      dismiss()
      dismiss = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      }).dismiss

      if (!publicClient || !walletClient?.account) {
        dismiss()
        toast({
          title: "Submission review failed",
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
          functionName: "reviewSubmission",
          args: [taskId, submissionId, values.judgement, `ipfs://${cid}`],
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
          title: "Submission review failed",
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
          title: "Submission review failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Submission review transaction submitted",
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
        title: "Submission review transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let submissionReviewed = false
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== TasksContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the tasks contract
            return
          }

          const submissionReviewedEvent = decodeEventLog({
            abi: TasksContract.abi,
            eventName: "SubmissionReviewed",
            topics: log.topics,
            data: log.data,
          })
          if (
            submissionReviewedEvent.args.taskId === taskId &&
            submissionReviewedEvent.args.submissionId === submissionId
          ) {
            submissionReviewed = true
          }
        } catch {}
      })
      if (!submissionReviewed) {
        dismiss()
        toast({
          title: "Error confirming submission reviewed",
          description: "The submission review possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The submission has been reviewed.",
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
          name="judgement"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Judgement</FormLabel>
              <FormControl>
                <Combobox
                  {...field}
                  options={[
                    {
                      label: "Accept",
                      value: SubmissionJudgement.Accepted,
                    },
                    {
                      label: "Reject",
                      value: SubmissionJudgement.Rejected,
                    },
                  ]}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("judgement")
                  }}
                />
              </FormControl>
              <FormDescription>
                The onchain decision about the submission. Accepting it means
                the task will be closed and the executor will get their asked
                reward. You will be refunded any leftover budget after this
                transfer. Rejecting the submission will not trigger any action.
                The executor can open a dispute if they do not agree with your
                decision.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="feedback"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Feedback</FormLabel>
              <FormControl>
                <RichTextArea
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("feedback")
                  }}
                />
              </FormControl>
              <FormDescription>
                Explanation to the executor on your review judgement decision.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting}>
          Review submission
        </Button>
      </form>
    </Form>
  )
}
