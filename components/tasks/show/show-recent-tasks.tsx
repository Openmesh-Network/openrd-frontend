/* eslint-disable tailwindcss/no-unnecessary-arbitrary-value */
"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"

import { ShowTaskSummary } from "./show-task-summary"
import { zodResolver } from "@hookform/resolvers/zod"
import { useFieldArray, useForm } from "react-hook-form"
import { z } from "zod"
import { defaultFilter, formSchema } from "../filter/tasks-filter"

export interface TaskIndentifier {
  chainId: number
  taskId: bigint
}
interface TaskWithDeadline extends TaskIndentifier {
  deadline: number;
}

export function ShowRecentTasks({ taskList }: { taskList: TaskIndentifier[] }) {
  const [showTaskCount, setShowTaskCount] = useState<number>(10)
  const [metadataTasks, setMetadataTasks] = useState<TaskWithDeadline[]>([]);
  const [orderedTasksFinal, setOrderedTasksFinal] = useState<TaskIndentifier[]>(taskList);
  const [orderTasksByDeadlineAsc, setOrderTasksByDeadlineAsc] = useState<boolean>(false);

  const handleTaskInfo = (taskInfo: TaskWithDeadline) => {
    setMetadataTasks((currentTasks) => {
      const index = currentTasks.findIndex(t => t.taskId === taskInfo.taskId);
      if (index >= 0) {
        currentTasks[index] = taskInfo;
      } else {
        currentTasks.push(taskInfo);
      }
      return [...currentTasks];
    });
  };


  function handleOrderTaskByDeadline() {
    const sortedTasks = [...metadataTasks].sort((a, b) => {
      return orderTasksByDeadlineAsc ? a.deadline - b.deadline : b.deadline - a.deadline;
    });
    
    setOrderedTasksFinal(sortedTasks)
    setOrderTasksByDeadlineAsc(!orderTasksByDeadlineAsc);
  }

  useEffect(() => {
    setOrderedTasksFinal(taskList);
  }, [taskList]);


  return (
    <div>
      <div className="flex  overflow-x-auto rounded-[10px] border-[0.7px] bg-transparent px-[25px] py-[10px] text-[16px] font-medium">
        <div className="w-[45%]">
          <p
            onClick={() => {
            }}
            className=""
          >
            Project
          </p>
        </div>
        <div className="flex w-[20%] items-center">
          <p className="pr-[10px]">Budget</p>
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
            onClick={handleOrderTaskByDeadline}
            height="7"
            className={`w-[10px] cursor-pointer lg:w-[14px] ${orderTasksByDeadlineAsc && 'rotate-180'}`}
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
      {orderedTasksFinal.slice(0, showTaskCount).map((task, i) => (
        <ShowTaskSummary key={`${task.taskId}-${i}`} {...task} index={i} onTaskInfo={(value) => {
          console.log(value)
          handleTaskInfo(value)
        }} />
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
