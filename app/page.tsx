"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { TaskState } from "@/openrd-indexer/types/tasks"

import { siteConfig } from "@/config/site"
import { filterTasks, getTotalUsdValue, getTotalUsers } from "@/lib/indexer"
import { buttonVariants } from "@/components/ui/button"
import { ReducedSidebar } from "@/components/ui/reducedSidebar/ReducedSidebar"
import { Sidebar } from "@/components/ui/sidebar/Sidebar"
import { FilterProperty } from "@/components/tasks/filter/filter-control"
import { ShowRecentEvents } from "@/components/tasks/show/show-recent-events"
import { TaskCounter } from "@/components/tasks/show/task-counter"
import { TotalBudgetValue } from "@/components/tasks/show/total-budget-value"
import { UniqueInteractors } from "@/components/tasks/show/unique-interactors"

export default function IndexPage() {
  const [isSidebarExpanded, setSidebarExpanded] = useState(false)
  const [budgetValue, setBudgetValue] = useState<number>(0)
  const [uniqueInteractors, setUniqueInteractors] = useState<number>(0)
  const [openTasks, setOpenTasks] = useState<number>(0)
  const [takenTasks, setTakenTasks] = useState<number>(0)
  const [tasksClosed, setClosedTasks] = useState<number>(0)

  useEffect(() => {
    const getBudgetValue = async () => {
      const totalUsd = await getTotalUsdValue()
      setBudgetValue(totalUsd.totalUsdValue)
    }

    const getUniqueInteractos = async () => {
      const users = await getTotalUsers()
      setUniqueInteractors(users.totalUsers)
    }

    const getCounterOpen = async () => {
      const filteredTasks = await filterTasks({
        [FilterProperty.State]: { equal: TaskState.Open },
      })
      setOpenTasks(filteredTasks.length)
    }

    const getCounterTaken = async () => {
      const filteredTasks = await filterTasks({
        [FilterProperty.State]: { equal: TaskState.Taken },
      })
      setTakenTasks(filteredTasks.length)
    }

    const getCounterClosed = async () => {
      const filteredTasks = await filterTasks({
        [FilterProperty.State]: { equal: TaskState.Closed },
      })
      setClosedTasks(filteredTasks.length)
    }

    getCounterClosed().catch(console.error)
    getCounterTaken().catch(console.error)
    getCounterOpen().catch(console.error)
    getUniqueInteractos().catch(console.error)
    getBudgetValue().catch(console.error)
  }, [])

  return (
    <div className="flex">
      <div className="md:hidden">
        <div
          className={`opacity-${
            isSidebarExpanded ? "100 block h-full" : "0 hidden"
          } h-full transition-opacity duration-300`}
        >
          <Sidebar
            onClickBurger={() => setSidebarExpanded(!isSidebarExpanded)}
            budget={budgetValue}
            openProjectsNumber={openTasks}
            activeProjectsNumber={takenTasks}
            completedProjectsNumber={tasksClosed}
            uniqueInteractors={uniqueInteractors}
          />
        </div>
        <div
          className={`opacity-${
            isSidebarExpanded ? "0 hidden" : "100 block"
          } h-full transition-opacity duration-300`}
        >
          <ReducedSidebar
            onClickBurger={() => setSidebarExpanded(!isSidebarExpanded)}
            budget={budgetValue}
            openProjectsNumber={openTasks}
            activeProjectsNumber={takenTasks}
            completedProjectsNumber={tasksClosed}
            uniqueInteractors={uniqueInteractors}
          />
        </div>
      </div>
      <div
        onMouseEnter={() => setSidebarExpanded(true)}
        onMouseLeave={() => setSidebarExpanded(false)}
        className="hidden md:block"
      >
        <div
          className={`opacity-${
            isSidebarExpanded ? "100 block h-full" : "0 hidden"
          } h-full transition-opacity duration-300`}
        >
          <Sidebar
            onClickBurger={() => {}}
            budget={budgetValue}
            openProjectsNumber={openTasks}
            activeProjectsNumber={takenTasks}
            completedProjectsNumber={tasksClosed}
            uniqueInteractors={uniqueInteractors}
          />
        </div>
        <div
          className={`opacity-${
            isSidebarExpanded ? "0 hidden" : "100 block"
          } h-full transition-opacity duration-300`}
        >
          <ReducedSidebar
            onClickBurger={() => {}}
            budget={budgetValue}
            openProjectsNumber={openTasks}
            activeProjectsNumber={takenTasks}
            completedProjectsNumber={tasksClosed}
            uniqueInteractors={uniqueInteractors}
          />
        </div>
      </div>
      <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
        <div className="grid gap-[20px] md:flex md:justify-between">
          <div className="grid gap-6">
            <div className="flex max-w-[980px] flex-col items-start gap-2">
              <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
                {siteConfig.name}
              </h1>
              <p className="max-w-[700px] text-base text-muted-foreground md:text-lg">
                {siteConfig.description}
              </p>
            </div>
            <div className="grid w-full gap-4 md:flex md:w-fit">
              <Link
                href={siteConfig.links.guide}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants()}
              >
                Get started
              </Link>
              <Link
                href={siteConfig.links.docs}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants()}
              >
                Documentation
              </Link>
              <Link
                href={siteConfig.links.forum}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants()}
              >
                Join the community
              </Link>
              <Link
                href={siteConfig.links.github}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants()}
              >
                GitHub
              </Link>
            </div>
          </div>
          <TotalBudgetValue />
        </div>
        <div className="mb-[15px] mt-[25px] gap-y-[15px] gap-x-[45px] lg:flex flex-wrap justify-evenly">
          <div className="w-full md:w-auto flex flex-wrap gap-y-[15px] gap-x-[45px] justify-evenly">
            <UniqueInteractors />
            <TaskCounter state={TaskState.Open} />
            <TaskCounter state={TaskState.Taken} />
            <TaskCounter state={TaskState.Closed} />
          </div>
        </div>
        <ShowRecentEvents />
      </section>
    </div>
  )
}
