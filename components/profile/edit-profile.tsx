"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { addToIpfs } from "@/openrd-indexer/utils/ipfs"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { useAccount, useWalletClient } from "wagmi"
import { z } from "zod"

import { setMetadata } from "@/lib/indexer"
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
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

const formSchema = z.object({
  // Onchain fields
  title: z.string(),
  description: z.string(),
})

export function EditProfile() {
  const { data: walletClient } = useWalletClient()
  const { toast } = useToast()
  const { push } = useRouter()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
    },
  })

  const [submitting, setSubmitting] = useState<boolean>(false)
  async function onSubmit(values: z.infer<typeof formSchema>) {
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
        title: "Editing profile",
        description: "Uploading metadata to IPFS...",
      })

      const metadata = {
        title: values.title,
        description: values.description,
      }
      const cid = await addToIpfs(JSON.stringify(metadata)).catch((err) => {
        console.error(err)
        return undefined
      })
      if (!cid) {
        dismiss()
        toast({
          title: "Profile edit failed",
          description: "Could not upload metadata to IPFS.",
          variant: "destructive",
        })
        return
      }
      console.log(`Sucessfully uploaded profile metadata to ipfs: ${cid}`)

      dismiss()
      dismiss = toast({
        title: "Generating message",
        description: "Please sign the message in your wallet...",
      }).dismiss

      if (!walletClient) {
        dismiss()
        toast({
          title: "Profile edit failed",
          description: "WalletClient is undefined.",
          variant: "destructive",
        })
        return
      }

      const metadataUri = `ipfs://${cid}`
      const signature = await walletClient
        .signMessage({
          message: `OpenR&D metadata: ${metadataUri}`,
        })
        .catch((err) => {
          console.error(err)
          return undefined
        })
      if (!signature) {
        dismiss()
        toast({
          title: "Profile edit failed",
          description: "Signature rejected.",
          variant: "destructive",
        })
        return
      }

      await setMetadata(walletClient.account.address, metadataUri, signature)

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "Your profile has been edited.",
        variant: "success",
        action: (
          <ToastAction
            altText="View profile"
            onClick={() => {
              push(`/profile/${walletClient.account.address}`)
            }}
          >
            View profile
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
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Username</FormLabel>
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
                What name you think is best fitting for you.
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
                Here you can put all details related to who you are, what skills
                you have, and anything else you think is relevant.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={submitting}>
          Edit profile
        </Button>
      </form>
    </Form>
  )
}
