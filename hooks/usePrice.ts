import { useEffect, useState } from "react"
import { ERC20Transfer, Task } from "@/openrd-indexer/types/tasks"
import { publicClients } from "@/openrd-indexer/utils/chain-cache"
import { getPrice } from "@/openrd-indexer/utils/get-token-price"
import { createPublicClient, http } from "viem"

import { chains } from "@/config/wagmi-config"

export interface Budget {
  nativeBudget: bigint
  budget: ERC20Transfer[]
}

export function usePrice({
  chainId,
  budget,
}: {
  chainId: number
  budget?: Budget
}) {
  const [price, setPrice] = useState<number | undefined>(undefined)
  useEffect(() => {
    const fetchPrice = async () => {
      if (!budget) {
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
      const newPrice = await getPrice(chain, budget.nativeBudget, budget.budget)
      setPrice(newPrice)
    }

    fetchPrice().catch(console.error)
  }, [chainId, budget])
  return price
}
