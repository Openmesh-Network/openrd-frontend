"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { RFPsContract } from "@/openrd-indexer/contracts/RFPs"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useFieldArray, useForm } from "react-hook-form"
import {
  Address,
  BaseError,
  ContractFunctionRevertedError,
  decodeEventLog,
  encodeFunctionData,
  Hex,
  isAddress,
} from "viem"
import { useChainId, usePublicClient } from "wagmi"
import { z } from "zod"

import { chains } from "@/config/wagmi-config"
import { validAddress, validAddressOrEmpty } from "@/lib/regex"
import { Button } from "@/components/ui/button"
import { DatePicker } from "@/components/ui/date-picker"
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
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import { useSettings } from "@/components/context/settings"
import {
  AddressPicker,
  SelectableAddresses,
} from "@/components/web3/address-picker"
import { ERC20AllowanceCheck } from "@/components/web3/erc20-allowance-check"
import { ERC20BalanceInput } from "@/components/web3/erc20-balance-input"
import { NativeBalanceInput } from "@/components/web3/native-balance-input"
import { AddToIpfsRequest, AddToIpfsResponse } from "@/app/api/addToIpfs/route"
import { TokensRequest, TokensResponse } from "@/app/api/tokens/route"

const formSchema = z.object({
  // Onchain fields
  deadline: z.date().min(new Date(), "Deadline must be in the future."),
  manager: z.string().regex(validAddress, "Manager must be a valid address."),
  taskManager: z
    .string()
    .regex(validAddress, "Task manager must be a valid address."),
  disputeManger: z
    .string()
    .regex(validAddress, "Dispute manager must be a valid address."),
  nativeBudget: z.coerce
    .bigint()
    .min(BigInt(0), "Native budget cannot be negative."),
  budget: z
    .object({
      tokenContract: z
        .string()
        .regex(validAddress, "ERC20 contract must be a valid address."),
      amount: z.coerce.bigint().min(BigInt(0), "Amount cannot be negative."),
    })
    .array(),

  // Metadata fields
  title: z.string().min(1, "Title cannot be empty."),
  tags: z
    .object({
      tag: z.string().min(1, "Tag cannot be empty."),
    })
    .array(),
  maxProjectFunding: z.string(),
  maxAwardedProjects: z.coerce
    .number()
    .min(0, "Max awarded projects cannot be negative."),
  description: z.string().min(1, "Description cannot be empty."),
  projectRequirements: z.string(),
  links: z
    .object({
      name: z.string().min(1, "Name cannot be empty."),
      url: z.string().url("URL is invalid."),
    })
    .array(),
})

