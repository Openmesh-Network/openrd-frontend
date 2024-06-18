"use client"

import { useEffect, useState } from "react"
import { EventIdentifier } from "@/openrd-indexer/types/event-identifier"

import { getRecentEvents } from "@/lib/indexer"

import { ShowEvent } from "./show-event"

export function ShowRecentEvents() {
  const [recentEventIds, setRecentEventIds] = useState<EventIdentifier[]>([])

  useEffect(() => {
    const getRecentEventIds = async () => {
      const recentEvents = await getRecentEvents()
      setRecentEventIds(recentEvents)
    }

    getRecentEventIds().catch(console.error)
  }, [])

  return (
    <div>
      <div className="mb-[10px] mt-[5px] md:text-lg">Latest updates:</div>
      {recentEventIds.map((eventId, i) => (
        <ShowEvent key={i} eventIndex={eventId} viewTask={true} index={i} />
      ))}
    </div>
  )
}
