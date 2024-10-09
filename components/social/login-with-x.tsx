"use client"

import { useRouter } from "next/navigation"
import axios from "axios"
import { Address } from "viem"

import { Button, ButtonProps } from "../ui/button"

export function LoginWithX({
  address,
  text,
  className,
  variant,
}: {
  address?: Address
  text: string
  className?: string
  variant?: ButtonProps["variant"]
}) {
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
    <Button
      className={className}
      disabled={!address}
      onClick={() => login().catch(console.error)}
      variant={variant}
    >
      {text}
    </Button>
  )
}
