"use client"

import React, { useEffect, useState } from "react"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import { Address, erc20Abi, formatUnits, maxUint256, parseAbiItem } from "viem"
import { usePublicClient, useWalletClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { Alert, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { ToastAction } from "@/components/ui/toast"
import { toast } from "@/components/ui/use-toast"

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
  const { data: walletClient } = useWalletClient({ chainId: chainId })
  const publicClient = usePublicClient({ chainId: chainId })

  const enabled =
    token !== undefined &&
    amount !== undefined &&
    spender !== undefined &&
    account !== undefined

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
    const setAllowance = async () => {
      if (!spender) {
        toast({
          title: "ERC20 allowance failed",
          description: "Spender is undefined.",
          variant: "destructive",
        })
        return
      }
      if (!token) {
        toast({
          title: "ERC20 allowance failed",
          description: "Token is undefined.",
          variant: "destructive",
        })
        return
      }
      if (!walletClient) {
        toast({
          title: "ERC20 allowance failed",
          description: "WalletClient is undefined.",
          variant: "destructive",
        })
        return
      }

      let { dismiss } = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      })
      const transactionHash = await walletClient
        .writeContract({
          abi: [
            parseAbiItem("function approve(address spender, uint256 amount)"),
          ],
          address: token,
          functionName: "approve",
          args: [spender, to],
          account: account,
          chain: chains.find((c) => c.id === chainId),
        })
        .catch((err) => {
          console.error(err)
          return undefined
        })
      if (!transactionHash) {
        dismiss()
        toast({
          title: "Task creation failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Allowance transaction submitted",
        description: "Waiting until confirmed on the blockchain...",
        action: (
          <ToastAction
            altText="View on explorer"
            onClick={() => {
              const chain = chains.find((c) => c.id === chainId)
              if (!chain) {
                return
              }

              window.open(
                `${chain.blockExplorers.default.url}/tx/${transactionHash}`,
                "_blank"
              )
            }}
          >
            View on explorer
          </ToastAction>
        ),
      }).dismiss

      if (!publicClient) {
        dismiss()
        toast({
          title: "Cannot watch blockchain",
          description: "PublicClient is undefined.",
          variant: "destructive",
        })
        return
      }

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      })
      dismiss()
      dismiss = toast({
        title: "Transaction confirmed!",
        description: "Your allowance has been increased.",
        variant: "success",
      }).dismiss

      await getAllowance()
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
              <div className="flex gap-x-2 right-2">
                <Button onClick={() => increaseAllowance(amount)}>
                  Allow {formatUnits(amount, tokenInfo.decimals)}
                </Button>
                <Button onClick={() => increaseAllowance(amount * BigInt(10))}>
                  Allow {formatUnits(amount * BigInt(10), tokenInfo.decimals)}
                </Button>
                <Button onClick={() => increaseAllowance(maxUint256)}>
                  Allow infinite
                </Button>
              </div>
            </AlertTitle>
          </Alert>
        )}
    </div>
  )
}
