import { useEffect, useState } from "react"
import { ERC20Transfer } from "@/openrd-indexer/types/tasks"
import { publicClients } from "@/openrd-indexer/utils/chain-cache"
import { getPrice } from "@/openrd-indexer/utils/get-token-price"
import { useQuery } from "@tanstack/react-query"
import { Address, createPublicClient, erc20Abi, http } from "viem"
import { usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"

export interface Budget {
  nativeBudget: bigint
  budget: ERC20Transfer[]
}

export function usePrice({
  chainId,
  budget: providedBudget,
  directBalance,
}: {
  chainId: number
  budget?: Budget
  directBalance?: Address
}) {
  const [price, setPrice] = useState<number | undefined>(undefined)

  const publicClient = usePublicClient({ chainId })
  const tokens = providedBudget?.budget?.map((b) => b.tokenContract) ?? []
  const { data: directBudget } = useQuery({
    queryKey: [chainId, publicClient, tokens, directBalance, "directBudget"],
    queryFn: async () => {
      if (!publicClient || !directBalance) {
        return undefined
      }

      const promises: [Promise<bigint>, Promise<ERC20Transfer[]>] = [
        publicClient.getBalance({ address: directBalance }),
        Promise.resolve([]),
      ]
      if (tokens.length !== 0) {
        promises[1] = publicClient
          .multicall({
            contracts: tokens.map((t) => {
              return {
                abi: erc20Abi,
                address: t,
                functionName: "balanceOf",
                args: [directBalance],
              }
            }),
          })
          .then((balances) =>
            balances.map((b) => b.result as bigint | undefined)
          )
          .then((balances) =>
            balances.map((b, i) => {
              return {
                tokenContract: tokens[i],
                amount: b ?? BigInt(0),
              }
            })
          )
      }

      const balances = await Promise.all(promises)
      return { nativeBudget: balances[0], budget: balances[1] } as Budget
    },
  })

  const budget = directBudget ?? providedBudget
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
