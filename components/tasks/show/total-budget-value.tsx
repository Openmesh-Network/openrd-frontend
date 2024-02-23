/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from "react"

import { getTotalUsdValue } from "@/lib/indexer"

export function TotalBudgetValue() {
  const [budgetValue, setBudgetValue] = useState<number | undefined>(undefined)

  useEffect(() => {
    const getBudgetValue = async () => {
      const totalUsd = await getTotalUsdValue()
      setBudgetValue(totalUsd.totalUsdValue)
    }

    getBudgetValue().catch(console.error)
  }, [])

  return (
    <div>
      {budgetValue !== undefined ? (
        <div>
          <div className="flex gap-x-[5px] text-xl font-bold">
            <div>
              ${budgetValue} 
            </div>
            <img
              src={`/images/utils/usdc.svg`}
              alt="image"
              className={`ml-1 w-[15px]`}
            />
            <img
              src={`/images/utils/usdt.svg`}
              alt="image"
              className={`w-[15px]`}
            />
          </div>
          <div className="text-sm">Total Project Values</div>
        </div>
      ) : (
        <h2>Loading...</h2>
      )}
    </div>
  )
}
