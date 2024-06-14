"use client"

import { Address, formatUnits } from "viem"

export interface ShowReward {
  to: Address
  amount: bigint
  partialAmount?: bigint
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
    return acc + (value.partialAmount ?? value.amount)
  }, BigInt(0))

  return (
    <div>
      <div className="flex gap-x-[5px]">
        <span>
          {formatUnits(total, decimals)} {name}
        </span>
      </div>
      {total !== BigInt(0) && (
        <ul className="list-disc pl-4">
          {reward.map((r, i) => (
            <li key={i}>
              {formatUnits(r.partialAmount ?? r.amount, decimals)}/
              {formatUnits(r.amount, decimals)} {ticker} to {r.to}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
