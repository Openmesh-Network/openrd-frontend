"use client"

import * as React from "react"
import { useAccount } from "wagmi"

import { userEvents } from "@/lib/indexer"
import { Button, buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { Icons } from "./icons"
import { ShowEvent } from "./tasks/show/show-event"

export function NotificationsToggle() {
  const account = useAccount()
  const [events, setEvents] = React.useState<number[]>([])

  const getEvents = async () => {
    if (!account.address) {
      setEvents([])
      return
    }

    const newEvents = await userEvents(account.address)
    setEvents(newEvents)
  }

  React.useEffect(() => {
    getEvents().catch(console.error)
  }, [account.address])

  return (
    <DropdownMenu onOpenChange={() => getEvents().catch(console.error)}>
      <DropdownMenuTrigger
        className={buttonVariants({ variant: "ghost", size: "icon" })}
      >
        <Icons.notification />
        <span className="sr-only">Toggle notifications</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {events.length === 0 ? (
          <span>No notifications for this account.</span>
        ) : (
          events
            .sort((a, b) => a - b)
            .slice(-5)
            .reverse()
            .map((eventId, i) => (
              <ShowEvent
                key={i}
                eventIndex={eventId}
                hideDescription={true}
                viewTask={true}
              />
            ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
