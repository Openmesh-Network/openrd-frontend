"use client"

import { Suspense, useState } from "react"

import { Link } from "@/components/ui/link"
import { TasksFilter } from "@/components/tasks/filter/tasks-filter"

import { ShowRecentTasks, TaskIdentifier } from "./show-recent-tasks"

export function TaskOverview() {
  const [taskList, setTaskList] = useState<TaskIdentifier[]>([])

  return (
    <div className="grid grid-cols-1 gap-y-3">
      <Link
        href="/tasks/create"
        className="flex w-fit cursor-pointer items-center justify-center rounded-md border-[0.5px] border-[#0354EC] bg-transparent !py-[2px] px-[10px] text-[14px] text-[#0354EC] hover:bg-[#0354EC] hover:text-white md:ml-auto"
      >
        + Add a project
      </Link>
      <Suspense>
        <TasksFilter onFilterApplied={setTaskList} />
      </Suspense>
      <ShowRecentTasks taskList={taskList} />
    </div>
  )
}
