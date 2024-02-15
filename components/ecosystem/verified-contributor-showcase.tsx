"use client"

import { useState } from "react"

export function VerifiedContributorShowcase() {
  const [verifiedContributorsCount, setVerifiedContributorsCount] = useState<
    number | undefined
  >(undefined)

  // Get verified contributor count from API

  // Highlight some verified contributors?

  // Make it a button to get more information about verified contributors
  // Or add a button to apply

  return (
    <div>
      {verifiedContributorsCount ? (
        <h2>{verifiedContributorsCount} Verified Contributors</h2>
      ) : (
        <h2>Loading...</h2>
      )}
    </div>
  )
}
