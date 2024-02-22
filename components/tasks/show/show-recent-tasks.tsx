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
      <div className="mb-[10px] mt-[5px] text-xl">Latest tasks:</div>
      {taskList.slice(0, showTaskCount).map((task, i) => (
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
