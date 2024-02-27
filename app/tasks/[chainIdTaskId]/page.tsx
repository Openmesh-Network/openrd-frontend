import { parseBigInt } from "@/openrd-indexer/utils/parseBigInt"

import { ShowTask } from "@/components/tasks/show/show-task"

export default function TaskPage({
  params,
}: {
  params: { chainIdTaskId?: string }
}) {
  const split = params.chainIdTaskId?.split("%3A", 2) // %3A = :
  if (!split || split.length < 2) {
    return <span>Incorrect chain+task identifier!</span>
  }

  const chainId = parseInt(split[0])
  const taskId = parseBigInt(split[1])
  if (Number.isNaN(chainId) || taskId === undefined) {
    return <span>ChainId or TaskId is not a number.</span>
  }

  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <ShowTask chainId={chainId} taskId={taskId} />
    </section>
  )
}
