"use client"

import { useEffect, useState } from "react"
import { CrowdfundedTasksManagerContract } from "@/contracts/CrowdfundedTasksManager"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { SubmissionJudgement, Task } from "@/openrd-indexer/types/tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import {
  Address,
  decodeFunctionData,
  encodeFunctionData,
  erc20Abi,
  formatUnits,
  Hex,
  zeroAddress,
} from "viem"
import { usePublicClient } from "wagmi"
import { z } from "zod"

import { addToIpfs } from "@/lib/api"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RichTextArea } from "@/components/ui/rich-textarea"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import { SanitizeHTML } from "@/components/sanitize-html"
import { ERC20AllowanceCheck } from "@/components/web3/erc20-allowance-check"
import { ERC20BalanceInput } from "@/components/web3/erc20-balance-input"

export function ShowCrowdfunding({
  chainId,
  taskId,
  taskManager,
  budgetTokens,
}: {
  chainId: number
  taskId: bigint
  taskManager: Address
  budgetTokens: Address[]
}) {
  const walletClient = useAbstractWalletClient({ chainId })
  const publicClient = usePublicClient({ chainId })

  const { data: decimals } = useQuery({
    queryKey: [publicClient, chainId, taskManager, "decimals"],
    queryFn: async () => {
      return await publicClient?.readContract({
        abi: CrowdfundedTasksManagerContract.abi,
        address: taskManager,
        functionName: "decimals",
      })
    },
    staleTime: Infinity,
  })

  const { data: balance } = useQuery({
    queryKey: [
      publicClient,
      chainId,
      taskManager,
      walletClient?.account.address,
      "balanceOf",
    ],
    queryFn: async () => {
      if (!walletClient) {
        return undefined
      }

      return await publicClient?.readContract({
        abi: CrowdfundedTasksManagerContract.abi,
        address: taskManager,
        functionName: "balanceOf",
        args: [walletClient.account.address],
      })
    },
  })

  const { data: proposalCount, refetch: refresh } = useQuery({
    queryKey: [publicClient, chainId, taskManager, "proposalCount"],
    queryFn: async () => {
      return await publicClient?.readContract({
        abi: CrowdfundedTasksManagerContract.abi,
        address: taskManager,
        functionName: "proposalCount",
      })
    },
  })

  return (
    <div>
      {decimals !== undefined && balance !== undefined && (
        <span>You have {formatUnits(balance, decimals)} voting tokens.</span>
      )}
      <Contribute
        chainId={chainId}
        contract={taskManager}
        budgetTokens={budgetTokens}
      />
      {proposalCount !== undefined &&
        new Array(Number(proposalCount))
          .fill(0)
          .map((_, i) => i)
          .toReversed()
          .map((proposalId) => (
            <ShowProposal
              chainId={chainId}
              contract={taskManager}
              proposalId={BigInt(proposalId)}
            />
          ))}
      {balance !== undefined && balance !== BigInt(0) && (
        <CreateProposal chainId={chainId} taskId={taskId} refresh={refresh} />
      )}
    </div>
  )
}

