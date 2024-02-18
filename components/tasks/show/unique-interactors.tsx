"use client"

import { useEffect, useState } from "react"

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
        <h2>{uniqueInteractors} unique accounts interacted</h2>
      ) : (
        <h2>Loading...</h2>
      )}
    </div>
  )
}
