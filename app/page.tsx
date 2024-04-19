import Link from "next/link"
import { TaskState } from "@/openrd-indexer/types/tasks"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { ShowRecentEvents } from "@/components/tasks/show/show-recent-events"
import { TaskCounter } from "@/components/tasks/show/task-counter"
import { TotalBudgetValue } from "@/components/tasks/show/total-budget-value"
import { UniqueInteractors } from "@/components/tasks/show/unique-interactors"

export default function IndexPage() {
  return (
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
  )
}
