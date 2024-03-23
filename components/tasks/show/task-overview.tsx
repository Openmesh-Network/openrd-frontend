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
      <Link href="/tasks/create" className="flex w-fit cursor-pointer items-center justify-center rounded-md border-[0.5px] border-[#0354EC] bg-[#fff] !py-[2px] px-[10px] text-[14px] text-[#0354EC] hover:bg-[#0354EC] hover:text-[#fff] md:ml-auto">
        + Add a project
      </Link>
      <TasksFilter onFilterApplied={setTaskList} />
      <ShowRecentTasks taskList={taskList} />
    </div>
  )
}
