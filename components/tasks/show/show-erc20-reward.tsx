"use client"

import { useEffect, useState } from "react"
import { Reward } from "@/openrd-indexer/types/tasks"
import { Address, erc20Abi } from "viem"
import { usePublicClient } from "wagmi"

import { ShowReward } from "./show-reward"

export interface ShowERC20Reward extends Reward {
  partialAmount?: bigint
}

export function ShowERC20Reward({
  chainId,
  budget,
  reward,
}: {
  chainId: number
  budget: { tokenContract: Address }
  reward: ShowERC20Reward[]
}) {
  const publicClient = usePublicClient({ chainId })

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
            address: budget.tokenContract,
            functionName: "name",
          },
          {
            abi: erc20Abi,
            address: budget.tokenContract,
            functionName: "symbol",
          },
          {
            abi: erc20Abi,
            address: budget.tokenContract,
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
  }, [publicClient, budget.tokenContract])

  const name = tokenInfo?.name ?? budget.tokenContract
  const ticker = tokenInfo?.symbol ?? "tokens"
  const decimals = tokenInfo?.decimals

  return (
    <ShowReward
      name={name}
      ticker={ticker}
      decimals={decimals}
      reward={reward}
    />
  )
}
