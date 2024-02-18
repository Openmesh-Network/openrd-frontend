"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"

import { ShowTaskSummary } from "./show-task-summary"

export interface TaskIndentifier {
  chainId: number
  taskId: bigint
}

export function ShowRecentTasks({ taskList }: { taskList: TaskIndentifier[] }) {
  const [showTaskCount, setShowTaskCount] = useState<number>(10)

  return (
    <div>
      <span className="text-xl">Latest tasks:</span>
      {taskList
        .slice(-showTaskCount)
        .reverse()
        .map((task, i) => (
          <ShowTaskSummary key={i} {...task} />
        ))}
      {showTaskCount < taskList.length && (
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
