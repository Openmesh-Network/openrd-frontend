/* eslint-disable tailwindcss/no-unnecessary-arbitrary-value */
"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { IndexedTask, Task } from "@/openrd-indexer/types/tasks"
import { usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { arrayToIndexObject } from "@/lib/array-to-object"
import { daysUntil, timestampToDateFormatted } from "@/lib/general-functions"
import { getTask } from "@/lib/indexer"
import { useMetadata } from "@/hooks/useMetadata"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Link } from "@/components/ui/link"
import { Skeleton } from "@/components/ui/skeleton"
import { SanitizeHTML } from "@/components/sanitize-html"

import { ShowTaskMetadata } from "./show-task"

export function ShowTaskSummary({
  chainId,
  taskId,
  index,
  onTaskInfo,
}: {
  chainId: number
  taskId: bigint
  index: number
  onTaskInfo?: (taskInfo: any) => void
}) {
  const chain = chains.find((c) => c.id === chainId)
  const publicClient = usePublicClient({ chainId: chainId })

  const [indexerTask, setIndexerTask] = useState<IndexedTask | undefined>(
    undefined
  )

  const [blockchainTask, setBlockchainTask] = useState<Task | undefined>(
    undefined
  )
  const directMetadata = useMetadata<ShowTaskMetadata | undefined>({
    url: blockchainTask?.metadata,
    defaultValue: undefined,
    emptyValue: {},
  })

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

  useEffect(() => {
    const getIndexerTask = async () => {
      const task = await getTask(chainId, taskId)
      setIndexerTask(task)
    }

    getIndexerTask().catch((err) => {
      console.error(err)
      setIndexerTask(undefined)
    })
  }, [chainId, taskId])

  useEffect(() => {
    if (blockchainTask && onTaskInfo) {
      onTaskInfo({
        chainId,
        taskId,
        deadline: Number(blockchainTask.deadline),
        budget: indexerTask?.usdValue ?? 0,
      })
    }
  }, [blockchainTask, chainId, taskId])

  const indexedMetadata = indexerTask?.cachedMetadata
    ? (JSON.parse(indexerTask?.cachedMetadata) as ShowTaskMetadata)
    : undefined
  const title = indexedMetadata?.title
  const tags = indexedMetadata?.tags ?? []
  const usdValue = indexerTask?.usdValue ?? 0
  const description =
    directMetadata?.description ??
    indexedMetadata?.description ??
    "No description was provided."
  const deadline = blockchainTask?.deadline ?? indexerTask?.deadline

  return (
    <Card
      className={`w-full justify-between gap-x-[10px] border-x-0 border-b-2 border-t-0 py-[20px] !shadow-none md:flex ${index !== 0 && "rounded-none"} ${index === 0 && "rounded-b-none"}`}
    >
      <div className="w-full px-2 md:flex md:px-[25px]">
        <div className="!px-0 md:w-[60%] lg:w-[55%] xl:w-[50%]">
          <CardHeader className="!px-0 !pb-0">
            <Link className="" href={`/tasks/${chainId}:${taskId}`}>
              <div className="cursor-pointer text-lg font-bold">
                {title ?? <Skeleton className="bg-white md:h-6 md:w-[250px]" />}
              </div>
            </Link>
            <div className="overflow-hidden md:max-h-[100px]">
              <SanitizeHTML html={description} />
            </div>
          </CardHeader>
          <CardContent className="!px-0">
            <div className="space-x-1 space-y-2">
              <Badge variant="outline">
                Chain: {chain?.name ?? chainId.toString()}
              </Badge>
              <Badge variant="outline">Task ID: {taskId.toString()}</Badge>
              {tags
                .filter((tag) => tag.tag !== undefined)
                .map((tag, i) => (
                  <Badge key={i}>{tag.tag}</Badge>
                ))}
            </div>
          </CardContent>
        </div>
        <div className="text- text-sm md:w-[22%] md:pt-8 md:text-base">
          <span className="md:hidden">Budget: </span>${usdValue}
        </div>
        <div className="text-sm md:w-[16%] md:pt-8 md:text-base lg:w-[13%] xl:w-[10%]">
          <span className="md:hidden">Deadline: </span>
          {daysUntil(String(deadline))}
        </div>
      </div>
      <CardFooter>
        <Link
          className="mx-7 my-auto !mt-4 cursor-pointer justify-center whitespace-nowrap rounded-md border-[0.5px] border-[#0354EC] bg-transparent !py-[2px] px-[10px] text-[15px] text-[#0354EC] hover:bg-[#0354EC]  hover:text-white md:mx-0 md:!mt-0 md:mr-4 md:w-fit"
          href={`/tasks/${chainId}:${taskId}`}
        >
          View task
        </Link>
      </CardFooter>
    </Card>
  )
}
