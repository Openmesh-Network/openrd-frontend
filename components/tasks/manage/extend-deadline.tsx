"use client"

import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { z } from "zod"

import { usePerformTransaction } from "@/hooks/usePerformTransaction"
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

  const { performTransaction, performingTransaction } = usePerformTransaction({
    chainId,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deadline: deadlineAsDate,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Extend deadline",
      transaction: async () => {
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "extendDeadline",
          args: [
            taskId,
            BigInt(Math.round(values.deadline.getTime() / 1000)) - deadline,
          ],
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
        <Button type="submit" disabled={performingTransaction}>
          Extend deadline
        </Button>
      </form>
    </Form>
  )
}
