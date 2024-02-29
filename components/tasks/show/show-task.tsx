/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState, useRef } from "react"
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
import { statusToColor, statusToString, timestampToDate, timestampToDateFormatted } from '../../../lib/general-functions';

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
  const [activeTab, setActiveTab] = useState('description');

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

  const applyRef = useRef<HTMLDivElement>(null);

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
      <div className="flex justify-between gap-x-[20px]">
        <div>          
          <div className="flex max-w-[980px] flex-col items-start gap-2">
            <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-2xl">
              {title}
            </h1>
          </div>
          <div className="mb-[20px] grid grid-cols-1 gap-4">
            <div className="mb-[10px] mt-[30px] space-x-1">
              <Badge variant="outline">
                Chain: {chain?.name ?? chainId.toString()}
              </Badge>
              <Badge variant="outline">Task ID: {taskId.toString()}</Badge>
            </div>
            {
              tags?.length > 0 && (
                <div className="mb-[5px] flex text-[11px] font-semibold text-grey dark:text-light md:text-[14px]">
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
            <div className="mb-[5px] flex text-[12px] font-medium text-grey dark:text-light lg:text-[16px]">
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
            <div className="mb-[5px] flex text-[12px] font-medium text-grey dark:text-light lg:text-[16px]">
              <div className="mr-[50px] flex">
                <svg
                  className="mr-[10px] size-[22px]"
                  fill="currentColor"
                  viewBox="0 0 25 18"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7.5 9C9.91797 9 11.875 7.04297 11.875 4.625C11.875 2.20703 9.91797 0.25 7.5 0.25C5.08203 0.25 3.125 2.20703 3.125 4.625C3.125 7.04297 5.08203 9 7.5 9ZM10.5 10.25H10.1758C9.36328 10.6406 8.46094 10.875 7.5 10.875C6.53906 10.875 5.64062 10.6406 4.82422 10.25H4.5C2.01562 10.25 0 12.2656 0 14.75V15.875C0 16.9102 0.839844 17.75 1.875 17.75H13.125C14.1602 17.75 15 16.9102 15 15.875V14.75C15 12.2656 12.9844 10.25 10.5 10.25ZM18.75 9C20.8203 9 22.5 7.32031 22.5 5.25C22.5 3.17969 20.8203 1.5 18.75 1.5C16.6797 1.5 15 3.17969 15 5.25C15 7.32031 16.6797 9 18.75 9ZM20.625 10.25H20.4766C19.9336 10.4375 19.3594 10.5625 18.75 10.5625C18.1406 10.5625 17.5664 10.4375 17.0234 10.25H16.875C16.0781 10.25 15.3438 10.4805 14.6992 10.8516C15.6523 11.8789 16.25 13.2422 16.25 14.75V16.25C16.25 16.3359 16.2305 16.418 16.2266 16.5H23.125C24.1602 16.5 25 15.6602 25 14.625C25 12.207 23.043 10.25 20.625 10.25Z"/>
                </svg>
                <p className="mr-[3px] flex items-center">
                  Contributors needed:
                </p>{' '}
                <span className="flex items-center text-[12px] font-bold text-[#000] dark:text-[#fff] lg:text-[16px]">
                  {teamSize}
                </span>
              </div>
              <div className="mr-[50px] mt-[25px] flex lg:mt-0">
                <svg
                  className="mr-[10px] size-[22px]"
                  fill="currentColor"
                  viewBox="0 0 22 22"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M11 0C4.92339 0 0 4.92339 0 11C0 17.0766 4.92339 22 11 22C17.0766 22 22 17.0766 22 11C22 4.92339 17.0766 0 11 0ZM13.5327 15.5286L9.62056 12.6855C9.48306 12.5835 9.40323 12.4238 9.40323 12.2552V4.79032C9.40323 4.49758 9.64274 4.25806 9.93548 4.25806H12.0645C12.3573 4.25806 12.5968 4.49758 12.5968 4.79032V10.898L15.4133 12.9472C15.6528 13.1202 15.7016 13.4528 15.5286 13.6923L14.2778 15.4133C14.1048 15.6484 13.7722 15.7016 13.5327 15.5286Z"/>
                </svg>
                <p className="mr-[3px] flex items-center">
                  Project length:
                </p>{' '}
                <span className="flex items-center text-[12px] font-bold text-[#000] dark:text-[#fff]  lg:text-[16px]">
                  {projectSize} hour(s)
                </span>
              </div>
              <div className="mr-[10px] mt-[25px] flex text-black dark:text-light lg:mt-0">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/Openmesh-Network"
                  className="mr-[18px]  cursor-pointer hover:text-primary"
                >
                  <svg
                    className="size-[22px]"
                    fill="currentColor"
                    viewBox="0 0 23 22"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7.54703 17.7144C7.54703 17.8053 7.4424 17.8781 7.31047 17.8781C7.16035 17.8918 7.05572 17.819 7.05572 17.7144C7.05572 17.6234 7.16035 17.5506 7.29228 17.5506C7.42875 17.537 7.54703 17.6097 7.54703 17.7144ZM6.13225 17.5097C6.1004 17.6006 6.19139 17.7053 6.32786 17.7326C6.44614 17.7781 6.58261 17.7326 6.60991 17.6416C6.6372 17.5506 6.55077 17.446 6.41429 17.405C6.29602 17.3732 6.16409 17.4187 6.13225 17.5097ZM8.14297 17.4323C8.01104 17.4642 7.92006 17.5506 7.93371 17.6552C7.94735 17.7462 8.06563 17.8054 8.20211 17.7735C8.33403 17.7417 8.42501 17.6552 8.41137 17.5642C8.39772 17.4778 8.27489 17.4187 8.14297 17.4323ZM11.1363 0C4.82664 0 0 4.79025 0 11.0999C0 16.1449 3.1753 20.4621 7.7108 21.9815C8.29309 22.0861 8.4978 21.7267 8.4978 21.431C8.4978 21.149 8.48415 19.5932 8.48415 18.6378C8.48415 18.6378 5.29975 19.3202 4.63103 17.2822C4.63103 17.2822 4.11243 15.9584 3.36637 15.6172C3.36637 15.6172 2.32461 14.903 3.43915 14.9166C3.43915 14.9166 4.57189 15.0076 5.19512 16.0903C6.19139 17.8463 7.86092 17.3413 8.51145 17.0411C8.61608 16.3132 8.91177 15.8083 9.23931 15.508C6.69634 15.226 4.13062 14.8575 4.13062 10.4812C4.13062 9.23021 4.47636 8.60243 5.20422 7.80178C5.08594 7.50609 4.69927 6.28692 5.3225 4.71291C6.27327 4.41722 8.46141 5.94118 8.46141 5.94118C9.37124 5.68643 10.3493 5.55451 11.3183 5.55451C12.2872 5.55451 13.2653 5.68643 14.1751 5.94118C14.1751 5.94118 16.3633 4.41267 17.314 4.71291C17.9373 6.29147 17.5506 7.50609 17.4323 7.80178C18.1602 8.60698 18.606 9.23476 18.606 10.4812C18.606 14.8712 15.9266 15.2214 13.3836 15.508C13.8021 15.8674 14.1569 16.5498 14.1569 17.6188C14.1569 19.1519 14.1433 21.0489 14.1433 21.4219C14.1433 21.7176 14.3526 22.077 14.9303 21.9724C19.4794 20.4621 22.5638 16.1449 22.5638 11.0999C22.5638 4.79025 17.446 0 11.1363 0ZM4.42177 15.69C4.36263 15.7355 4.37628 15.8401 4.45361 15.9266C4.5264 15.9993 4.63103 16.0312 4.69017 15.972C4.74931 15.9266 4.73566 15.8219 4.65832 15.7355C4.58554 15.6627 4.48091 15.6309 4.42177 15.69ZM3.93046 15.3215C3.89862 15.3807 3.94411 15.4534 4.03509 15.4989C4.10788 15.5444 4.19886 15.5308 4.2307 15.4671C4.26255 15.408 4.21706 15.3352 4.12607 15.2897C4.03509 15.2624 3.9623 15.276 3.93046 15.3215ZM5.40438 16.941C5.3316 17.0002 5.35889 17.1366 5.46352 17.2231C5.56815 17.3277 5.70008 17.3413 5.75922 17.2686C5.81836 17.2094 5.79106 17.0729 5.70008 16.9865C5.6 16.8819 5.46352 16.8682 5.40438 16.941ZM4.88578 16.2723C4.81299 16.3178 4.81299 16.4361 4.88578 16.5407C4.95857 16.6453 5.08139 16.6908 5.14053 16.6453C5.21332 16.5862 5.21332 16.4679 5.14053 16.3633C5.07685 16.2586 4.95857 16.2132 4.88578 16.2723Z"/>
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full text-grey dark:text-light lg:w-[163px]">
          <div className="mt-[25px] text-[12px] font-bold lg:mt-0 lg:text-[16px]">
            <div className="flex !leading-[150%]">Status :</div>
            <div className={`${statusToColor(String(state))} mt-[6px] flex items-center gap-x-[3px]`}>
                <svg
                  className="size-[20px]"
                  fill="currentColor"
                  viewBox="0 0 22 22"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle cx="10" cy="10" r="10" fill={statusToColor(String(state))}/>
                </svg>
                <p className="text-[12px] font-medium text-[#000] dark:text-[#fff] lg:text-[16px]">
                  {statusToString(String(state))}
                </p>
            </div>
          </div>
          <div className="mt-[25px] flex text-[12px] font-bold !leading-[150%] text-grey dark:text-light lg:block lg:text-[16px]">
            <p className="mr-[10px] lg:mr-0"> Deadline: </p>
            <p className="font-medium text-[#000] dark:text-[#fff]">
              {timestampToDateFormatted(String(deadline))}
            </p>
          </div>
          {state === TaskState.Open && (
            <div className="mt-[25px] ">
              <a
                 onClick={() => {
                  setActiveTab('applications')
                  setTimeout(() => {
                    if (applyRef.current) {
                      applyRef.current.scrollIntoView({
                        behavior: 'smooth',
                      });
                    }
                  }, 100);
                 }}
                className="flex h-[43px] w-[163px] cursor-pointer items-center justify-center rounded-[10px] bg-[#12AD50] text-[12px] font-bold text-white hover:bg-[#0b9040] lg:text-[16px] "
              >
                {'Apply now'}
              </a>
            </div>
          )}
          {/* {task.status === 'open' && (
            <div className="mt-[25px] ">
              <a
                href={`${
                  process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                    ? `/openrd/application/${task.id}`
                    : `/application/${task.id}`
                }`}
                className="flex h-[43px] w-[163px] cursor-pointer items-center justify-center rounded-[10px] bg-[#12AD50] text-[12px] font-bold text-white hover:bg-[#0b9040] lg:text-[16px] "
              >
                {'Apply now'}
              </a>
            </div>
          )}
          {task.status === 'active' &&
            contributorsAllowed &&
            address &&
            contributorsAllowed.includes(address) && (
              <div className="mt-[25px] ">
                <a
                  href={`${
                    process.env.NEXT_PUBLIC_ENVIRONMENT === 'PROD'
                      ? `/openrd/new-submission/${task.id}`
                      : `/new-submission/${task.id}`
                  }`}
                  className="flex h-[43px] w-[163px] cursor-pointer items-center justify-center rounded-[10px] bg-[#0354EC] text-[12px] font-bold text-white hover:bg-[#5080da] lg:text-[16px] "
                >
                  {'Create submission'}
                </a>
              </div>
            )} */}
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Tabs defaultValue="description" value={activeTab} onValueChange={setActiveTab}>
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
                <div className="space-y-5 pb-[20px]">
                  <p ref={applyRef} className="text-2xl">Apply for task:</p>
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
