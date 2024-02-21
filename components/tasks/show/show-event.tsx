"use client"

import { useEffect, useState } from "react"
import { TaskEvent } from "@/openrd-indexer/types/task-events"
import { Block, Transaction } from "viem"
import { usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { getEvent } from "@/lib/indexer"
import { useAddressTitle } from "@/hooks/useAddressTitle"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/components/ui/link"
import { Skeleton } from "@/components/ui/skeleton"

interface UserInfo {
  title?: string
}

export function ShowEvent({
  eventIndex,
  hideDescription,
  viewTask,
}: {
  eventIndex: number
  hideDescription?: boolean
  viewTask?: boolean
}) {
  const [event, setEvent] = useState<TaskEvent | undefined>(undefined)
  const [transaction, setTransaction] = useState<Transaction | undefined>(
    undefined
  )
  const [block, setBlock] = useState<Block | undefined>(undefined)

  const chain = event ? chains.find((c) => c.id === event.chainId) : undefined
  const publicClient = usePublicClient({ chainId: event?.chainId })

  useEffect(() => {
    const getEventInfo = async () => {
      const eventInfo = await getEvent(eventIndex)
      setEvent(eventInfo)
    }

    getEventInfo().catch(console.error)
  }, [eventIndex])

  useEffect(() => {
    const getTransactionInfo = async () => {
      if (!event?.transactionHash || !publicClient) {
        setTransaction(undefined)
        return
      }

      const transactionInfo = await publicClient.getTransaction({
        hash: event.transactionHash as `0x${string}`,
      })
      setTransaction(transactionInfo)
    }

    getTransactionInfo().catch(console.error)
  }, [event?.transactionHash, publicClient])

  useEffect(() => {
    const getBlockInfo = async () => {
      if (!event?.blockNumber || !publicClient) {
        setBlock(undefined)
        return
      }

      const blockInfo = await publicClient.getBlock({
        blockNumber: event.blockNumber,
      })
      setBlock(blockInfo)
    }

    getBlockInfo().catch(console.error)
  }, [event?.blockNumber, publicClient])

  const title = event?.type
  const sender = useAddressTitle(transaction?.from)
  const timestamp = block ? new Date(Number(block.timestamp) * 1000) : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {title ?? <Skeleton className="h-6 w-[250px] bg-white" />}
        </CardTitle>
        <CardDescription>
          {!hideDescription && sender && timestamp
            ? `By ${sender} at ${timestamp.toTimeString()} ${timestamp.toDateString()}`
            : ""}
        </CardDescription>
      </CardHeader>
      <CardFooter className="space-x-5">
        {viewTask && (
          <Link
            href={event ? `/tasks/${event.chainId}:${event.taskId}` : undefined}
          >
            View task
          </Link>
        )}
        <Link
          href={
            chain && event
              ? `${chain.blockExplorers.default.url}/tx/${event.transactionHash}`
              : undefined
          }
          target="_blank"
        >
          View on explorer
        </Link>
      </CardFooter>
    </Card>
  )
}
