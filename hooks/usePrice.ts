import { useEffect, useState } from "react"
import { Task } from "@/openrd-indexer/types/tasks"
import { publicClients } from "@/openrd-indexer/utils/chain-cache"
import { getPrice } from "@/openrd-indexer/utils/get-token-price"
import { createPublicClient, http } from "viem"

import { chains } from "@/config/wagmi-config"

export function usePrice({ chainId, task }: { chainId: number; task?: Task }) {
  const [price, setPrice] = useState<number | undefined>(undefined)
  useEffect(() => {
    const fetchPrice = async () => {
      if (!task) {
        setPrice(undefined)
        return
      }

      const chain = chains.find((c) => c.id === chainId)
      if (!chain) {
        return Response.json(
          { error: `Chain with id ${chainId} not found.` },
          { status: 404 }
        )
      }
      if (!publicClients[chain.id]) {
        publicClients[chain.id] = createPublicClient({
          chain: chain,
          transport: http(),
        })
      }
      const newPrice = await getPrice(chain, task.nativeBudget, task.budget)
      setPrice(newPrice)
    }

    fetchPrice().catch(console.error)
  }, [chainId, task])
  return price
}
