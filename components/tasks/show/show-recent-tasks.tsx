"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { ShowTaskSummary } from "./show-task-summary"

export interface TaskIdentifier {
  chainId: number
  taskId: bigint
}

export function ShowRecentTasks({ taskList }: { taskList: TaskIdentifier[] }) {
  const [showTaskCount, setShowTaskCount] = useState<number>(10)

  return (
    <div>
      <div className="flex overflow-x-auto rounded-[10px] border-[0.7px] bg-transparent text-[16px] font-medium">
        <div className="w-1/2 px-[25px] py-[10px]">
          <span>Project</span>
        </div>
        <div className="invisible w-1/5 items-center px-[25px] py-[10px] text-center md:visible">
          <span>Budget</span>
        </div>
        <div className="invisible w-1/5 items-center px-[25px] py-[10px] text-center md:visible">
          <span>Ends</span>
        </div>
        <div className="invisible w-[10%] items-center px-[25px] py-[10px] text-center md:visible">
          {/* Empty space */}
        </div>
      </div>
      {taskList.slice(0, showTaskCount).map((task, i) => (
        <div>
          <ShowTaskSummary key={i} {...task} />
          <Separator />
        </div>
      ))}
      {showTaskCount < taskList.length && (
        <Button
          className="w-full bg-primary/5 text-primary hover:bg-primary/10"
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
