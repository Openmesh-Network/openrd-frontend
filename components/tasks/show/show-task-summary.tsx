"use client"

import { useEffect, useState } from "react"
import { IndexedTask } from "@/openrd-indexer/types/tasks"

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

interface ShowTaskSummaryMetadata {
  title?: string
  tags?: { tag?: string }[]
}

export function ShowTaskSummary({
  chainId,
  taskId,
}: {
  chainId: number
  taskId: bigint
}) {
  const chain = chains.find((c) => c.id === chainId)
  const [indexerTask, setIndexerTask] = useState<IndexedTask | undefined>(
    undefined
  )

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
    <Card className={`flex justify-between gap-x-[10px]`}>
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
            <Badge variant="outline">Task ID: {taskId.toString()}</Badge>
            {tags
              .filter((tag) => tag.tag !== undefined)
              .map((tag, i) => (
                <Badge key={i}>{tag.tag}</Badge>
              ))}
          </div>
        </CardContent>
      </div>
      <CardFooter className="my-auto mr-[80px] flex cursor-pointer items-center rounded-md border-[0.5px] border-[#87868645] !py-[5px] pb-0 text-center hover:bg-[#4747472b]">
        <Link className="" href={`/tasks/${chainId}:${taskId}`}>View task</Link>
      </CardFooter>
    </Card>
  )
}
