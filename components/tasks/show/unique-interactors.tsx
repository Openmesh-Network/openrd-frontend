"use client"

import { useState } from "react"

export function UniqueInteractors() {
  const [uniqueInteractors, setUniqueInteractors] = useState<
    number | undefined
  >(undefined)

  // Get unique interactors from API

  return (
    <div>
      {uniqueInteractors ? (
        <h2>{uniqueInteractors} unique accounts interacted</h2>
      ) : (
        <h2>Loading...</h2>
      )}
    </div>
  )
}
