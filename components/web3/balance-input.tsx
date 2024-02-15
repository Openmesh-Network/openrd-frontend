"use client"

import React, { useEffect, useState } from "react"
import { Address, formatUnits } from "viem"
import { useBalance } from "wagmi"

import { Input, InputProps } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export interface BalanceInputProps
  extends Omit<InputProps, "onChange" | "min"> {
  chainId?: number
  symbol?: string
  token?: Address
  account?: Address
  showAvailable?: boolean
  onChange?: (input: string) => void
  min?: bigint
}

const BalanceInput = React.forwardRef<HTMLInputElement, BalanceInputProps>(
  (
    { chainId, symbol, token, account, showAvailable, onChange, min, ...props },
    ref
  ) => {
    const { data: balance } = useBalance({
      address: account,
      token: token,
      chainId: chainId,
    })

    const [firstRender, setFirstRender] = useState(true)
    useEffect(() => {
      setFirstRender(false)
    }, [])

    const formattedBalance =
      !firstRender && balance
        ? formatUnits(balance.value, balance.decimals)
        : undefined
    const formattedMin = balance && min ? formatUnits(min, balance.decimals) : 0

    return (
      <div>
        <Input
          type="number"
          step="any"
          min={formattedMin}
          max={showAvailable && formattedBalance ? formattedBalance : undefined}
          {...props}
          ref={ref}
          onChange={(change) => {
            onChange?.(change.target.value)
          }}
        />
        {showAvailable && (
          <Label className="text-xs">
            {formattedBalance ?? "0"} {symbol ?? ""} available.
          </Label>
        )}
      </div>
    )
  }
)
BalanceInput.displayName = "BalanceInput"

export { BalanceInput }
