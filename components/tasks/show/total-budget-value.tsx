"use client"

import { useEffect, useState } from "react"
import Image from "next/image"

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

  const formatNumber = (number: number) => {
    return number.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  return (
    <div>
      {budgetValue !== undefined ? (
        <div>
          <div className="flex gap-x-[5px] text-xl font-bold">
            <div>${formatNumber(budgetValue)}</div>
            <Image
              src={`/images/utils/usdc.svg`}
              alt="USDC"
              className={`ml-1 w-[15px]`}
            />
            <Image
              src={`/images/utils/usdt.svg`}
              alt="USDT"
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
