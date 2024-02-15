"use client"

import { Address, formatUnits } from "viem"

export interface ShowReward {
  to: Address
  amount: bigint
}

export function ShowReward({
  name,
  ticker,
  decimals,
  reward,
}: {
  name: string
  ticker: string
  decimals: number
  reward: ShowReward[]
}) {
  const total = reward.reduce((acc, value) => {
    return acc + value.amount
  }, BigInt(0))

  return (
    <div>
      <span>
        {formatUnits(total, decimals)} {name}
      </span>
      {total !== BigInt(0) && (
        <ul>
          {reward.map((r, i) => (
            <li key={i}>
              - {formatUnits(r.amount, decimals)} {ticker} to {r.to}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