export function RFPCreationForm() {
  const chainId = useChainId()
  const walletClient = useAbstractWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()
  const { push } = useRouter()
  const { simulateTransactions } = useSettings()

  const [managerOptions, setManagerOptions] = useState<SelectableAddresses>({})
  useEffect(() => {
    if (!walletClient?.account?.address) {
      setManagerOptions({})
      return
    }

    setManagerOptions({
      [walletClient.account.address]: { name: "Myself" },
    })
  }, [walletClient?.account?.address])
  const disputeManagerOptions: SelectableAddresses = {
    "0x7aC61b993B4aa460EDf7BC4266Ed4BBCa20bF2Db": {
      name: "Openmesh Dispute Department",
    },
  }

  const [tokens, setTokens] = useState<SelectableAddresses>({})
  useEffect(() => {
    const getTokens = async () => {
      if (!walletClient?.account?.address) {
        setTokens({})
        return
      }

      const request: TokensRequest = {
        chainId: chainId,
        address: walletClient.account.address,
      }
      const tokensResponse = await axios.post(
        "/api/tokens/",
        JSON.stringify(request)
      )

      if (tokensResponse.status === 200) {
        const data = tokensResponse.data as TokensResponse
        setTokens(
          data.tokens.reduce((acc, token) => {
            let name: string = token.contractAddress
            if (token.name) {
              name = token.name
            }
            if (token.symbol) {
              name = `${name} (${token.symbol})`
            }

            acc[token.contractAddress as Address] = {
              name: name,
              logo: token.logo,
            }
            return acc
          }, {} as SelectableAddresses)
        )
      } else {
        console.warn(`Token fetch failed: ${JSON.stringify(tokensResponse)}`)
      }
    }

    getTokens().catch(console.error)
  }, [walletClient?.account?.address, chainId])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      deadline: new Date(),
      manager: walletClient?.account?.address ?? "",
      taskManager: walletClient?.account?.address ?? "",
      disputeManger: Object.keys(disputeManagerOptions)[0],
      nativeBudget: BigInt(0),
      budget: [],

      title: "",
      tags: [],
      maxProjectFunding: "",
      maxAwardedProjects: 0,
      description: "",
      projectRequirements: "",
      links: [],
    },
  })

  const [submitting, setSubmitting] = useState<boolean>(false)
  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (submitting) {
      toast({
        title: "Please wait",
        description: "The past submission is still running.",
      })
      return
    }
    const submit = async () => {
      setSubmitting(true)
      let { dismiss } = toast({
        title: "Creating RFP",
        description: "Uploading metadata to IPFS...",
      })

      const metadata = {
        title: values.title,
        tags: values.tags,
        maxProjectFunding: values.maxProjectFunding,
        maxAwardedProjects: values.maxAwardedProjects,
        description: values.description,
        projectRequirements: values.projectRequirements,
        links: values.links,
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
          title: "RFP creation failed",
          description: "Could not upload metadata to IPFS.",
          variant: "destructive",
        })
        return
      }
      console.log(`Sucessfully uploaded RFP metadata to ipfs: ${cid}`)

      dismiss()
      dismiss = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      }).dismiss

      if (!publicClient || !walletClient?.account) {
        dismiss()
        toast({
          title: "Task creation failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      const contractCall = {
        chain: undefined,
        account: walletClient.account,
        abi: RFPsContract.abi,
        address: RFPsContract.address,
        functionName: "createRFP",
        args: [
          `ipfs://${cid}`,
          BigInt(Math.round(values.deadline.getTime() / 1000)),
          values.budget.map((b) => {
            return {
              ...b,
              tokenContract: b.tokenContract as Address,
            }
          }),
          values.taskManager as Address,
          values.disputeManger as Address,
          values.manager as Address,
        ],
        value: values.nativeBudget,
      } as const
      let transactionHash: Hex | undefined
      if (simulateTransactions) {
        const transactionRequest = await publicClient
          .simulateContract(contractCall)
          .then((result) => result.request)
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
            title: "RFP creation failed",
            description: transactionRequest,
            variant: "destructive",
          })
          return
        }
        transactionHash = await walletClient
          .writeContract(transactionRequest)
          .catch((err) => {
            console.error(err)
            return undefined
          })
      } else {
        transactionHash = await walletClient
          .writeContract(contractCall)
          .catch((err) => {
            console.error(err)
            return undefined
          })
      }
      if (!transactionHash) {
        dismiss()
        toast({
          title: "RFP creation failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "RFP transaction submitted",
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
        title: "RFP transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let rfpId: bigint | undefined
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== RFPsContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the tasks contract
            return
          }

          const rfpCreatedEvent = decodeEventLog({
            abi: RFPsContract.abi,
            eventName: "RFPCreated",
            topics: log.topics,
            data: log.data,
          })
          rfpId = rfpCreatedEvent.args.rfpId
        } catch {}
      })
      if (rfpId === undefined) {
        dismiss()
        toast({
          title: "Error retrieving RFP id",
          description: "The RFP creation possibly failed.",
          variant: "destructive",
        })
        return
      }

      setTimeout(() => {
        if (walletClient.chain) {
          push(`/RFPs/${walletClient.chain.id}:${rfpId}`)
        }
      }, 2000)

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The RFP has been created.",
        variant: "success",
      }).dismiss
    }

    await submit().catch(console.error)
    setSubmitting(false)
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

  const {
    fields: budget,
    append: appendBudget,
    remove: removeBudget,
    update: updateBudget,
  } = useFieldArray({
    name: "budget",
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
                High level description what your RFP is about.
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
            Tags help applicants find the RFP based on their interests and skill
            set.
          </FormDescription>
          <FormMessage />
        </FormItem>
        <FormField
          control={form.control}
          name="maxProjectFunding"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Project Funding</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("maxProjectFunding")
                  }}
                />
              </FormControl>
              <FormDescription>
                The maximum funding you are planning to allocate to a single
                project. This is not enforced.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="maxAwardedProjects"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Max Awarded projects</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min={0}
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("maxAwardedProjects")
                  }}
                />
              </FormControl>
              <FormDescription>
                The maximum amount of projects your are planning to fund with
                this RFP. This is not enforced.
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
                Full description with all details about the RFP. What is the
                goal and what will the process look like.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="projectRequirements"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Requirements</FormLabel>
              <FormControl>
                <RichTextArea
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("projectRequirements")
                  }}
                />
              </FormControl>
              <FormDescription>
                Additional section to clearly outline the requirements the
                project needs to fulfil to be considered to be funded by this
                RFP.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>Links</FormLabel>
          <FormControl>
            <div>
              <div className="mb-[10px] grid gap-y-[10px]">
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
                      <Button
                        onClick={() => removeLink(i)}
                        variant="destructive"
                        className="my-auto h-[25px] w-[45px] p-[2px]"
                      >
                        <Image
                          height={20}
                          width={20}
                          src={`/images/utils/x.svg`}
                          alt={""}
                        />
                      </Button>
                      {form.formState.errors.links && (
                        <p>{form.formState.errors.links[i]?.message}</p>
                      )}
                    </div>
                  </ErrorWrapper>
                ))}
              </div>
              <Button onClick={() => appendLink({ name: "", url: "" })}>
                Add link
              </Button>
            </div>
          </FormControl>
          <FormDescription>
            Links to the relevant websites or how to contact the proposer. Email
            addresses should be formatted as mailto:info@example.com
          </FormDescription>
          <FormMessage />
        </FormItem>

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
                  minValue={new Date()}
                />
              </FormControl>
              <FormDescription>
                Application deadline for projects. After this date no new
                projects can apply, this is enforced. This cannot be changed
                after creation.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="manager"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Manager</FormLabel>
              <FormControl>
                <AddressPicker
                  addressName="manager"
                  selectableAddresses={managerOptions}
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("manager")
                  }}
                  customAllowed={true}
                />
              </FormControl>
              <FormDescription>
                This entity will handle the management side of the RFP. Normally
                this will be you, but you can transfer this power to another
                entity if you wish.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="taskManager"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Task Manager</FormLabel>
              <FormControl>
                <AddressPicker
                  addressName="taskManager"
                  selectableAddresses={managerOptions}
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("manager")
                  }}
                  customAllowed={true}
                />
              </FormControl>
              <FormDescription>
                This entity will handle the management side of the funded
                project tasks. Normally this will be you, but you can transfer
                this power to another entity if you wish.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="disputeManger"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Dispute Manager</FormLabel>
              <FormControl>
                <AddressPicker
                  addressName="dispute manager"
                  selectableAddresses={disputeManagerOptions}
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("disputeManger")
                  }}
                  customAllowed={true}
                />
              </FormControl>
              <FormDescription>
                This entity will decide if the funded project RFP should be
                (partially) rewarded in case the applicant and manager cannot
                reach an agreement. It is recommended to have a trustworthy
                unbiased entity.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="nativeBudget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Native Budget</FormLabel>
              <FormControl>
                <NativeBalanceInput
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("nativeBudget")
                  }}
                  account={walletClient?.account?.address}
                />
              </FormControl>
              <FormDescription>
                The amount of native currency that is available as budget for
                this RFP (ETH on Ethereum, MATIC on Polygon).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>ERC20 Budget</FormLabel>
          <FormControl>
            <div>
              {budget.map((budgetItem, i) => (
                <ErrorWrapper
                  key={i}
                  error={form.formState.errors.budget?.at?.(i)}
                >
                  <div className="flex gap-x-1 w-full">
                    <AddressPicker
                      addressName="ERC20 token"
                      selectableAddresses={tokens}
                      value={budgetItem.tokenContract}
                      onChange={(change) => {
                        updateBudget(i, {
                          ...budgetItem,
                          tokenContract: change ?? "",
                        })
                        form.trigger("budget")
                      }}
                      customAllowed={true}
                    />
                    <ERC20BalanceInput
                      token={
                        isAddress(budgetItem.tokenContract)
                          ? budgetItem.tokenContract
                          : undefined
                      }
                      value={budgetItem.amount}
                      onChange={(change) => {
                        updateBudget(i, { ...budgetItem, amount: change })
                        form.trigger("budget")
                      }}
                      account={walletClient?.account?.address}
                    />
                    <Button
                      onClick={() => removeBudget(i)}
                      variant="destructive"
                    >
                      X
                    </Button>
                  </div>
                  <ERC20AllowanceCheck
                    spender={RFPsContract.address}
                    token={
                      isAddress(budgetItem.tokenContract)
                        ? budgetItem.tokenContract
                        : undefined
                    }
                    amount={budgetItem.amount}
                    account={walletClient?.account?.address}
                  />
                </ErrorWrapper>
              ))}
              <Button
                onClick={() =>
                  appendBudget({ tokenContract: "", amount: BigInt(0) })
                }
              >
                Add ERC20 token
              </Button>
            </div>
          </FormControl>
          <FormDescription>
            The amount of ERC20 currency that is available as budget for this
            RFP. This can be any token, such as USDT, USDC, or WETH.
          </FormDescription>
          <FormMessage />
        </FormItem>
        <Button type="submit" disabled={submitting}>
          Create RFP
        </Button>
      </form>
    </Form>
  )
}
