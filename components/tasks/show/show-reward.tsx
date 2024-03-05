/* eslint-disable @next/next/no-img-element */
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
    return acc + value.amount
  }, BigInt(0))

  return (
    <div>
      <div className="flex gap-x-[5px]">
        <span>
          {formatUnits(total, decimals)} {name}
        </span>
        {
          name === 'MATIC' && (
          <img
            alt="matic"
            src="/images/task/polygon-matic-logo.svg"
            className="w-[15px]"
          ></img>
          )
        }
        {
          name === 'ETHER' && (
          <img
            alt="matic"
            src="/images/task/ethereum-eth-logo.svg"
            className="w-[12px]"
          ></img>
          )
        }
      </div>
      {total !== BigInt(0) && (
        <ul className="list-disc pl-4">
          {reward.map((r, i) => (
            <li key={i}>
              {formatUnits(r.amount, decimals)} {ticker} to {r.to}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
