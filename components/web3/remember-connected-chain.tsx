"use client"

import { useEffect, useState } from "react"
import { UserRejectedRequestError } from "viem"
import { useAccount, useChainId, useSwitchChain } from "wagmi"

export function RememberConnectedChain() {
  const chainId = useChainId()
  const { connector } = useAccount()
  const { switchChainAsync } = useSwitchChain()
  const [chainRecovered, setChainRecovered] = useState<boolean>(false)

  useEffect(() => {
    const rememberChain = async () => {
      if (!connector) {
        if (chainRecovered) {
          // Prompt to reconnect to last chain on reconnect
          setChainRecovered(false)
        }
        return
      }

      if (chainRecovered) {
        // We already did the recovery, any new chain switches should be saved
        localStorage.setItem("lastConnectedChain", chainId.toString())
        console.log("Set last connected chain to", chainId)
        return
      }

      const rememberedChain = localStorage.getItem("lastConnectedChain")
      if (!rememberedChain) {
        setChainRecovered(true)
        return
      }

      const switchToChainId = Number.parseInt(rememberedChain)
      if ((await connector.getChainId()) === switchToChainId) {
        setChainRecovered(true)
        return
      }

      console.log("Switching to last connected chain", switchToChainId)
      switchChainAsync({ chainId: switchToChainId }).catch((err) => {
        console.error(err)
        if (err instanceof UserRejectedRequestError) {
          // User doesnt wanna switch to last connected chain
          // Save current chain instead for next time
          localStorage.setItem("lastConnectedChain", chainId.toString())
          setChainRecovered(true)
        }
      })
    }

    rememberChain().catch(console.error)
  }, [connector, chainId])

  return <></>
}
