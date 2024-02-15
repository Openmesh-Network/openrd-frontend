"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { useChainId, usePublicClient } from "wagmi"

import { Button } from "@/components/ui/button"

import { ShowTaskSummary } from "./show-task-summary"

export interface TaskIndentifier {
  chainId: number
  taskId: bigint
}

export function ShowRecentTasks({
  taskList,
}: {
  taskList?: TaskIndentifier[]
}) {
  const chainId = useChainId()
  const publicClient = usePublicClient()
  const [taskCount, setTaskCount] = useState<number>(0)
  const [showTaskCount, setShowTaskCount] = useState<number>(10)

  useEffect(() => {
    const getTaskCount = async () => {
      if (!publicClient) {
        return
      }

      const totalTasks = await publicClient.readContract({
        abi: TasksContract.abi,
        address: TasksContract.address,
        functionName: "taskCount",
      })
      setTaskCount(Number(totalTasks))
    }

    getTaskCount().catch(console.error)
  }, [publicClient])

  const tasks =
    taskList ??
    Array.from({ length: taskCount }, (value, index) => index).map((taskId) => {
      return { chainId: chainId, taskId: BigInt(taskId) }
    })

  return (
    <div>
      <span className="text-xl">Latest tasks:</span>
      {tasks
        .slice(-showTaskCount)
        .reverse()
        .map((task, i) => (
          <ShowTaskSummary key={i} {...task} />
        ))}
      {showTaskCount < (taskList?.length ?? taskCount) && (
        <Button
          onClick={() => {
            setShowTaskCount(showTaskCount + 10)
          }}
        >
          Show more
        </Button>
      )}
    </div>
  )
}
