"use client"

import { useEffect, useState } from "react"
import { ERC20Transfer } from "@/openrd-indexer/types/tasks"
import { Address, erc20Abi, formatUnits } from "viem"
import { usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { Link } from "@/components/ui/link"

export function ShowBudgetItem({
  budgetItem,
  chainId,
  escrow,
}: {
  budgetItem: ERC20Transfer
  chainId: number
  escrow?: Address
}) {
  const chain = chains.find((c) => c.id === chainId)
  const publicClient = usePublicClient({ chainId: chainId })

  const [tokenInfo, setTokenInfo] = useState<{
    name?: string
    symbol?: string
    decimals: number
  }>({ decimals: 18 })

  useEffect(() => {
    const getTokenInfo = async () => {
      if (!publicClient) {
        return
      }

      const newTokenInfo = await publicClient.multicall({
        contracts: [
          {
            abi: erc20Abi,
            address: budgetItem.tokenContract,
            functionName: "name",
          },
          {
            abi: erc20Abi,
            address: budgetItem.tokenContract,
            functionName: "symbol",
          },
          {
            abi: erc20Abi,
            address: budgetItem.tokenContract,
            functionName: "decimals",
          },
        ],
      })
      setTokenInfo({
        name: newTokenInfo[0].result,
        symbol: newTokenInfo[1].result,
        decimals: newTokenInfo[2].result ?? 18,
      })
    }

    getTokenInfo().catch(console.error)
  }, [publicClient, budgetItem.tokenContract])

  const name = tokenInfo.name ?? budgetItem.tokenContract
  const amount = formatUnits(budgetItem.amount, tokenInfo.decimals)
  const ticker = tokenInfo.symbol ?? ""

  return (
    <Link
      href={
        chain
          ? `${chain.blockExplorers.default.url}/token/${budgetItem.tokenContract}${escrow ? `?a=${escrow}` : ""}`
          : undefined
      }
      target="_blank"
    >
      {name}: {amount} {ticker}
    </Link>
  )
}
