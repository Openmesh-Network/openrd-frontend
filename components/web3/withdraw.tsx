"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useForm } from "react-hook-form"
import { Address, erc20Abi, formatUnits, isAddress, parseAbiItem } from "viem"
import { useChainId, usePublicClient } from "wagmi"
import { z } from "zod"

import { validAddress } from "@/lib/regex"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import {
  AddressPicker,
  SelectableAddresses,
} from "@/components/web3/address-picker"
import { ERC20BalanceInput } from "@/components/web3/erc20-balance-input"
import { TokensRequest, TokensResponse } from "@/app/api/tokens/route"

const formSchema = z.object({
  erc20transfer: z.object({
    tokenContract: z
      .string()
      .regex(validAddress, "ERC20 contract must be a valid address."),
    amount: z.coerce.bigint().min(BigInt(0), "Amount cannot be negative."),
  }),
  to: z.string().regex(validAddress, "Receiver must be a valid address."),
})

export function Withdraw() {
  const chainId = useChainId()
  const walletClient = useAbstractWalletClient({ chainId })
  const publicClient = usePublicClient({ chainId })
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({
      chainId,
    })

  const [withdrawDone, setWithdrawDone] = useState<string>("")
  const [tokens, setTokens] = useState<SelectableAddresses>({})
  useEffect(() => {
    const getTokens = async () => {
      if (!walletClient?.account?.address) {
        setTokens({})
        return
      }

      const request: TokensRequest = {
        chainId: chainId,
        address: walletClient.account.address,
      }
      const tokensResponse = await axios.post(
        "/api/tokens/",
        JSON.stringify(request)
      )

      if (tokensResponse.status === 200) {
        const data = tokensResponse.data as TokensResponse
        setTokens(
          data.tokens.reduce((acc, token) => {
            let name: string = token.contractAddress
            if (token.name) {
              name = token.name
            }
            if (token.symbol) {
              name = `${name} (${token.symbol})`
            }

            acc[token.contractAddress as Address] = {
              name: name,
              logo: token.logo,
            }
            return acc
          }, {} as SelectableAddresses)
        )
      } else {
        console.warn(`Token fetch failed: ${JSON.stringify(tokensResponse)}`)
      }
    }

    getTokens().catch(console.error)
  }, [walletClient?.account?.address, chainId])

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      erc20transfer: {
        tokenContract: "",
        amount: BigInt(0),
      },
      to: "",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Withdrawal",
      transaction: async () => {
        return {
          abi: [parseAbiItem("function transfer(address to, uint256 amount)")],
          address: values.erc20transfer.tokenContract as Address,
          functionName: "transfer",
          args: [values.to as Address, values.erc20transfer.amount],
        }
      },
      onConfirmed: (receipt) => {
        const getWithdrawDone = async () => {
          if (publicClient === undefined) {
            loggers.onUpdate?.({
              title: "Could not fetch token details",
              description:
                "The tokens have been transferred, but could not be decoded for the success message.",
            })
            return
          }

          const erc20Info = await publicClient.multicall({
            contracts: [
              {
                abi: erc20Abi,
                address: values.erc20transfer.tokenContract as Address,
                functionName: "decimals",
              },
              {
                abi: erc20Abi,
                address: values.erc20transfer.tokenContract as Address,
                functionName: "symbol",
              },
            ],
            allowFailure: false,
          })
          setWithdrawDone(
            `Withdrawn ${formatUnits(values.erc20transfer.amount, erc20Info[0])} ${erc20Info[1]} to ${values.to}.`
          )
        }

        getWithdrawDone().catch(console.error)
      },
    })
  }

  if (withdrawDone) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Withdraw succeeded!</CardTitle>
          <CardDescription>{withdrawDone}</CardDescription>
        </CardHeader>
        <CardFooter>
          <Button onClick={() => setWithdrawDone("")}>Withdraw more</Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="erc20transfer"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>ERC20 Transfer</FormLabel>
              <FormControl>
                <div className="flex w-full gap-x-1">
                  <AddressPicker
                    addressName="ERC20 token"
                    selectableAddresses={tokens}
                    value={field.value.tokenContract}
                    onChange={(change) => {
                      field.value.tokenContract = change ?? ""
                      form.trigger("erc20transfer.tokenContract")
                    }}
                    customAllowed={true}
                  />
                  <ERC20BalanceInput
                    token={
                      isAddress(field.value.tokenContract)
                        ? field.value.tokenContract
                        : undefined
                    }
                    value={field.value.amount}
                    onChange={(change) => {
                      field.value.amount = change
                      form.trigger("erc20transfer.amount")
                    }}
                    account={walletClient?.account?.address}
                  />
                </div>
              </FormControl>
              <FormDescription>
                The type and amount of token you would like to withdraw.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="to"
          render={({ field }) => (
            <FormItem className="flex flex-col">
              <FormLabel>Receiver</FormLabel>
              <FormControl>
                <AddressPicker
                  addressName="receiver"
                  value={field.value}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("to")
                  }}
                  customAllowed={true}
                />
              </FormControl>
              <FormDescription>
                The address which the tokens should be send to.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={performingTransaction}>
          Withdraw
        </Button>
      </form>
    </Form>
  )
}
