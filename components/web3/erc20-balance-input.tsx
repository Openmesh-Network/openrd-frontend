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
    decimals?: number
    symbol?: string
  }>({})

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
      decimals: newTokenInfo[0].result,
      symbol: newTokenInfo[1].result,
    })
  }

  useEffect(() => {
    getTokenInfo().catch(console.error)
  }, [publicClient, token])

  return (
    <div>
      <BalanceInput
        chainId={chainId}
        symbol={tokenInfo.symbol}
        token={token}
        showAvailable={token !== undefined}
        ref={ref}
        {...props}
        value={formatUnits(value, tokenInfo.decimals ?? 18)}
        onChange={(input) => {
          onChange?.(parseUnits(input, tokenInfo.decimals ?? 18))
        }}
      />
      {token && tokenInfo.decimals === undefined && (
        <div onClick={() => getTokenInfo().catch(console.error)}>
          <span className="text-xs text-red-500">
            Error fetching token details
          </span>
        </div>
      )}
    </div>
  )
})
ERC20BalanceInput.displayName = "ERC20BalanceInput"

export { ERC20BalanceInput }
