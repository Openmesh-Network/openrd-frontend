"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"

import { NavItem } from "@/types/nav"
import { siteConfig } from "@/config/site"
import { useAbstractWalletClient } from "@/hooks/useAbstractWalletClient"
import { MainNav } from "@/components/main-nav"
import { ThemeToggle } from "@/components/theme-toggle"

import { MobileNav } from "./mobile-nav"
import { NotificationsToggle } from "./notifications-toggle"
import { ConnectButton } from "./web3/connect-button"

export function SiteHeader() {
  const [navItems, setNavItems] = useState<NavItem[]>(siteConfig.mainNav)
  const [navbarOpen, setNavbarOpen] = useState(false)

  const walletClient = useAbstractWalletClient()

  function navbarToggleHandler() {
    setNavbarOpen(!navbarOpen)
  }

  useEffect(() => {
    let items = [...siteConfig.mainNav]
    if (walletClient?.account?.address) {
      items.push({
        title: "My Profile",
        href: `/profile/${walletClient.account.address}`,
      })
    }
    setNavItems(items)
  }, [walletClient?.account?.address])

  return (
    <header className="bg-background sticky top-0 z-40 w-full border-b">
      <div className="container h-16 items-center space-x-4 sm:justify-between sm:space-x-0 hidden md:flex">
        <MainNav items={navItems} />
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-1">
            <NotificationsToggle />
            <ThemeToggle />
            <ConnectButton />
          </nav>
        </div>
      </div>
      <div className="container flex h-16 items-center space-x-4 sm:justify-between sm:space-x-0 md:hidden">
        <Link href="/" className="flex items-center space-x-2">
          <Image alt="Logo" src="/icon.png" width={20} height={20} />
          <span className="inline-block font-bold">{siteConfig.name}</span>
        </Link>
        <MobileNav items={navItems} />
      </div>
    </header>
  )
}
