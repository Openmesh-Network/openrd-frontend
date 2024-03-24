/* eslint-disable tailwindcss/no-unnecessary-arbitrary-value */
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
      <div className="flex  overflow-x-auto rounded-[10px] border-[0.7px] bg-transparent px-[25px] py-[10px] text-[16px] font-medium">
        <div className="w-[45%]">
          <p
            onClick={() => {
              // console.log('as tasks')
              // console.log(finalTasks)
              // console.log('filtered tasks')
              // console.log(filteredTasks)
            }}
            className=""
          >
            Project
          </p>
        </div>
        <div className="flex w-[20%] items-center">
          <p className="pr-[10px]">Budget</p>
            {/* <img
              src="/images/task/vectorDown.svg"
              alt="image"
              className={`w-[14px]`}
            /> */}
          <svg
            width="11"
            className={`w-[10px] cursor-pointer lg:w-[14px]`}
            height="7"
            viewBox="0 0 11 7"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="0.336336"
              y1="1.08462"
              x2="5.33634"
              y2="5.63007"
              stroke="black"
            />
            <line
              x1="10.3536"
              y1="1.35355"
              x2="5.35355"
              y2="6.35355"
              stroke="black"
            />
          </svg>
        </div>
        <div className="flex w-[20%] items-center">
          <p className="pr-[10px]">Ends</p>
          <svg
            width="11"
            height="7"
            className={`w-[10px] cursor-pointer lg:w-[14px]`}
            viewBox="0 0 11 7"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <line
              x1="0.336336"
              y1="1.08462"
              x2="5.33634"
              y2="5.63007"
              stroke="black"
            />
            <line
              x1="10.3536"
              y1="1.35355"
              x2="5.35355"
              y2="6.35355"
              stroke="black"
            />
          </svg>
        </div>
      </div>
      {taskList.slice(0, showTaskCount).map((task, i) => (
        <ShowTaskSummary key={i} {...task} index={i} />
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
