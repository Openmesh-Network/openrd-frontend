"use client"

import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"

import { addToIpfs } from "@/lib/api"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
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

import { ShowTaskMetadata } from "../show/show-task"

const formSchema = z.object({
  title: z.string().min(1, "Title cannot be empty."),
  tags: z
    .object({
      tag: z.string().min(1, "Tag cannot be empty."),
    })
    .array(),
  projectSize: z.coerce.number().min(0, "Project size cannot be negative."),
  teamSize: z.coerce.number().min(0, "Team size cannot be negative."),
  description: z.string().min(1, "Description cannot be empty."),
  resources: z.string(),
  links: z
    .object({
      name: z.string().min(1, "Name cannot be empty."),
      url: z.string().url("URL is invalid."),
    })
    .array(),
})

export function EditMetadata({
  chainId,
  taskId,
  metadata,
  refresh,
}: {
  chainId: number
  taskId: bigint
  metadata: ShowTaskMetadata
  refresh: () => Promise<void>
}) {
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({ chainId })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: metadata.title ?? "",
      tags: metadata.tags ?? [],
      projectSize: metadata.projectSize ?? 0,
      teamSize: metadata.teamSize ?? 0,
      description: metadata.description ?? "",
      resources: metadata.resources ?? "",
      links: metadata.links ?? [],
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Edit metadata",
      transaction: async () => {
        const metadata = {
          title: values.title,
          tags: values.tags,
          projectSize: values.projectSize,
          teamSize: values.teamSize,
          description: values.description,
          resources: values.resources,
          links: values.links,
        }
        const cid = await addToIpfs(metadata, loggers)
        if (!cid) {
          return undefined
        }
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "editMetadata",
          args: [taskId, `ipfs://${cid}`],
        }
      },
      onConfirmed: (receipt) => {
        refresh()
      },
    })
  }

  const {
    fields: tags,
    append: appendTag,
    remove: removeTag,
    update: updateTag,
  } = useFieldArray({
    name: "tags",
    control: form.control,
  })

  const {
    fields: links,
    append: appendLink,
    remove: removeLink,
    update: updateLink,
  } = useFieldArray({
    name: "links",
    control: form.control,
  })

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
                High level description what your task is about.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Tags</FormLabel>
          <FormControl>
            <div>
              {tags.map((tag, i) => (
                <ErrorWrapper
                  key={i}
                  error={form.formState.errors.tags?.at?.(i)}
                >
                  <div className="flex gap-x-1">
                    <Input
                      value={tag.tag}
                      onChange={(change) => {
                        updateTag(i, { ...tag, tag: change.target.value })
                        form.trigger("tags")
                      }}
                    />
                    <Button onClick={() => removeTag(i)} variant="destructive">
                      X
                    </Button>
                  </div>
                </ErrorWrapper>
              ))}
              <Button onClick={() => appendTag({ tag: "" })}>Add tag</Button>
            </div>
          </FormControl>
          <FormDescription>
            Tags help applicants find the task based on their interests and
            skillset.
          </FormDescription>
          <FormMessage />
        </FormItem>
        <FormField
          control={form.control}
          name="projectSize"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Duration</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("projectSize")
                  }}
                />
              </FormControl>
              <FormDescription>
                An estimate of how many (combined) hours are required to
                complete the task.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
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
                Recommended team size for completing the task.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <RichTextArea
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("description")
                  }}
                />
              </FormControl>
              <FormDescription>
                Full description with all details needed to understand and
                complete the task. This is important to be on the same line as
                your applicants, ambiguity could cause them to complete the task
                as described, but different from your expectation and
                interpetation. This description will also be leading in case of
                a dispute.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="resources"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Resources</FormLabel>
              <FormControl>
                <RichTextArea
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("resources")
                  }}
                />
              </FormControl>
              <FormDescription>
                Additonal section to help your applicants find information
                relevant to the task.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Links</FormLabel>
          <FormControl>
            <div>
              {links.map((link, i) => (
                <ErrorWrapper
                  key={i}
                  error={form.formState.errors.links?.at?.(i)}
                >
                  <div className="flex gap-x-4">
                    <Input
                      placeholder="Name"
                      value={link.name}
                      onChange={(change) => {
                        updateLink(i, { ...link, name: change.target.value })
                        form.trigger("links")
                      }}
                    />
                    <Input
                      placeholder="URL"
                      value={link.url}
                      onChange={(change) => {
                        updateLink(i, { ...link, url: change.target.value })
                        form.trigger("links")
                      }}
                    />
                    <Button onClick={() => removeLink(i)} variant="destructive">
                      X
                    </Button>
                    {form.formState.errors.links && (
                      <p>{form.formState.errors.links[i]?.message}</p>
                    )}
                  </div>
                </ErrorWrapper>
              ))}
              <Button onClick={() => appendLink({ name: "", url: "" })}>
                Add link
              </Button>
            </div>
          </FormControl>
          <FormDescription>
            Links to the project github or how to contact the proposer. Email
            addresses should be formatted as mailto:info@example.com
          </FormDescription>
          <FormMessage />
        </FormItem>
        <Button type="submit" disabled={performingTransaction}>
          Edit metadata
        </Button>
      </form>
    </Form>
  )
}
