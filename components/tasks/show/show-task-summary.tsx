"use client"

import { useEffect, useState } from "react"
import { IndexedTask, Task } from "@/openrd-indexer/types/tasks"

import { chains } from "@/config/wagmi-config"
import { getTask } from "@/lib/indexer"
import { Badge } from "@/components/ui/badge"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/components/ui/link"
import { Skeleton } from "@/components/ui/skeleton"
import { arrayToIndexObject } from "@/lib/array-to-object"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { usePublicClient } from "wagmi"

interface ShowTaskSummaryMetadata {
  title?: string
  tags?: { tag?: string }[]
  index: number
}

export function ShowTaskSummary({
  chainId,
  taskId,
  index,
}: {
  chainId: number
  taskId: bigint,
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
    ? (JSON.parse(indexerTask?.cachedMetadata) as ShowTaskSummaryMetadata)
    : undefined
  const title = indexedMetadata?.title
  const tags = indexedMetadata?.tags ?? []

  return (
    <Card className={`flex justify-between gap-x-[10px] py-[20px] ${index !== 0 && 'rounded-none'} ${index === 0 && 'rounded-b-none'}`}>
      <div>
        <CardHeader>
          <CardTitle>
            {title ?? <Skeleton className="h-6 w-[250px] bg-white" />}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-x-1">
            <Badge variant="outline">
              Chain: {chain?.name ?? chainId.toString()}
            </Badge>
            <div>
              {blockchainTask?.budget[0]?.tokenContract}
            </div>
            <Badge variant="outline">Task ID: {taskId.toString()}</Badge>
            {tags
              .filter((tag) => tag.tag !== undefined)
              .map((tag, i) => (
                <Badge key={i}>{tag.tag}</Badge>
              ))}
          </div>
        </CardContent>
      </div>
      <CardFooter className="my-auto mr-[80px] flex cursor-pointer items-center rounded-md border-[0.5px] border-[#87868645] !py-[5px] pb-0 text-center hover:bg-[#a5a5a511] dark:hover:bg-[#4747472b]">
        <Link className="" href={`/tasks/${chainId}:${taskId}`}>View task</Link>
      </CardFooter>
    </Card>
  )
}
