/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import {
  Application,
  Reward,
  Task,
  TaskState,
} from "@/openrd-indexer/types/tasks"
import { BaseError, ContractFunctionRevertedError, decodeEventLog } from "viem"
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi"

import { chains } from "@/config/wagmi-config"
import { getUser } from "@/lib/indexer"
import { useENS } from "@/hooks/useENS"
import { useMetadata } from "@/hooks/useMetadata"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/components/ui/link"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { SanitizeHTML } from "@/components/sanitize-html"

import { ShowERC20Reward } from "./show-erc20-reward"
import { ShowNativeReward } from "./show-native-reward"

export interface ShowApplicationMetadata {
  teamSize?: number
  plan?: string
  background?: string
}

export interface ShowApplicantMetadata {
  title?: string
  description?: string
}

export function ShowApplication({
  chainId,
  taskId,
  applicationId,
  application,
  indexerMetadata,
  task,
  refresh,
}: {
  chainId: number
  taskId: bigint
  applicationId: number
  application: Application
  indexerMetadata?: string
  task?: Task
  refresh: () => Promise<void>
}) {
  const account = useAccount()
  const connectedChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()
  const applicantENS = useENS({ address: application.applicant })

  const directMetadata = useMetadata<ShowApplicationMetadata | undefined>({
    url: application.metadata,
    defaultValue: undefined,
    emptyValue: {},
  })

  const indexedMetadata = indexerMetadata
    ? (JSON.parse(indexerMetadata) as ShowApplicationMetadata)
    : undefined
  const teamSize = directMetadata?.teamSize ?? indexedMetadata?.teamSize
  const plan =
    directMetadata?.plan ?? indexedMetadata?.plan ?? "No plan was provided."
  const background = directMetadata?.background ?? indexedMetadata?.background

  const [applicantMetadata, setApplicantMetadata] = useState<
    ShowApplicantMetadata | undefined
  >(undefined)
  useEffect(() => {
    const getApplicantMetadata = async () => {
      const user = await getUser(application.applicant)
      setApplicantMetadata(
        user.metadata
          ? (JSON.parse(user.metadata) as ShowApplicantMetadata)
          : {}
      )
    }

    getApplicantMetadata().catch(console.error)
  }, [application.applicant])
  const userTitle =
    applicantMetadata?.title ?? applicantENS ?? application.applicant
  const userDescription = applicantMetadata?.description

  const [approvingApplication, setApprovingApplication] =
    useState<boolean>(false)
  async function approveApplication() {
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
    if (approvingApplication) {
      toast({
        title: "Please wait",
        description: "The past approve is still running.",
        variant: "destructive",
      })
      return
    }
    const approve = async () => {
      setApprovingApplication(true)
      let { dismiss } = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      })

      if (!publicClient || !walletClient) {
        dismiss()
        toast({
          title: "Application approve failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      const transactionRequest = await publicClient
        .simulateContract({
          account: walletClient.account.address,
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "acceptApplications",
          args: [taskId, [applicationId]],
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
          title: "Application approve failed",
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
          title: "Application approve failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Approve transaction submitted",
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
        title: "Approve transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let applicationAccepted = false
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== TasksContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the tasks contract
            return
          }

          const applicationAcceptedEvent = decodeEventLog({
            abi: TasksContract.abi,
            eventName: "ApplicationAccepted",
            topics: log.topics,
            data: log.data,
          })
          if (
            applicationAcceptedEvent.args.taskId === taskId &&
            applicationAcceptedEvent.args.applicationId === applicationId
          ) {
            applicationAccepted = true
          }
        } catch {}
      })
      if (!applicationAccepted) {
        dismiss()
        toast({
          title: "Error confirming approve",
          description: "The application approve possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The application has been approved.",
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

    await approve().catch(console.error)
    setApprovingApplication(false)
  }

  const [takingTask, setTakingTask] = useState<boolean>(false)
  async function takeTask() {
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
    if (approvingApplication) {
      toast({
        title: "Please wait",
        description: "The past take task is still running.",
        variant: "destructive",
      })
      return
    }
    const take = async () => {
      setApprovingApplication(true)
      let { dismiss } = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      })

      if (!publicClient || !walletClient) {
        dismiss()
        toast({
          title: "Take task failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      const transactionRequest = await publicClient
        .simulateContract({
          account: walletClient.account.address,
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "takeTask",
          args: [taskId, applicationId],
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
          title: "Take task failed",
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
          title: "Take task failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Take task submitted",
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
        title: "Task task transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let taskTaken = false
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== TasksContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the tasks contract
            return
          }

          const taskTakenEvent = decodeEventLog({
            abi: TasksContract.abi,
            eventName: "TaskTaken",
            topics: log.topics,
            data: log.data,
          })
          if (
            taskTakenEvent.args.taskId === taskId &&
            taskTakenEvent.args.applicationId === applicationId
          ) {
            taskTaken = true
          }
        } catch {}
      })
      if (!taskTaken) {
        dismiss()
        toast({
          title: "Error confirming task taken",
          description: "The task taken transaction possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The task has been taken.",
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

    await take().catch(console.error)
    setTakingTask(false)
  }

  const [firstRender, setFirstRender] = useState(true)
  useEffect(() => {
    setFirstRender(false)
  }, [])

  return (
    <Card className="!rounded-none !border-0 !border-b-[2px] !shadow-none">
      <CardHeader>
        <CardTitle className="flex space-x-2">
          {/* Would be cool to add a hover effect here to show stats of the person (completion rate etc.) */}
          <div className="flex gap-x-[15px]">
            <img
              alt="matic"
              src={`https://effigy.im/a/${application.applicant}.svg`}
              className="w-[35px] rounded-full"
            ></img>
            <Link
              href={`/profile/${application.applicant}`}
              className="shrink text-[20px]"
            >
              {userTitle}
            </Link>
          </div>
          {application.accepted && <Badge variant="success">Accepted</Badge>}
          {task?.state === TaskState.Taken &&
            applicationId === task?.executorApplication && (
              <Badge variant="secondary">Executor</Badge>
            )}
        </CardTitle>
        {userDescription && <SanitizeHTML html={userDescription} />}
      </CardHeader>
      <CardContent className="">
        <div className="space-y-2">
          {teamSize !== undefined && teamSize !== 0 && (
            <span>Team size: {teamSize}</span>
          )}
          {plan && (
            <div className="mb-8">
              <div className="mb-4 text-grey dark:text-light">Plan</div>
              <SanitizeHTML html={plan} />
            </div>
          )}
          {background && (
            <div className="">
              <div className="mb-4 text-grey dark:text-light">Background</div>
              <SanitizeHTML html={background} />
            </div>
          )}
          <div className="!mt-8 mb-4 text-grey dark:text-light">Budget</div>
          {application.nativeReward.length !== 0 && (
            <ShowNativeReward
              chainId={chainId}
              reward={application.nativeReward}
            />
          )}
          {application.reward.length !== 0 &&
            task &&
            task.budget.map((b, i) => (
              <ShowERC20Reward
                key={i}
                chainId={chainId}
                budget={b}
                reward={
                  application.reward.reduce(
                    (acc, value) => {
                      if (acc.token === i) {
                        acc.return.push(value)
                      }
                      if (value.nextToken) {
                        acc.token++
                      }
                      return acc
                    },
                    { token: 0, return: [] as Reward[] }
                  ).return
                }
              />
            ))}
        </div>
      </CardContent>
      {!firstRender &&
        task?.state === TaskState.Open &&
        application.accepted &&
        account.address === application.applicant && (
          <CardFooter>
            <Button
              onClick={() => takeTask().catch(console.error)}
              disabled={takingTask}
            >
              Take task
            </Button>
          </CardFooter>
        )}
      {!firstRender &&
        task?.state === TaskState.Open &&
        !application.accepted &&
        account.address === task?.manager && (
          <CardFooter>
            <Button
              onClick={() => approveApplication().catch(console.error)}
              disabled={approvingApplication}
            >
              Approve application
            </Button>
          </CardFooter>
        )}
    </Card>
  )
}
