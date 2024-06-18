"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { EventIdentifier } from "@/openrd-indexer/types/event-identifier"
import { RFPEvent } from "@/openrd-indexer/types/rfp-events"
import { Block, isAddress, Transaction } from "viem"
import { usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { formatAddress } from "@/lib/general-functions"
import { getRFPEvent } from "@/lib/indexer"
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

export function ShowRFPEvent({
  eventIndex,
  hideDescription,
  viewRFP,
  index,
}: {
  eventIndex: EventIdentifier
  hideDescription?: boolean
  viewRFP?: boolean
  index: number
}) {
  const [event, setEvent] = useState<RFPEvent | undefined>(undefined)
  const [transaction, setTransaction] = useState<Transaction | undefined>(
    undefined
  )
  const [block, setBlock] = useState<Block | undefined>(undefined)

  const chain = event ? chains.find((c) => c.id === event.chainId) : undefined
  const publicClient = usePublicClient({ chainId: event?.chainId })

  useEffect(() => {
    const getEventInfo = async () => {
      const eventInfo = await getRFPEvent(eventIndex)
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
    <Card
      className={`max-w-[1000px] gap-x-[10px] !border-x-0 !border-b-2 py-[10px] !shadow-none md:flex md:max-w-full md:justify-between md:py-[20px] ${index !== 0 && "rounded-none"} ${index === 0 && "rounded-b-none"}`}
    >
      <CardHeader>
        <div className="flex items-center gap-x-2">
          {transaction?.from && (
            <Image
              alt="Sender avatar"
              src={`https://effigy.im/a/${transaction.from}.svg`}
              className="rounded-full"
              width={25}
              height={25}
            />
          )}
          <div className="text-base font-normal">
            {sender && isAddress(sender) ? formatAddress(sender) : sender}
          </div>
        </div>
        <div className="!mt-3 ml-8 grid gap-y-1">
          <CardTitle className="!text-base !font-medium">
            {title ?? <Skeleton className="bg-white md:h-6 md:w-[250px]" />}
          </CardTitle>
          <CardDescription className="!text-xs">
            {!hideDescription && timestamp
              ? `${timestamp.toTimeString()} ${timestamp.toDateString()}`
              : ""}
          </CardDescription>
        </div>
      </CardHeader>
      <CardFooter className="mb-2 grid items-center gap-y-2 pb-0 text-center text-sm md:mb-0 md:mr-[80px] md:gap-y-0 md:text-base">
        {viewRFP && (
          <Link
            className="flex cursor-pointer items-center justify-center rounded-md border-[0.5px] border-[#87868645] !py-[5px] px-[8px] text-center hover:bg-[#a5a5a511] dark:hover:bg-[#4747472b]"
            href={getRFPLinkFromEvent(event)}
          >
            View RFP
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

function getRFPLinkFromEvent(event?: RFPEvent): string | undefined {
  if (!event) {
    return undefined
  }

  return `/rfps/${event.chainId}:${event.rfpId}`
}
