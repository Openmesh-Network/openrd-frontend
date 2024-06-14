"use client"

import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { addToIpfs } from "@/lib/api"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
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
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({ chainId })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      reason: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Cancel task",
      transaction: async () => {
        const metadata = {
          reason: values.reason,
        }
        const cid = await addToIpfs(metadata, loggers)
        if (!cid) {
          return undefined
        }
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "cancelTask",
          args: [taskId, `ipfs://${cid}`],
        }
      },
      onConfirmed: (receipt) => {
        refresh()
      },
    })
  }

  return (
    <Dialog>
      <DialogTrigger
        className={buttonVariants({ variant: "destructive" })}
        disabled={performingTransaction}
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
