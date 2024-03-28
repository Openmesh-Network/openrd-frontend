/* eslint-disable @next/next/no-img-element */
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
import { formatAddress } from "@/lib/general-functions"

interface UserInfo {
  title?: string
}

export function ShowEvent({
  eventIndex,
  hideDescription,
  viewTask,
  index,
}: {
  eventIndex: number
  hideDescription?: boolean
  viewTask?: boolean
  index: number
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
    <Card className={`max-w-[250px] gap-x-[10px] !border-b-2 !border-x-0 py-[10px] !shadow-none md:flex md:max-w-full md:justify-between md:py-[20px] ${index !== 0 && 'rounded-none'} ${index === 0 && 'rounded-b-none'}`}>
      <CardHeader>
        <div className="flex items-center gap-x-2">
          <img
            alt="ethereum avatar"
            src={`https://effigy.im/a/${sender}.svg`}
            className="w-[25px] rounded-full"
          ></img>     
          <div className="text-base font-normal">
            {sender && formatAddress(sender)}
          </div>  
        </div>
        <div className="!mt-3 ml-8 grid gap-y-1">
        <CardTitle className="!text-base !font-medium">
          {title ?? <Skeleton className="bg-white md:h-6 md:w-[250px]" />}
        </CardTitle>
        <CardDescription className="!text-xs">
          {!hideDescription && sender && timestamp
            ? `${timestamp.toTimeString()} ${timestamp.toDateString()}`
            : ""}
        </CardDescription>
        </div>

      </CardHeader>
      <CardFooter className="mb-2 grid items-center gap-y-2 pb-0 text-center text-sm md:mb-0 md:mr-[80px] md:gap-y-0 md:text-base">
        {viewTask && (
          <Link
          className="flex cursor-pointer items-center justify-center rounded-md border-[0.5px] border-[#87868645] !py-[5px] px-[8px] text-center hover:bg-[#a5a5a511] dark:hover:bg-[#4747472b]"
            href={
              event && event.type !== "TaskDraftCreated"
                ? `/tasks/${event.chainId}:${event.type === "DisputeCreated" ? event.dispute.taskId : event.taskId}`
                : undefined
            }
          >
            View task
          </Link>
        )}
        <Link
          className="flex cursor-pointer items-center justify-center rounded-md border-[0.5px] border-[#87868645] !py-[5px] px-[8px] text-center hover:bg-[#a5a5a511] dark:hover:bg-[#4747472b]"
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
