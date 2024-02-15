"use client"

import React, { useEffect, useState } from "react"
import { erc20Abi, formatUnits, parseUnits } from "viem"
import { usePublicClient } from "wagmi"

import { BalanceInput, BalanceInputProps } from "./balance-input"

export interface ERC20BalanceInputProps
  extends Omit<BalanceInputProps, "symbol" | "value" | "onChange"> {
  value: bigint
  onChange?: (input: bigint) => void
}

const ERC20BalanceInput = React.forwardRef<
  HTMLInputElement,
  ERC20BalanceInputProps
>(({ chainId, token, value, onChange, ...props }, ref) => {
  const publicClient = usePublicClient({ chainId: chainId })

  const [tokenInfo, setTokenInfo] = useState<{
    decimals: number
    symbol: string
  }>({
    decimals: 18,
    symbol: "",
  })

  useEffect(() => {
    const getTokenInfo = async () => {
      if (!publicClient || !token) {
        return
      }

      const newTokenInfo = await publicClient.multicall({
        contracts: [
          {
            abi: erc20Abi,
            address: token,
            functionName: "decimals",
          },
          {
            abi: erc20Abi,
            address: token,
            functionName: "symbol",
          },
        ],
      })
      setTokenInfo({
        decimals: newTokenInfo[0].result ?? 18,
        symbol: newTokenInfo[1].result ?? "",
      })
    }

    getTokenInfo().catch(console.error)
  }, [publicClient, token])

  return (
    <BalanceInput
      chainId={chainId}
      symbol={tokenInfo.symbol}
      token={token}
      showAvailable={token !== undefined}
      ref={ref}
      {...props}
      value={formatUnits(value, tokenInfo.decimals)}
      onChange={(input) => {
        onChange?.(parseUnits(input, tokenInfo.decimals))
      }}
    />
  )
})
ERC20BalanceInput.displayName = "ERC20BalanceInput"

export { ERC20BalanceInput }
