"use client"

import { useQuery } from "@tanstack/react-query"
import axios from "axios"
import { AlertCircle, AlertTriangle } from "lucide-react"
import { Address } from "viem"
import { useWalletClient } from "wagmi"

import { Alert, AlertDescription, AlertTitle } from "../ui/alert"
import { Link } from "../ui/link"
import { LeaderboardList } from "./list"
import { LeaderboardRegister } from "./register"
import Timeline from "./timeline"

export type DroplistItem = { address: Address; time: number; x: string }

export function Leaderboard() {
  const { data: walletClient } = useWalletClient()

  const { data: droplist } = useQuery({
    initialData: [],
    queryKey: ["droplist"],
    queryFn: async () => {
      return await axios
        .get("/leaderboard-indexer/droplist")
        .then((res) => res.data as DroplistItem[])
    },
  })

  const { data: luckynumbers } = useQuery({
    queryKey: ["luckynumbers"],
    queryFn: async () => {
      return await axios
        .get("/genesis-lucky-numbers.txt")
        .then((res) => res.data as string)
        .then((res) => res.split("\n"))
        .then((res) => res.map((n) => parseInt(n)))
    },
  })

  const droplistPosition = droplist.findIndex(
    (d) =>
      d.address.toLowerCase() === walletClient?.account.address.toLowerCase()
  )

  // if (droplist?.length && luckynumbers) {
  //   const addresses = []
  //   for (let i = 0; i < 500; i++) {
  //     addresses.push(droplist[i].address)
  //   }
  //   for (let i = 0; i < luckynumbers.length; i++) {
  //     addresses.push(droplist[luckynumbers[i] - 1].address)
  //   }
  //   console.log(`[\"${addresses.join('", "')}\"]`)
  // }

  return (
    <div className="flex flex-col gap-12 pt-5">
      <Link
        className="text-xl underline"
        href="https://openmesh.network"
        target="_blank"
      >
        Openmesh main website (litepaper, technology, roadmap)
      </Link>
      <Timeline />
      {droplistPosition === -1 ? (
        Date.now() >
        Date.UTC(2024, 10 - 1, 11, 23, 59, 59, 999) - 11 * 60 * 60 * 1000 ? (
          <Alert className="border-red-400 bg-red-200 hover:bg-red-200/80 dark:border-red-800 dark:bg-red-700 dark:hover:bg-red-700/80">
            <AlertTitle className="flex place-items-center gap-1">
              <AlertCircle />
              The whitelist has been closed. Winners have been decided.
            </AlertTitle>
          </Alert>
        ) : (
          <div className="flex flex-col gap-7">
            {droplist.length >= 500 && (
              <Alert className="border-orange-400 bg-orange-200 hover:bg-orange-200/80 dark:border-orange-800 dark:bg-orange-700 dark:hover:bg-orange-700/80">
                <AlertTitle className="flex place-items-center gap-1">
                  <AlertTriangle />
                  All guaranteed slots have been filled. Now, 500 random slots
                  are open for participants.
                </AlertTitle>
              </Alert>
            )}
            <LeaderboardRegister />
          </div>
        )
      ) : luckynumbers !== undefined ? (
        luckynumbers.includes(droplistPosition + 1) ||
        droplistPosition < 500 ? (
          <Alert className="border-green-400 bg-green-200 hover:bg-green-200/80 dark:border-green-800 dark:bg-green-700 dark:hover:bg-green-700/80">
            <AlertTitle>Congratulations!</AlertTitle>{" "}
            <AlertDescription>
              Position #{droplistPosition + 1} is a winning number!
            </AlertDescription>
          </Alert>
        ) : (
          <Alert className="border-red-400 bg-red-200 hover:bg-red-200/80 dark:border-red-800 dark:bg-red-700 dark:hover:bg-red-700/80">
            <AlertTitle>Unfortunate...</AlertTitle>{" "}
            <AlertDescription>
              Position #{droplistPosition + 1} did not win this time. However
              there are plenty more initiatives to acquire some OPEN tokens!
            </AlertDescription>
          </Alert>
        )
      ) : (
        <Alert className="border-green-400 bg-green-200 hover:bg-green-200/80 dark:border-green-800 dark:bg-green-700 dark:hover:bg-green-700/80">
          <AlertTitle>Whitelisted!</AlertTitle>{" "}
          <AlertDescription>
            You are on position #{droplistPosition + 1}
          </AlertDescription>
        </Alert>
      )}
      {droplist.length > 0 && <LeaderboardList droplist={droplist} />}
    </div>
  )
}
