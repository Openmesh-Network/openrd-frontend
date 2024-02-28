/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from "react"
import { DisputesReturn } from "@/openrd-indexer/api/return-types"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import {
  IndexedTask,
  SubmissionJudgement,
  Task,
  TaskState,
} from "@/openrd-indexer/types/tasks"
import { fetchMetadata } from "@/openrd-indexer/utils/metadata-fetch"
import { formatUnits } from "viem"
import { deepEqual, useAccount, usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { arrayToIndexObject } from "@/lib/array-to-object"
import { getDisputes, getTask, getUser } from "@/lib/indexer"
import { objectKeysInt } from "@/lib/object-keys"
import { useAddressTitle } from "@/hooks/useAddressTitle"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/components/ui/link"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SanitizeHTML } from "@/components/sanitize-html"
import { ApplicationCreationForm } from "@/components/tasks/forms/application-creation-form"
import { SubmissionCreationForm } from "@/components/tasks/forms/submission-creation-form"
import { CancelTask } from "@/components/tasks/manage/cancel-task"
import { EditMetadata } from "@/components/tasks/manage/edit-metadata"
import { ExtendDeadline } from "@/components/tasks/manage/extend-deadline"
import { IncreaseBudget } from "@/components/tasks/manage/increase-budget"

import { DipsuteCreationForm } from "../forms/dispute-creation-form"
import { ShowApplication } from "./show-application"
import { ShowBudgetItem } from "./show-budget-item"
import { ShowCancelTaskRequest } from "./show-cancel-task-request"
import { ShowDispute } from "./show-dispute"
import { ShowEvent } from "./show-event"
import { ShowSubmission } from "./show-submission"

// These variables could contain anything
// Should not assume these types are correct
export interface ShowTaskMetadata {
  title?: string
  tags?: { tag?: string }[]
  projectSize?: number
  teamSize?: number
  description?: string
  resources?: string
  links?: {
    name?: string
    url?: string
  }[]
}

export function ShowTask({
  chainId,
  taskId,
}: {
  chainId: number
  taskId: bigint
}) {
  const account = useAccount()
  const chain = chains.find((c) => c.id === chainId)
  const publicClient = usePublicClient({ chainId: chainId })

  const [blockchainTask, setBlockchainTask] = useState<Task | undefined>(
    undefined
  )
  const [directMetadata, setDirectMetadata] = useState<
    ShowTaskMetadata | undefined
  >(undefined)
  const [indexerTask, setIndexerTask] = useState<IndexedTask | undefined>(
    undefined
  )

  const getBlockchainTask = async () => {
    if (!publicClient) {
      return
    }

    const rawTask = await publicClient.readContract({
      abi: TasksContract.abi,
      address: TasksContract.address,
      functionName: "getTask",
      args: [taskId],
    })

    const task: Task = {
      applications: arrayToIndexObject([
        ...rawTask.applications.map((application) => {
          return {
            ...application,
            nativeReward: [...application.nativeReward],
            reward: [...application.reward],
          }
        }),
      ]),
      budget: [...rawTask.budget],
      cancelTaskRequests: arrayToIndexObject([...rawTask.cancelTaskRequests]),
      creator: rawTask.creator,
      deadline: rawTask.deadline,
      disputeManager: rawTask.disputeManager,
      escrow: rawTask.escrow,
      executorApplication: rawTask.executorApplication,
      manager: rawTask.manager,
      metadata: rawTask.metadata,
      nativeBudget: rawTask.nativeBudget,
      state: rawTask.state,
      submissions: arrayToIndexObject([...rawTask.submissions]),
    }
    setBlockchainTask(task)
  }

  useEffect(() => {
    getBlockchainTask().catch((err) => {
      console.error(err)
      setBlockchainTask(undefined)
    })
  }, [taskId, publicClient])

  const getIndexerTask = async () => {
    const task = await getTask(chainId, taskId)
    setIndexerTask(task)
  }

  useEffect(() => {
    getIndexerTask().catch((err) => {
      console.error(err)
      setIndexerTask(undefined)
    })
  }, [chainId, taskId])

  useEffect(() => {
    const getMetadata = async () => {
      if (!blockchainTask?.metadata) {
        return
      }

      const metadata = await fetchMetadata(blockchainTask?.metadata)
      setDirectMetadata(
        metadata ? (JSON.parse(metadata) as ShowTaskMetadata) : {}
      )
    }

    getMetadata().catch(console.error)
  }, [blockchainTask?.metadata])

  const refresh = async () => {
    getBlockchainTask().catch(console.error)
    getIndexerTask().catch(console.error)
  }

  useEffect(() => {
    if (blockchainTask && indexerTask) {
      // Check for differences/inconsistencies (will be logged as warnings)
      compareTasks(
        blockchainTask,
        indexerTask,
        `Mismatch in blockchain task and indexer task`
      )
      console.log("Equality check finished")
    }
  }, [blockchainTask, indexerTask])

  const [disputes, setDisputes] = useState<DisputesReturn>([])
  const getIndexerDisputes = async () => {
    const newDisputes = await getDisputes(chainId, taskId)
    setDisputes(newDisputes)
  }
  useEffect(() => {
    getIndexerDisputes().catch(console.error)
  }, [chainId, taskId])

  const indexedMetadata = indexerTask?.cachedMetadata
    ? (JSON.parse(indexerTask?.cachedMetadata) as ShowTaskMetadata)
    : undefined
  const title =
    directMetadata?.title ?? indexedMetadata?.title ?? "No title was provided."
  const tags = directMetadata?.tags ?? indexedMetadata?.tags ?? []
  const projectSize =
    directMetadata?.projectSize ?? indexedMetadata?.projectSize
  const teamSize = directMetadata?.teamSize ?? indexedMetadata?.teamSize
  const description =
    directMetadata?.description ??
    indexedMetadata?.description ??
    "No description was provided."
  const resources = directMetadata?.resources ?? indexedMetadata?.resources
  const links = directMetadata?.links ?? indexedMetadata?.links ?? []

  const deadline = blockchainTask?.deadline ?? indexerTask?.deadline
  const executorApplication =
    blockchainTask?.executorApplication ?? indexerTask?.executorApplication
  const manager = blockchainTask?.manager ?? indexerTask?.manager
  const disputeManager =
    blockchainTask?.disputeManager ?? indexerTask?.disputeManager
  const creator = blockchainTask?.creator ?? indexerTask?.creator
  const state = blockchainTask?.state ?? indexerTask?.state
  const escrow = blockchainTask?.escrow ?? indexerTask?.escrow
  const nativeBudget =
    blockchainTask?.nativeBudget ?? indexerTask?.nativeBudget ?? BigInt(0)
  const budget = blockchainTask?.budget ?? indexerTask?.budget ?? []
  const applications =
    blockchainTask?.applications ?? indexerTask?.applications ?? {}
  const submissions =
    blockchainTask?.submissions ?? indexerTask?.submissions ?? {}
  const cancelTaskRequests =
    blockchainTask?.cancelTaskRequests ?? indexerTask?.cancelTaskRequests ?? {}
  const usdValue = indexerTask?.usdValue ?? 0

  const managerTitle = useAddressTitle(manager)
  const disputeManagerTitle = useAddressTitle(disputeManager)
  const creatorTitle = useAddressTitle(creator)

  const events = indexerTask?.events ?? []

  return (
    <div>
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-2xl">
          {title}
        </h1>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <div className="space-x-1">
          <Badge variant="outline">
            Chain: {chain?.name ?? chainId.toString()}
          </Badge>
          <Badge variant="outline">Task ID: {taskId.toString()}</Badge>
        </div>
        {
          tags?.length > 0 && (
            <div className="flex text-[11px] font-semibold text-grey dark:text-light md:text-[14px]">
            <p className="">Tags:</p>
            <div className="flex flex-wrap gap-y-[10px] italic">
              {tags?.map?.((tag, index) => (
                  <p
                    className="ml-1 border-b border-[#505050] dark:border-[#7F8DA3]"
                    key={index}
                  >
                    {tag.tag}
                    {index !== tags.length - 1 && ', '}
                  </p>
                ))}
            </div>
          </div>
          )
        }
        <div className="mt-[25px] flex text-[12px] font-medium text-grey dark:text-light lg:text-[16px]">
          <div className="mr-[22px] flex">
          <svg
            className="mr-[10px] size-[22px]"
            fill="currentColor"
            viewBox="0 0 22 22"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path d="M0 17.4152V19.25C0 20.7668 3.69531 22 8.25 22C12.8047 22 16.5 20.7668 16.5 19.25V17.4152C14.7254 18.6656 11.4812 19.25 8.25 19.25C5.01875 19.25 1.77461 18.6656 0 17.4152ZM13.75 5.5C18.3047 5.5 22 4.2668 22 2.75C22 1.2332 18.3047 0 13.75 0C9.19531 0 5.5 1.2332 5.5 2.75C5.5 4.2668 9.19531 5.5 13.75 5.5ZM0 12.9078V15.125C0 16.6418 3.69531 17.875 8.25 17.875C12.8047 17.875 16.5 16.6418 16.5 15.125V12.9078C14.7254 14.3687 11.477 15.125 8.25 15.125C5.02305 15.125 1.77461 14.3687 0 12.9078ZM17.875 13.3805C20.3371 12.9035 22 12.0184 22 11V9.16523C21.0031 9.86992 19.5379 10.3512 17.875 10.6477V13.3805ZM8.25 6.875C3.69531 6.875 0 8.41328 0 10.3125C0 12.2117 3.69531 13.75 8.25 13.75C12.8047 13.75 16.5 12.2117 16.5 10.3125C16.5 8.41328 12.8047 6.875 8.25 6.875ZM17.673 9.29414C20.2512 8.83008 22 7.91914 22 6.875V5.04023C20.4746 6.11875 17.8535 6.69883 15.0949 6.83633C16.3625 7.45078 17.2949 8.27578 17.673 9.29414Z"/>
          </svg>
            <p className="mr-[3px] flex items-center">
              Available funds:
            </p>{' '}
            <span className="flex items-center text-[12px] font-bold text-[#000] dark:text-[#fff] lg:text-[16px]">
              ${usdValue}
            </span>
          </div>
        </div>
        <Tabs defaultValue="description">
          <TabsList>
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="general">General info</TabsTrigger>
            <TabsTrigger value="applications">Applications</TabsTrigger>
            {state !== undefined && state !== TaskState.Open && (
              <TabsTrigger value="submissions">Submissions</TabsTrigger>
            )}
            {state !== undefined && state !== TaskState.Open && (
              <TabsTrigger value="disputes">Disputes</TabsTrigger>
            )}
            {resources && (
              <TabsTrigger value="resources">Resources</TabsTrigger>
            )}
            {Object.keys(cancelTaskRequests).length !== 0 && (
              <TabsTrigger value="requests">Requests</TabsTrigger>
            )}
            {events.length !== 0 && (
              <TabsTrigger value="events">Updates</TabsTrigger>
            )}
            {state !== undefined &&
              state !== TaskState.Closed &&
              account.address &&
              manager &&
              account.address === manager && (
                <TabsTrigger value="manage">Manage</TabsTrigger>
              )}
          </TabsList>
          <TabsContent value="description">
            <SanitizeHTML html={description} />
          </TabsContent>
          <TabsContent value="general">
            <div className="grid grid-cols-1 space-y-3">
              {projectSize !== undefined && projectSize !== 0 && (
                <span>Estimated amount of (combined) hours: {projectSize}</span>
              )}
              {teamSize !== undefined && teamSize !== 0 && (
                <span>Recommended team size: {teamSize}</span>
              )}
              {links.length !== 0 && (
                <div className="grid grid-cols-1">
                  <span>Links:</span>
                  <ul>
                    {links.map?.((link, i) => (
                      <li key={i}>
                        <Link href={link.url} target="_blank">
                          {link.name ? `${link.name}: ` : ""}
                          {link.url}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <Separator />
              <span>
                Deadline:{" "}
                {deadline
                  ? new Date(Number(deadline) * 1000).toDateString()
                  : "Unknown"}
              </span>
              <Link href={manager ? `/profile/${manager}` : undefined}>
                Manager: {managerTitle ?? "Unknown"}
              </Link>
              <Link
                href={disputeManager ? `/profile/${disputeManager}` : undefined}
              >
                Dispute Manager: {disputeManagerTitle ?? "Unknown"}
              </Link>
              <Link href={creator ? `/profile/${creator}` : undefined}>
                Creator: {creatorTitle ?? "Unknown"}
              </Link>
              <span>
                State: {state !== undefined ? TaskState[state] : "Unknown"}
              </span>
              <Link
                href={
                  escrow && chain
                    ? `${chain.blockExplorers.default.url}/address/${escrow}`
                    : undefined
                }
                target="_blank"
              >
                Escrow: {escrow ?? "Unknown"}
              </Link>
              <Separator />
              {nativeBudget !== BigInt(0) && (
                <Link
                  href={
                    escrow && chain
                      ? `${chain.blockExplorers.default.url}/address/${escrow}`
                      : undefined
                  }
                  target="_blank"
                >
                  Native Budget:{" "}
                  {formatUnits(
                    nativeBudget,
                    chain?.nativeCurrency.decimals ?? 18
                  )}
                </Link>
              )}
              {budget.length !== 0 && (
                <div className="grid grid-cols-1">
                  <span>Budget:</span>
                  <ul>
                    {budget.map((budgetItem, i) => (
                      <li key={i}>
                        <ShowBudgetItem
                          budgetItem={budgetItem}
                          chainId={chainId}
                          escrow={escrow}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="applications">
            <div className="space-y-7">
              <div className="space-y-1">
                {objectKeysInt(applications)
                  .sort((applicationId1, applicationId2) => {
                    // Executor application first
                    if (executorApplication === applicationId1) {
                      return -1
                    }
                    if (executorApplication === applicationId2) {
                      return 1
                    }

                    // Then all accepted applications
                    const application1 = applications[applicationId1]
                    const application2 = applications[applicationId2]
                    if (application1.accepted && !application2.accepted) {
                      return -1
                    }
                    if (!application1.accepted && application2.accepted) {
                      return 1
                    }

                    // Finally in order of application (earliest first aka lowest id first)
                    return applicationId1 - applicationId2
                  })
                  .map((applicationId) => (
                    <ShowApplication
                      key={applicationId}
                      chainId={chainId}
                      taskId={taskId}
                      applicationId={applicationId}
                      application={applications[applicationId]}
                      task={blockchainTask ?? indexerTask}
                      indexerMetadata={
                        indexerTask?.applications[applicationId]?.cachedMetadata
                      }
                      refresh={refresh}
                    />
                  ))}
              </div>
              <Separator />
              {(blockchainTask || indexerTask) && state === TaskState.Open && (
                <div className="space-y-5">
                  <p className="text-2xl">Apply for task:</p>
                  <ApplicationCreationForm
                    chainId={chainId}
                    taskId={taskId}
                    task={(blockchainTask ?? indexerTask) as Task} // Cannot be undefined because of the conditional render
                    refresh={refresh}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="submissions">
            <div className="space-y-7">
              <div className="space-y-1">
                {objectKeysInt(submissions)
                  .sort((submissionId1, submissionId2) => {
                    // First accepted submission
                    const submission1 = submissions[submissionId1]
                    const submission2 = submissions[submissionId2]
                    if (
                      submission1.judgement === SubmissionJudgement.Accepted &&
                      submission2.judgement !== SubmissionJudgement.Accepted
                    ) {
                      return -1
                    }
                    if (
                      submission1.judgement !== SubmissionJudgement.Accepted &&
                      submission2.judgement === SubmissionJudgement.Accepted
                    ) {
                      return 1
                    }

                    // Then all others (oldest first aka highest id first)
                    return submissionId2 - submissionId1
                  })
                  .map((submissionId) => (
                    <ShowSubmission
                      key={submissionId}
                      chainId={chainId}
                      taskId={taskId}
                      submissionId={submissionId}
                      submission={submissions[submissionId]}
                      task={blockchainTask ?? indexerTask}
                      indexerMetadata={
                        indexerTask?.submissions[submissionId]?.cachedMetadata
                      }
                      indexerFeedbackMetadata={
                        indexerTask?.submissions[submissionId]?.cachedFeedback
                      }
                      refresh={refresh}
                    />
                  ))}
              </div>
              <Separator />
              {(blockchainTask || indexerTask) && state === TaskState.Taken && (
                <div className="space-y-5">
                  <p className="text-2xl">Create submission:</p>
                  <SubmissionCreationForm
                    chainId={chainId}
                    taskId={taskId}
                    task={(blockchainTask ?? indexerTask) as Task} // Cannot be undefined because of the conditional render
                    refresh={refresh}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="disputes">
            <div className="space-y-7">
              <div className="space-y-1">
                {disputes.map((dispute, i) => (
                  <ShowDispute
                    key={i}
                    chainId={chainId}
                    dispute={dispute}
                    task={blockchainTask ?? indexerTask}
                  />
                ))}
              </div>
              <Separator />
              {(blockchainTask || indexerTask) && state === TaskState.Taken && (
                <div className="space-y-5">
                  <p className="text-2xl">Create dispute:</p>
                  <DipsuteCreationForm
                    chainId={chainId}
                    taskId={taskId}
                    task={(blockchainTask ?? indexerTask) as Task} // Cannot be undefined because of the conditional render
                    refresh={() => getIndexerDisputes().catch(console.error)}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          {resources && (
            <TabsContent value="resources">
              <SanitizeHTML html={resources} />
            </TabsContent>
          )}
          <TabsContent value="requests">
            <div className="space-y-5">
              <p className="text-2xl">Cancel Task Requests:</p>
              <ul>
                {objectKeysInt(cancelTaskRequests).map((requestId, i) => (
                  <ShowCancelTaskRequest
                    key={i}
                    chainId={chainId}
                    taskId={taskId}
                    requestId={requestId}
                    request={cancelTaskRequests[requestId]}
                    indexerMetadata={
                      indexerTask?.cancelTaskRequests[requestId]?.cachedMetadata
                    }
                    task={blockchainTask ?? indexerTask}
                    refresh={refresh}
                  />
                ))}
              </ul>
            </div>
          </TabsContent>
          <TabsContent value="events">
            <div className="grid grid-cols-1">
              {[...events].reverse().map((eventId, i) => (
                <ShowEvent index={i} key={i} eventIndex={eventId} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="manage">
            {state === TaskState.Open && (
              <Accordion type="single" collapsible>
                <AccordionItem value="item-1">
                  <AccordionTrigger>Edit Metadata</AccordionTrigger>
                  <AccordionContent>
                    <EditMetadata
                      chainId={chainId}
                      taskId={taskId}
                      metadata={directMetadata ?? indexedMetadata ?? {}}
                      refresh={refresh}
                    />
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>Extend Deadline</AccordionTrigger>
                <AccordionContent>
                  <ExtendDeadline
                    chainId={chainId}
                    taskId={taskId}
                    deadline={
                      deadline ??
                      BigInt(Math.round(new Date().getTime() / 1000))
                    }
                    refresh={refresh}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            <Accordion type="single" collapsible>
              <AccordionItem value="item-1">
                <AccordionTrigger>Increase Budget</AccordionTrigger>
                <AccordionContent>
                  <IncreaseBudget
                    chainId={chainId}
                    taskId={taskId}
                    nativeBudget={nativeBudget}
                    budget={budget}
                    refresh={refresh}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            {(state === TaskState.Open || state === TaskState.Taken) && (
              <div className="mt-2">
                <CancelTask
                  chainId={chainId}
                  taskId={taskId}
                  needRequest={
                    state === TaskState.Taken ||
                    (deadline !== undefined &&
                      Math.round(new Date().getTime() / 1000) > deadline)
                  }
                  refresh={refresh}
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function compareTasks(
  blockchainTask: Task,
  indexerTask: IndexedTask,
  baseWarning: string
): void {
  objectKeysInt(blockchainTask.applications).forEach((applicationId) => {
    const applicationWarning = `${baseWarning}: application ${applicationId}`
    const blockchain = blockchainTask.applications[applicationId]
    const indexed = indexerTask.applications[applicationId]
    compareProperty(blockchain, indexed, "accepted", applicationWarning)
    compareProperty(blockchain, indexed, "applicant", applicationWarning)
    compareProperty(blockchain, indexed, "metadata", applicationWarning)
    compareProperty(blockchain, indexed, "nativeReward", applicationWarning)
    compareProperty(blockchain, indexed, "reward", applicationWarning)
  })
  if (
    Object.keys(indexerTask.applications).length >
    Object.keys(blockchainTask.applications).length
  ) {
    console.warn(`${baseWarning}: indexer contains non-existing applications`)
  }

  blockchainTask.budget.forEach((_, budgetId) => {
    const budgetWarning = `${baseWarning}: budget ${budgetId}`
    const blockchain = blockchainTask.budget[budgetId]
    const indexed = indexerTask.budget[budgetId]
    compareProperty(blockchain, indexed, "amount", budgetWarning)
    compareProperty(blockchain, indexed, "tokenContract", budgetWarning)
  })
  if (indexerTask.budget.length > blockchainTask.budget.length) {
    console.warn(`${baseWarning}: indexer contains non-existing budget items`)
  }

  objectKeysInt(blockchainTask.cancelTaskRequests).forEach(
    (cancelTaskRequestId) => {
      const cancelTaskRequestWarning = `${baseWarning}: cancelTaskRequest ${cancelTaskRequestId}`
      const blockchain = blockchainTask.cancelTaskRequests[cancelTaskRequestId]
      const indexed = indexerTask.cancelTaskRequests[cancelTaskRequestId]
      compareProperty(blockchain, indexed, "metadata", cancelTaskRequestWarning)
      compareProperty(blockchain, indexed, "request", cancelTaskRequestWarning)
    }
  )
  if (
    Object.keys(indexerTask.cancelTaskRequests).length >
    Object.keys(blockchainTask.cancelTaskRequests).length
  ) {
    console.warn(
      `${baseWarning}: indexer contains non-existing cancel task requests`
    )
  }

  compareProperty(blockchainTask, indexerTask, "creator", baseWarning)
  compareProperty(blockchainTask, indexerTask, "deadline", baseWarning)
  compareProperty(blockchainTask, indexerTask, "disputeManager", baseWarning)
  compareProperty(blockchainTask, indexerTask, "escrow", baseWarning)
  compareProperty(
    blockchainTask,
    indexerTask,
    "executorApplication",
    baseWarning
  )
  compareProperty(blockchainTask, indexerTask, "manager", baseWarning)
  compareProperty(blockchainTask, indexerTask, "metadata", baseWarning)
  compareProperty(blockchainTask, indexerTask, "nativeBudget", baseWarning)
  compareProperty(blockchainTask, indexerTask, "state", baseWarning)
  compareProperty(blockchainTask, indexerTask, "creator", baseWarning)

  objectKeysInt(blockchainTask.submissions).forEach((submissionId) => {
    const submissionWarning = `${baseWarning}: submission ${submissionId}`
    const blockchain = blockchainTask.submissions[submissionId]
    const indexed = indexerTask.submissions[submissionId]
    compareProperty(blockchain, indexed, "feedback", submissionWarning)
    compareProperty(blockchain, indexed, "judgement", submissionWarning)
    compareProperty(blockchain, indexed, "metadata", submissionWarning)
  })
  if (
    Object.keys(indexerTask.submissions).length >
    Object.keys(blockchainTask.submissions).length
  ) {
    console.warn(`${baseWarning}: indexer contains non-existing submission`)
  }
}

function compareProperty<T>(
  obj1: T,
  obj2: T,
  key: keyof T,
  baseWarning: string
) {
  const value1 = obj1?.[key]
  const value2 = obj2?.[key]
  if (!deepEqual(value1, value2)) {
    console.warn(`${baseWarning}: ${String(key)} (${value1} vs ${value2})`)
  }
}
