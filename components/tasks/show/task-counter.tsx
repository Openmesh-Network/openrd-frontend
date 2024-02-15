"use client"

import { useState } from "react"
import { TaskState } from "@/openrd-indexer/types/tasks"

export function TaskCounter({ type }: { type: TaskState }) {
  const [counter, setCounter] = useState<number | undefined>(undefined)

  // Get respective counter value from API

  // Make it a button to open tasks with the corresponding type filter

  return (
    <div>
      {counter ? (
        <h2>
          {counter} {typeToString(type)} tasks
        </h2>
      ) : (
        <h2>Loading...</h2>
      )}
    </div>
  )
}

function typeToString(type: TaskState): string {
  switch (type) {
    case TaskState.Open:
      return "open"
    case TaskState.Taken:
      return "ongoing"
    case TaskState.Closed:
      return "finished"
  }
}