function Contribute({
  chainId,
  contract,
  budgetTokens,
}: {
  chainId: number
  contract: Address
  budgetTokens: Address[]
}) {
  const walletClient = useAbstractWalletClient({ chainId })
  const publicClient = usePublicClient({ chainId })
  const [token, setToken] = useState<Address>(zeroAddress)
  const [amount, setAmount] = useState<bigint>(BigInt(0))

  const { data: tokenInfo } = useQuery({
    initialData: {},
    queryKey: [publicClient, chainId, contract, budgetTokens, "allowedTokens"],
    queryFn: async () => {
      const result = (await publicClient?.multicall({
        contracts: budgetTokens.map((b) => {
          return {
            abi: CrowdfundedTasksManagerContract.abi,
            address: contract,
            functionName: "allowedTokens",
            args: [b],
          }
        }),
        allowFailure: false,
      })) as
        | {
            rate: bigint
          }[]
        | undefined
      return (
        result?.reduce(
          (prev, val, i) => {
            prev[budgetTokens[i]] = val
            return prev
          },
          {} as { [token: Address]: { rate: bigint } }
        ) ?? {}
      )
    },
  })

  const { data: tokenMetadata } = useQuery({
    queryKey: [publicClient, chainId, budgetTokens, "allowedTokens"],
    queryFn: async () => {
      const result = (await publicClient?.multicall({
        contracts: budgetTokens
          .map((b) => {
            return [
              { abi: erc20Abi, address: b, functionName: "name" },
              { abi: erc20Abi, address: b, functionName: "symbol" },
            ]
          })
          .flat(),
      })) as { result?: string }[] | undefined
      return (
        result?.reduce(
          (prev, val, i) => {
            switch (i % 2) {
              case 0:
                prev[budgetTokens[i / 2]] = {}
                prev[budgetTokens[i / 2]].name = val.result
                break
              case 1:
                prev[budgetTokens[i / 2]].symbol = val.result
            }
            return prev
          },
          {} as { [token: Address]: { name?: string; symbol?: string } }
        ) ?? {}
      )
    },
  })

  return (
    <div>
      <div>
        <Combobox
          value={token}
          onChange={(t) => setToken(t as Address)}
          options={[
            { label: "", value: zeroAddress, hidden: true },
            ...budgetTokens.map((b, i) => {
              return {
                label: `${tokenMetadata?.[b]?.name ?? b} (${tokenMetadata?.[b]?.symbol ?? "???"})`,
                value: b,
              }
            }),
          ]}
        />
        {token !== zeroAddress && (
          <ERC20BalanceInput
            chainId={chainId}
            token={token}
            value={amount}
            onChange={setAmount}
            account={walletClient?.account?.address}
          />
        )}
      </div>
      <ERC20AllowanceCheck
        spender={contract}
        token={token}
        amount={amount}
        account={walletClient?.account?.address}
      />
      <span>
        You will receive {formatUnits(amount * tokenInfo[token].rate, 18)}{" "}
        voting tokens for your contribution.
      </span>
      <Button>Contribute</Button>
    </div>
  )
}

