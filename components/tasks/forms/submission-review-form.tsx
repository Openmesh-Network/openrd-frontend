"use client"

import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { SubmissionJudgement } from "@/openrd-indexer/types/tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { addToIpfs } from "@/lib/api"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
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
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({ chainId })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      judgement: SubmissionJudgement.Accepted,

      feedback: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Submission review",
      transaction: async () => {
        const metadata = {
          feedback: values.feedback,
        }
        const cid = await addToIpfs(metadata, loggers)
        if (!cid) {
          return undefined
        }
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "reviewSubmission",
          args: [taskId, submissionId, values.judgement, `ipfs://${cid}`],
        }
      },
      onConfirmed: (receipt) => {
        refresh()
      },
    })
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
        <Button type="submit" disabled={performingTransaction}>
          Review submission
        </Button>
      </form>
    </Form>
  )
}
