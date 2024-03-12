"use client"

import { useEffect, useState } from "react"
import { useAccount } from "wagmi"

import { NavItem } from "@/types/nav"
import { siteConfig } from "@/config/site"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"

import { NotificationsToggle } from "./notifications-toggle"

export function SiteHeader() {
  const [navItems, setNavItems] = useState<NavItem[]>(siteConfig.mainNav)

  const account = useAccount()
  useEffect(() => {
    let items = [...siteConfig.mainNav]
    if (account.isConnected && account.address) {
      items.push({
        title: "My Profile",
        href: `/profile/${account.address}`,
      })
    }
    setNavItems(items)
  }, [account.address, account.isConnected])

  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0">
        <MainNav items={navItems} />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <NotificationsToggle />
            <ThemeToggle />
            <w3m-button />
          </nav>
        </div>
      </div>
    </header>
  )
}