interface ShowProposalMetadata {
  description?: string
}
enum Vote {
  None,
  Accept,
  Reject,
}
function ShowProposal({
  chainId,
  contract,
  proposalId,
}: {
  chainId: number
  contract: Address
  proposalId: bigint
}) {
  const walletClient = useAbstractWalletClient({ chainId })
  const publicClient = usePublicClient({ chainId })

  const { data: proposalInfo } = useQuery({
    queryKey: [publicClient, chainId, contract, proposalId, "proposalInfo"],
    queryFn: async () => {
      return await publicClient?.readContract({
        abi: CrowdfundedTasksManagerContract.abi,
        address: contract,
        functionName: "proposalInfo",
        args: [proposalId],
      })
    },
  })

  const { data: previousVote } = useQuery({
    queryKey: [
      publicClient,
      chainId,
      contract,
      proposalId,
      walletClient?.account.address,
      "proposalVotes",
    ],
    queryFn: async () => {
      if (!walletClient) {
        return undefined
      }

      return await publicClient?.readContract({
        abi: CrowdfundedTasksManagerContract.abi,
        address: contract,
        functionName: "proposalVotes",
        args: [proposalId, walletClient.account.address],
      })
    },
  })

  const { data: votingPower } = useQuery({
    initialData: BigInt(0),
    queryKey: [
      publicClient,
      chainId,
      contract,
      proposalId,
      walletClient?.account.address,
      proposalInfo?.snapshot,
      "getPastVotes",
    ],
    queryFn: async () => {
      if (!walletClient || !proposalInfo) {
        return undefined
      }

      return await publicClient?.readContract({
        abi: CrowdfundedTasksManagerContract.abi,
        address: contract,
        functionName: "getPastVotes",
        args: [walletClient?.account.address, BigInt(proposalInfo.snapshot)],
      })
    },
  })

  // Get metadata with proposalInfo.snapshot
  const metadata: ShowProposalMetadata | undefined = {
    description: "Test Description",
  }
  const description = metadata?.description
  const action = proposalInfo
    ? decodeFunctionData({
        abi: TasksContract.abi,
        data: proposalInfo.action,
      })
    : undefined

  // Show proposals (+ show votes and allow vote)
  return (
    <Card>
      <CardHeader>
        <CardTitle>
          #{proposalId.toString()}: {action?.functionName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {description && <SanitizeHTML html={description} />}
      </CardContent>
      <CardFooter>
        {previousVote !== undefined && previousVote !== Vote.None ? (
          <span>You voted {Vote[previousVote]}</span>
        ) : votingPower !== undefined && votingPower === BigInt(0) ? (
          <span>
            You are not eligible to vote as you did not hold any voting power at
            proposal creation.
          </span>
        ) : walletClient === undefined ? (
          <span>Connect your wallet to vote.</span>
        ) : (
          <div>
            <Button className="bg-green-600 hover:bg-green-700">Accept</Button>
            <Button variant="destructive">Reject</Button>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}

const formSchema = z.object({
  description: z.string().min(1, "Description cannot be empty."),

  action: z.string().min(1, "Action cannot be empty."),
})
enum ActionType {
  AcceptApplication,
  ReviewSubmission,
}
function CreateProposal({
  chainId,
  taskId,
  refresh,
}: {
  chainId: number
  taskId: bigint
  refresh: () => void
}) {
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({ chainId })

  const [actionType, setActionType] = useState<ActionType>(
    ActionType.AcceptApplication
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      description: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Proposal creation",
      transaction: async () => {
        const metadata: ShowProposalMetadata = {
          description: values.description,
        }
        const cid = await addToIpfs(metadata, loggers)
        if (!cid) {
          return undefined
        }

        const metadataUri = `ipfs://${cid}`
        const action = values.action as Hex
        return {
          abi: CrowdfundedTasksManagerContract.abi,
          address: "0x",
          functionName: "createProposal",
          args: [metadataUri, action],
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
          name="action"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Action</FormLabel>
              <FormControl>
                <Combobox
                  value={actionType}
                  onChange={(a) => setActionType(a as ActionType)}
                  options={[
                    {
                      label: "Accept applicant",
                      value: ActionType.AcceptApplication,
                    },
                    {
                      label: "Review submission",
                      value: ActionType.ReviewSubmission,
                    },
                  ]}
                />
                {actionType === ActionType.AcceptApplication && (
                  <AcceptApplication
                    taskId={taskId}
                    onChange={(change) => {
                      field.onChange(change)
                      form.trigger("action")
                    }}
                  />
                )}
                {actionType === ActionType.ReviewSubmission && (
                  <ReviewSubmission
                    taskId={taskId}
                    onChange={(change) => {
                      field.onChange(change)
                      form.trigger("action")
                    }}
                  />
                )}
              </FormControl>
              <FormDescription>
                The action that will be performed if this proposal is accepted.
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
                Explain why you think this action should be performed.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={performingTransaction}>
          Create proposal
        </Button>
      </form>
    </Form>
  )
}

function AcceptApplication({
  taskId,
  onChange,
}: {
  taskId: bigint
  onChange: (value: string) => void
}) {
  const [applicationId, setApplicationId] = useState<number>(0)

  useEffect(() => {
    onChange(
      encodeFunctionData({
        abi: TasksContract.abi,
        functionName: "acceptApplications",
        args: [taskId, [applicationId]],
      })
    )
  }, [applicationId])

  return (
    <div>
      <Label>Application Id</Label>
      <Input
        type="number"
        min={0}
        value={applicationId}
        onChange={(e) => setApplicationId(parseInt(e.target.value))}
      />
    </div>
  )
}

function ReviewSubmission({
  taskId,
  onChange,
}: {
  taskId: bigint
  onChange: (value: string) => void
}) {
  const [submissionId, setSubmissionId] = useState<number>(0)
  const [judgement, setJudgement] = useState<SubmissionJudgement>(
    SubmissionJudgement.Accepted
  )
  const [explanation, setExplanation] = useState<string>("")

  useEffect(() => {
    onChange(
      encodeFunctionData({
        abi: TasksContract.abi,
        functionName: "reviewSubmission",
        args: [taskId, submissionId, judgement, explanation],
      })
    )
  }, [submissionId, judgement, explanation])

  return (
    <div>
      <div>
        <Label>Submissions Id</Label>
        <Input
          type="number"
          min={0}
          value={submissionId}
          onChange={(e) => setSubmissionId(parseInt(e.target.value))}
        />
      </div>
      <div>
        <Label>Judgement</Label>
        <Combobox
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
          value={judgement}
          onChange={(j) => setJudgement(j as SubmissionJudgement)}
        />
      </div>
      <div>
        <Label>Explanation</Label>
        <RichTextArea value={explanation} onChange={setExplanation} />
      </div>
    </div>
  )
}
