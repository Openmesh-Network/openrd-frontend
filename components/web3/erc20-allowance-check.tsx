"use client"

import React, { useEffect, useState } from "react"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { Address, erc20Abi, formatUnits, maxUint256, parseAbiItem } from "viem"
import { usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { toast } from "@/components/ui/use-toast"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"

export interface ERC20AllowanceCheck {
  chainId?: number
  token?: Address
  amount?: bigint
  spender?: Address
  account?: Address
}

export function ERC20AllowanceCheck({
  chainId,
  token,
  amount,
  spender,
  account,
}: ERC20AllowanceCheck) {
  const publicClient = usePublicClient({ chainId })
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({ chainId })

  const [allowance, setAllowance] = useState<bigint | undefined>(undefined)
  const [tokenInfo, setTokenInfo] = useState<{ decimals: number }>({
    decimals: 18,
  })

  const getAllowance = async () => {
    if (!publicClient || !token || !account || !spender) {
      return
    }

    const newAllowance = await publicClient.readContract({
      abi: erc20Abi,
      address: token,
      functionName: "allowance",
      args: [account, spender],
    })
    setAllowance(newAllowance)
  }

  useEffect(() => {
    getAllowance().catch(console.error)
  }, [publicClient, token, account, spender])

  useEffect(() => {
    const getTokenInfo = async () => {
      if (!publicClient || !token) {
        return
      }

      const newDecimals = await publicClient.readContract({
        abi: erc20Abi,
        address: token,
        functionName: "decimals",
      })
      setTokenInfo({ decimals: newDecimals })
    }

    getTokenInfo().catch(console.error)
  }, [publicClient, token])

  const increaseAllowance = (to: bigint) => {
    async function setAllowance() {
      await performTransaction({
        transactionName: "Increase allowance",
        transaction: async () => {
          if (token === undefined) {
            loggers.onError?.({
              title: "Token is undefined",
              description: "Please try again later or reach out for support.",
            })
            return undefined
          }
          if (spender === undefined) {
            loggers.onError?.({
              title: "Spender is undefined",
              description: "Please try again later or reach out for support.",
            })
            return undefined
          }

          return {
            abi: [
              parseAbiItem("function approve(address spender, uint256 amount)"),
            ],
            address: token,
            functionName: "approve",
            args: [spender, to],
          }
        },
        onConfirmed: (receipt) => {
          getAllowance().catch(console.error)
        },
      })
    }

    setAllowance().catch(console.error)
  }

  return (
    <div>
      {allowance !== undefined &&
        amount !== undefined &&
        allowance < amount && (
          <Alert variant="destructive">
            <AlertTitle className="flex w-full place-content-between">
              <div className="flex gap-x-2 self-center">
                <ExclamationTriangleIcon className="size-4" />
                <span>
                  Insufficient allowance (
                  {formatUnits(allowance, tokenInfo.decimals)}):
                </span>
              </div>
              <div className="right-2 flex gap-x-2">
                <Button
                  onClick={() => increaseAllowance(amount)}
                  disabled={performingTransaction}
                >
                  Allow {formatUnits(amount, tokenInfo.decimals)}
                </Button>
                <Button
                  onClick={() => increaseAllowance(amount * BigInt(10))}
                  disabled={performingTransaction}
                >
                  Allow {formatUnits(amount * BigInt(10), tokenInfo.decimals)}
                </Button>
                <Button
                  onClick={() => increaseAllowance(maxUint256)}
                  disabled={performingTransaction}
                >
                  Allow infinite
                </Button>
              </div>
            </AlertTitle>
          </Alert>
        )}
    </div>
  )
}
