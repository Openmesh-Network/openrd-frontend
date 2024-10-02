"use client"

import { useEffect } from "react"
import { useAccount, usePublicClient } from "wagmi"

import { useSetSettings, useSettings } from "../context/settings"

export function AccountAbstractionBalance() {
  const { address } = useAccount()
  const ethereumPublicClient = usePublicClient({ chainId: 1 })
  const polygonPublicClient = usePublicClient({ chainId: 137 })

  const settings = useSettings()
  const setSettings = useSetSettings()

  useEffect(() => {
    const checkBalance = async () => {
      if (!address || !ethereumPublicClient || !polygonPublicClient) {
        return
      }

      const balances = await Promise.all([
        ethereumPublicClient.getBalance({ address }),
        polygonPublicClient.getBalance({ address }),
      ])
      if (balances.some((b) => b > BigInt(0))) {
        // User has gas in their wallet
        console.log(
          "Gas found in connected account, disabling account abstraction..."
        )
        setSettings({
          ...settings,
          useAccountAbstraction: false,
        })
      } else {
        console.log(
          "No gas found in connected account, enabling account abstraction..."
        )
        setSettings({
          ...settings,
          useAccountAbstraction: true,
        })
      }
    }

    checkBalance().catch(console.error)
  }, [address, ethereumPublicClient, polygonPublicClient])

  return <></>
}
