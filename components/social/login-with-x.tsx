"use client"

import { useRouter } from "next/navigation"
import axios from "axios"
import { Address } from "viem"

import { Button } from "../ui/button"

export function LoginWithX({ address }: { address?: Address }) {
  const { push } = useRouter()

  const login = async () => {
    const url = await axios
      .post("/leaderboard-indexer/loginWithX", undefined, {
        params: { address: address },
      })
      .then((res) => res.data.url)
    push(url)
  }

  return (
    <Button disabled={!address} onClick={() => login().catch(console.error)}>
      Login With X
    </Button>
  )
}
