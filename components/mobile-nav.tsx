/* eslint-disable tailwindcss/no-unnecessary-arbitrary-value */
import * as React from "react"
import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { NavItem } from "@/types/nav"
import { siteConfig } from "@/config/site"
import { cn } from "@/lib/utils"

import { NotificationsToggle } from "./notifications-toggle"
import { ThemeToggle } from "./theme-toggle"
import { ConnectButton } from "./web3/connect-button"

interface MainNavProps {
  items?: NavItem[]
}

export function MobileNav({ items }: MainNavProps) {
  const pathname = usePathname()
  const [navbarOpen, setNavbarOpen] = useState(false)

  function navbarToggleHandler() {
    setNavbarOpen(!navbarOpen)
  }

  return (
    <div className="">
      <button
        onClick={navbarToggleHandler}
        id="navbarToggler"
        aria-label="Mobile Menu"
        className="absolute right-4 top-1/2 block translate-y-[-50%] rounded-lg px-3 py-[6px] ring-primary focus:ring-2 lg:hidden"
      >
        <span
          className={`relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300  ${
            navbarOpen ? " top-[7px] rotate-45" : " "
          }`}
        />
        <span
          className={`relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300 ${
            navbarOpen ? "opacity-0 " : " "
          }`}
        />
        <span
          className={`relative my-1.5 block h-0.5 w-[30px] bg-black transition-all duration-300  ${
            navbarOpen ? " top-[-8px] -rotate-45" : " "
          }`}
        />
      </button>
      <nav
        id="navbarCollapse"
        className={`navbar border-body-color/50 dark:border-body-color/20 dark:bg-dark absolute right-0 z-50 w-full rounded border-[.5px] bg-white px-6 py-4 duration-300 dark:bg-[#000] lg:visible lg:static lg:mr-[95px] lg:w-auto lg:border-none lg:!bg-transparent lg:p-0 lg:opacity-100 ${
          navbarOpen
            ? "visibility top-full opacity-100"
            : "invisible top-[120%] opacity-0"
        }`}
      >
        <ul className="grid gap-y-[10px] pb-[19.5px] pt-[17px] md:gap-x-[12px] md:pb-[23.5px] md:pt-[20.5px]  lg:flex lg:gap-x-[22px] lg:pb-[27px] lg:pt-[24px] xl:gap-x-[32px] xl:pb-[31px] xl:pt-[27px] 2xl:gap-x-[65px] 2xl:pb-[39px] 2xl:pt-[34px]">
          {items?.map(
            (item, index) =>
              item.href && (
                <Link
                  key={index}
                  href={item.href}
                  className={cn(
                    "flex items-center text-base font-medium text-muted-foreground hover:text-[#000000d0] dark:hover:text-[#ffffffdc]",
                    item.disabled && "cursor-not-allowed opacity-80",
                    pathname.endsWith("/tasks") &&
                      item.title === "Tasks" &&
                      "text-black dark:text-white",
                    pathname.endsWith("/") &&
                      item.title === "Home" &&
                      "text-black dark:text-white"
                  )}
                >
                  {item.title}
                </Link>
              )
          )}
          <li className="mt-2">
            <NotificationsToggle />
            <ThemeToggle />
            <div className="mt-2">
              <ConnectButton />
            </div>
          </li>
        </ul>
      </nav>
    </div>
  )
}
