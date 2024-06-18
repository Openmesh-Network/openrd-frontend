"use client"

import * as React from "react"
import { EventIdentifier } from "@/openrd-indexer/types/event-identifier"

import { userEvents } from "@/lib/indexer"
import { buttonVariants } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"

import { Icons } from "./icons"
import { ShowEvent } from "./tasks/show/show-event"

export function NotificationsToggle() {
  const walletClient = useAbstractWalletClient()
  const [events, setEvents] = React.useState<EventIdentifier[]>([])

  const getEvents = async () => {
    if (!walletClient?.account?.address) {
      setEvents([])
      return
    }

    const newEvents = await userEvents(walletClient.account.address)
    setEvents(newEvents)
  }

  React.useEffect(() => {
    getEvents().catch(console.error)
  }, [walletClient?.account?.address])

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
            .slice(0, 5)
            .map((eventId, i) => (
              <ShowEvent
                index={i}
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
