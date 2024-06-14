"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { Task } from "@/openrd-indexer/types/tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { addToIpfs } from "@/lib/api"
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
import { RichTextArea } from "@/components/ui/rich-textarea"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"

const formSchema = z.object({
  explanation: z.string(),
})

export function SubmissionCreationForm({
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
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({ chainId })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      explanation: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Submission creation",
      transaction: async () => {
        const metadata = {
          explanation: values.explanation,
        }
        const cid = await addToIpfs(metadata, loggers)
        if (!cid) {
          return undefined
        }
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "createSubmission",
          args: [taskId, `ipfs://${cid}`],
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
    return <Alert>Only the executor can create submissions.</Alert>
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="explanation"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Delivered</FormLabel>
              <FormControl>
                <RichTextArea
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("explanation")
                  }}
                />
              </FormControl>
              <FormDescription>
                What has been delivered and where to find it. Proofs the task
                has been completed as requested.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={performingTransaction}>
          Create submission
        </Button>
      </form>
    </Form>
  )
}
