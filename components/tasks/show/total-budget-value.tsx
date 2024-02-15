"use client"

import { useState } from "react"

export function TotalBudgetValue() {
  const [budgetValue, setBudgetValue] = useState<number | undefined>(undefined)

  // Get total budget value from API

  return <div>{budgetValue ? <h2>{budgetValue}</h2> : <h2>Loading...</h2>}</div>
}
