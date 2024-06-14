"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import {
  Application,
  Reward,
  Task,
  TaskState,
} from "@/openrd-indexer/types/tasks"

import { getUser } from "@/lib/indexer"
import { useENS } from "@/hooks/useENS"
import { useMetadata } from "@/hooks/useMetadata"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
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
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
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
  const walletClient = useAbstractWalletClient({ chainId })
  const { performTransaction, performingTransaction } = usePerformTransaction({
    chainId,
  })
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

  async function approveApplication() {
    await performTransaction({
      transactionName: "Approve application",
      transaction: async () => {
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "acceptApplications",
          args: [taskId, [applicationId]],
        }
      },
      onConfirmed: (receipt) => {
        refresh()
      },
    })
  }

  async function takeTask() {
    await performTransaction({
      transactionName: "Take task",
      transaction: async () => {
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "takeTask",
          args: [taskId, applicationId],
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

  return (
    <Card className="!rounded-none !border-0 !border-b-2 !shadow-none">
      <CardHeader>
        <CardTitle className="flex space-x-2">
          {/* Would be cool to add a hover effect here to show stats of the person (completion rate etc.) */}
          <div className="flex gap-x-[15px]">
            <Image
              alt="Applicant avatar"
              src={`https://effigy.im/a/${application.applicant}.svg`}
              className="rounded-full"
              width={35}
              height={35}
            />
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
        walletClient?.account?.address &&
        walletClient.account.address === application.applicant && (
          <CardFooter>
            <Button
              onClick={() => takeTask().catch(console.error)}
              disabled={performingTransaction}
            >
              Take task
            </Button>
          </CardFooter>
        )}
      {!firstRender &&
        task?.state === TaskState.Open &&
        !application.accepted &&
        walletClient?.account?.address &&
        walletClient.account.address === task?.manager && (
          <CardFooter>
            <Button
              onClick={() => approveApplication().catch(console.error)}
              disabled={performingTransaction}
            >
              Approve application
            </Button>
          </CardFooter>
        )}
    </Card>
  )
}
