import { TaskOverview } from "@/components/tasks/show/task-overview"

export default function TasksPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-xl font-extrabold leading-tight tracking-tighter md:text-2xl">
          Tasks
        </h1>
      </div>
      <TaskOverview />
    </section>
  )
}
