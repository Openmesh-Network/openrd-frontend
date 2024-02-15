"use client"

import React from "react"
import { formatUnits, parseUnits } from "viem"
import { useChainId } from "wagmi"

import { chains } from "@/config/wagmi-config"

import { BalanceInput, BalanceInputProps } from "./balance-input"

export interface NativeBalanceInputProps
  extends Omit<BalanceInputProps, "symbol" | "token" | "value" | "onChange"> {
  value: bigint
  onChange?: (input: bigint) => void
}

const NativeBalanceInput = React.forwardRef<
  HTMLInputElement,
  NativeBalanceInputProps
>(({ chainId, value, onChange, ...props }, ref) => {
  const connectedChainId = useChainId()
  const chainID = chainId ?? connectedChainId
  const chain = chains.find((c) => c.id === chainID)
  const decimals = chain?.nativeCurrency?.decimals ?? 18

  return (
    <BalanceInput
      chainId={chainId}
      symbol={chain?.nativeCurrency?.symbol}
      ref={ref}
      {...props}
      value={formatUnits(value, decimals)}
      onChange={(input) => {
        onChange?.(parseUnits(input, decimals))
      }}
    />
  )
})
NativeBalanceInput.displayName = "NativeBalanceInput"

export { NativeBalanceInput }
