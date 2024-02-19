import { useEffect, useState } from "react"
import { Address } from "viem"

import { getUser } from "@/lib/indexer"

import { useENS } from "./useENS"

export function useAddressTitle(address?: Address) {
  const [title, setTitle] = useState<string | undefined>(undefined)
  const ens = useENS({ address: address })

  useEffect(() => {
    const getTitle = async () => {
      if (!address) {
        setTitle(undefined)
        return
      }

      const user = await getUser(address)
      setTitle(user.metadata ? JSON.parse(user.metadata)?.title : undefined)
    }

    getTitle().catch(console.error)
  }, [address])

  return title ?? ens ?? address
}
