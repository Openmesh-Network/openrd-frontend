"use client"

import { useEffect, useState } from "react"
import { TaskState } from "@/openrd-indexer/types/tasks"

import { filterTasks } from "@/lib/indexer"
import { FilterProperty } from "@/components/tasks/filter/filter-control"

export function TaskCounter({ state }: { state: TaskState }) {
  const [counter, setCounter] = useState<number | undefined>(undefined)

  useEffect(() => {
    const getCounter = async () => {
      const filteredTasks = await filterTasks({
        [FilterProperty.State]: { equal: state },
      })
      setCounter(filteredTasks.length)
    }

    getCounter().catch(console.error)
  }, [state])

  return (
    <div>
      {counter !== undefined ? (
        <h2>
          {counter} {stateToString(state)} tasks
        </h2>
      ) : (
        <h2>Loading...</h2>
      )}
    </div>
  )
}

function stateToString(state: TaskState): string {
  switch (state) {
    case TaskState.Open:
      return "open"
    case TaskState.Taken:
      return "ongoing"
    case TaskState.Closed:
      return "finished"
  }
}
