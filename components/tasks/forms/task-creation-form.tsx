"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useFieldArray, useForm } from "react-hook-form"
import { Address, decodeEventLog, isAddress } from "viem"
import { useChainId } from "wagmi"
import { z } from "zod"

import { addToIpfs } from "@/lib/api"
import { validAddress, validAddressOrEmpty } from "@/lib/regex"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
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
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import {
  AddressPicker,
  SelectableAddresses,
} from "@/components/web3/address-picker"
import { ERC20AllowanceCheck } from "@/components/web3/erc20-allowance-check"
import { ERC20BalanceInput } from "@/components/web3/erc20-balance-input"
import { NativeBalanceInput } from "@/components/web3/native-balance-input"
import { TokensRequest, TokensResponse } from "@/app/api/tokens/route"

const formSchema = z.object({
  // Onchain fields
  deadline: z.date().min(new Date(), "Deadline must be in the future."),
  manager: z.string().regex(validAddress, "Manager must be a valid address."),
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
  preapprove: z
    .object({
      applicant: z
        .string()
        .regex(validAddress, "Applicant must be a valid address."),
    })
    .array(),
  draft: z
    .string()
    .regex(validAddressOrEmpty, "Draft DAO must be a valid address."),

  // Additional draft fields

  // Metadata fields
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

export function TaskCreationForm() {
  const chainId = useChainId()
  const walletClient = useAbstractWalletClient({ chainId })
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({ chainId })
  const { push } = useRouter()

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
  const draftOptions: SelectableAddresses = {
    ["" as Address]: { name: "Coming Soon!" },
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
      disputeManger: Object.keys(disputeManagerOptions)[0],
      nativeBudget: BigInt(0),
      budget: [],
      preapprove: [],
      draft: "",

      title: "",
      tags: [],
      projectSize: 0,
      teamSize: 0,
      description: "",
      resources: "",
      links: [
        {
          name: "GitHub",
          url: "",
        },
        {
          name: "Calendly",
          url: "",
        },
      ],
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Task creation",
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
          functionName: "createTask",
          args: [
            `ipfs://${cid}`,
            BigInt(Math.round(values.deadline.getTime() / 1000)),
            values.manager as Address,
            values.disputeManger as Address,
            values.budget.map((b) => {
              return {
                ...b,
                tokenContract: b.tokenContract as Address,
              }
            }),
            values.preapprove.map((p) => {
              return {
                applicant: p.applicant as Address,
                nativeReward:
                  values.nativeBudget !== BigInt(0)
                    ? [
                        {
                          to: p.applicant as Address,
                          amount: values.nativeBudget,
                        },
                      ]
                    : [],
                reward: values.budget.map((b) => {
                  return {
                    nextToken: true,
                    to: p.applicant as Address,
                    amount: b.amount,
                  }
                }),
              }
            }),
          ],
          value: values.nativeBudget,
        }
      },
      onConfirmed: (receipt) => {
        let taskId: bigint | undefined
        receipt.logs.forEach((log) => {
          try {
            if (
              log.address.toLowerCase() !== TasksContract.address.toLowerCase()
            ) {
              // Only interested in logs originating from the tasks contract
              return
            }

            const taskCreatedEvent = decodeEventLog({
              abi: TasksContract.abi,
              eventName: "TaskCreated",
              topics: log.topics,
              data: log.data,
            })
            taskId = taskCreatedEvent.args.taskId
          } catch {}
        })
        if (taskId === undefined) {
          loggers.onError?.({
            title: "Error retrieving task id",
            description: "Task creation possibly failed.",
          })
        }

        setTimeout(() => {
          push(`/tasks/${chainId}:${taskId}`)
        }, 2000)
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

  const {
    fields: budget,
    append: appendBudget,
    remove: removeBudget,
    update: updateBudget,
  } = useFieldArray({
    name: "budget",
    control: form.control,
  })

  const {
    fields: preapprove,
    append: appendPreapprove,
    remove: removePreapprove,
    update: updatePreapprove,
  } = useFieldArray({
    name: "preapprove",
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
            skill set.
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
                interpretation. This description will also be leading in case of
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
                Additional section to help your applicants find information
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
            Links to the project github or how to contact the proposer. Email
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
                In case the task is not completed before this date, you will be
                able to refund the funds. The applicant can however apply for a
                partial reward. You are able to extend the deadline later.
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
                This entity will handle the management side of the task.
                Normally this will be you, but you can transfer this power to
                another entity if you wish.
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
                This entity will decide if the task should be (partially)
                rewarded in case the applicant and manager cannot reach an
                agreement. It is recommended to have a trustworthy unbiased
                entity.
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
                this task (ETH on Ethereum, MATIC on Polygon).
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
                  <div className="flex w-full gap-x-1">
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
                    spender={TasksContract.address}
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
            task. This can be any token, such as USDT, USDC, or WETH.
          </FormDescription>
          <FormMessage />
        </FormItem>
        <FormItem>
          <FormLabel>Preapproved applicants</FormLabel>
          <FormControl>
            <div>
              {preapprove.map((preapproveItem, i) => (
                <ErrorWrapper
                  key={i}
                  error={form.formState.errors.preapprove?.at?.(i)}
                >
                  <div className="flex w-full gap-x-1">
                    <AddressPicker
                      addressName="Applicant"
                      value={preapproveItem.applicant}
                      onChange={(change) => {
                        updatePreapprove(i, {
                          ...preapproveItem,
                          applicant: change ?? "",
                        })
                        form.trigger("preapprove")
                      }}
                      customAllowed={true}
                    />
                    <Button
                      onClick={() => removePreapprove(i)}
                      variant="destructive"
                    >
                      X
                    </Button>
                  </div>
                </ErrorWrapper>
              ))}
              <Button onClick={() => appendPreapprove({ applicant: "" })}>
                Add preapproved applicant
              </Button>
            </div>
          </FormControl>
          <FormDescription>
            If you already have someone willing to take on the task (which you
            are okay with taking it on), you can add them here. This skips the
            steps where they need to create an application and you need to
            accept it. If they are preapproved they will be able to take the
            task right away (with a reward equal to the budget). Until they take
            the task, others will be able to apply and are able to take the task
            if you accept their application.
          </FormDescription>
          <FormMessage />
        </FormItem>
        {false && (
          <FormField
            control={form.control}
            name="draft"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Propose to DAO</FormLabel>
                <FormControl>
                  <AddressPicker
                    addressName="DAO"
                    selectableAddresses={draftOptions}
                    {...field}
                    onChange={(change) => {
                      field.onChange(change)
                      form.trigger("draft")
                    }}
                  />
                </FormControl>
                <FormDescription>
                  Instead of funding this task yourself, you are able to propose
                  it to any DAO that opted into this feature. This includes all
                  Openmesh departments. The task will only be created if the DAO
                  approves it. The budget for the task will be paid from the DAO
                  treasury.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        )}
        <Button type="submit" disabled={performingTransaction}>
          Create task
        </Button>
      </form>
    </Form>
  )
}
