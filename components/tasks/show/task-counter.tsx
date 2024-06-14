"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
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
        <div className="text-center">
          <div className="mx-auto mb-[5px] flex size-[42px] items-center justify-center rounded-full border border-[#E2E8F0] p-[4px] text-xl text-black dark:border-[#1D283A] dark:text-white">
            {counter}
          </div>
          <div className="flex gap-x-[5px]">
            <Image
              alt="task counter image"
              className={stateToImg(state)?.className}
              src={stateToImg(state)?.src}
            />
            <Image
              alt="task counter image"
              className={stateToImgDark(state)?.className}
              src={stateToImgDark(state)?.src}
            />
            <h2>{stateToString(state)} tasks</h2>
          </div>
        </div>
      ) : (
        <h2>Loading...</h2>
      )}
    </div>
  )
}

function stateToString(state: TaskState): string {
  switch (state) {
    case TaskState.Open:
      return "Open"
    case TaskState.Taken:
      return "Ongoing"
    case TaskState.Closed:
      return "Finished"
  }
}

function stateToImg(state: TaskState) {
  switch (state) {
    case TaskState.Open:
      return {
        src: `/images/utils/open.svg`,
        className: "w-[17px] dark:hidden",
      }
    case TaskState.Taken:
      return {
        src: `/images/utils/pencil.svg`,
        className: "w-[15px] dark:hidden",
      }
    case TaskState.Closed:
      return {
        src: `/images/utils/check.svg`,
        className: "w-[18px] dark:hidden",
      }
  }
}

function stateToImgDark(state: TaskState) {
  switch (state) {
    case TaskState.Open:
      return {
        src: `/images/utils/open-white.svg`,
        className: "w-[17px] dark:flex hidden",
      }
    case TaskState.Taken:
      return {
        src: `/images/utils/pencil-white.svg`,
        className: "w-[15px] dark:flex hidden",
      }
    case TaskState.Closed:
      return {
        src: `/images/utils/check-white.svg`,
        className: "w-[18px] dark:flex hidden",
      }
  }
}
