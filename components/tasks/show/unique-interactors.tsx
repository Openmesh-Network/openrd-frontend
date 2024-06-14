"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

import { getTotalUsers } from "@/lib/indexer"

export function UniqueInteractors() {
  const [uniqueInteractors, setUniqueInteractors] = useState<
    number | undefined
  >(undefined)

  useEffect(() => {
    const getUniqueInteractos = async () => {
      const users = await getTotalUsers()
      setUniqueInteractors(users.totalUsers)
    }

    getUniqueInteractos().catch(console.error)
  }, [])

  return (
    <div>
      {uniqueInteractors !== undefined ? (
        <div className="text-center">
          <div className="mx-auto mb-[5px] flex size-[42px] items-center justify-center rounded-full border border-[#E2E8F0] p-[4px] text-xl text-black dark:border-[#1D283A] dark:text-white">
            {uniqueInteractors}
          </div>
          <div className="flex gap-x-[5px]">
            <Image
              className="dark:hidden"
              src={`/images/utils/accounts.svg`}
              alt={"unique account interacted image"}
              width={15}
              height={15}
            />
            <Image
              className="hidden dark:flex"
              src={`/images/utils/accounts-white.svg`}
              alt={"unique account interacted image"}
              width={15}
              height={15}
            />
            <h2>Unique accounts interacted</h2>
          </div>
        </div>
      ) : (
        <h2>Loading...</h2>
      )}
    </div>
  )
}
