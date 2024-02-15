"use client"

import { useEffect, useState } from "react"

import { getTotalEvents } from "@/lib/indexer"

import { ShowEvent } from "./show-event"

export function ShowRecentEvents() {
  const [eventCount, setEventCount] = useState<number>(0)

  useEffect(() => {
    const getEventCount = async () => {
      const totalEvents = await getTotalEvents()
      setEventCount(totalEvents.totalEvents)
    }

    getEventCount().catch(console.error)
  }, [])

  return (
    <div>
      <span className="text-xl">Latest updates:</span>
      {Array.from({ length: eventCount }, (value, index) => index)
        .slice(-5)
        .reverse()
        .map((eventId, i) => (
          <ShowEvent key={i} eventIndex={eventId} viewTask={true} />
        ))}
    </div>
  )
}
