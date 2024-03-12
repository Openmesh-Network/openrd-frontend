"use client"

import { useState } from "react"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/components/ui/link"
import { TasksFilter } from "@/components/tasks/filter/tasks-filter"

import { ShowRecentTasks, TaskIndentifier } from "./show-recent-tasks"

export function TaskOverview() {
  const [taskList, setTaskList] = useState<TaskIndentifier[]>([])

  return (
    <div className="grid grid-cols-1 gap-y-3">
      <Link href="/tasks/create" className="flex h-[25px] w-[90px] cursor-pointer items-center justify-center rounded-[10px] border-[0.7px] border-[#0354EC] bg-[#fff] text-[#0354EC] hover:bg-[#0354EC] hover:text-[#fff] md:ml-auto lg:h-[40px] lg:w-[150px]">
        + Add a project
      </Link>
      <TasksFilter onFilterApplied={setTaskList} />
      <ShowRecentTasks taskList={taskList} />
    </div>
  )
}
