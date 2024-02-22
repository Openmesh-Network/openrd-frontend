"use client"

import { NativeReward } from "@/openrd-indexer/types/tasks"

import { chains } from "@/config/wagmi-config"

import { ShowReward } from "./show-reward"

export interface ShowNativeReward extends NativeReward {
  partialAmount?: bigint
}

export function ShowNativeReward({
  chainId,
  reward,
}: {
  chainId: number
  reward: ShowNativeReward[]
}) {
  const chain = chains.find((c) => c.id === chainId)
  const name = chain?.nativeCurrency.name ?? "native currency"
  const ticker = chain?.nativeCurrency.symbol ?? "ether"
  const decimals = chain?.nativeCurrency.decimals ?? 18

  return (
    <ShowReward
      name={name}
      ticker={ticker}
      decimals={decimals}
      reward={reward}
    />
  )
}
