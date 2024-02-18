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
        <h2>{budgetValue} in task budgets</h2>
      ) : (
        <h2>Loading...</h2>
      )}
    </div>
  )
}
