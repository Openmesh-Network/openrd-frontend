/* eslint-disable tailwindcss/no-unnecessary-arbitrary-value */
"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { IndexedTask, Task } from "@/openrd-indexer/types/tasks"
import { usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { arrayToIndexObject } from "@/lib/array-to-object"
import { getTask } from "@/lib/indexer"
import { useMetadata } from "@/hooks/useMetadata"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Link } from "@/components/ui/link"
import { Skeleton } from "@/components/ui/skeleton"
import { SanitizeHTML } from "@/components/sanitize-html"

import { ShowTaskMetadata } from "./show-task"
import { daysUntil, timestampToDateFormatted } from "@/lib/general-functions"

export function ShowTaskSummary({
  chainId,
  taskId,
  index,
}: {
  chainId: number
  taskId: bigint
  index: number
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
      className={`flex w-full justify-between gap-x-[10px] border-x-0 border-b-2 border-t-0 py-[20px] !shadow-none ${index !== 0 && "rounded-none"} ${index === 0 && "rounded-b-none"}`}
    >
      <div className="w-full flex px-[25px]">
        <div className="w-[50%]">
          <CardHeader className="!pb-0">
            <Link className="" href={`/tasks/${chainId}:${taskId}`}>
              <div className="cursor-pointer text-lg font-bold">
                {title ?? <Skeleton className="h-6 w-[250px] bg-white" />}
              </div>
            </Link>
            <div className="max-h-[100px] overflow-hidden">
              <SanitizeHTML html={description} />
            </div>
          </CardHeader>
          <CardContent className="">
            <div className="space-x-1">
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
        <div className="w-[22%] pt-8">
         ${usdValue}
        </div>
        <div className="w-[10%] pt-8">
         {daysUntil(String(deadline))}
        </div>
      </div>
      <a className="my-auto" href={`/tasks/${chainId}:${taskId}`}>
        <CardFooter className="my-auto mr-4 w-fit cursor-pointer whitespace-nowrap rounded-md border-[0.5px] border-[#0354EC] bg-transparent !py-[2px] px-[10px] text-center text-[15px] text-[#0354EC] hover:bg-[#0354EC] hover:text-white">
          View task
        </CardFooter>
      </a>
    </Card>
  )
}
