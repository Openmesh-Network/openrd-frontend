"use client"

import { useEffect, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { useForm } from "react-hook-form"
import { Address, isAddress, parseAbiItem } from "viem"
import { z } from "zod"

import { validAddress } from "@/lib/regex"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
import { Button } from "@/components/ui/button"
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
import {
  TokenMetadataRequest,
  TokenMetadataResponse,
} from "@/app/api/tokenMetadata/route"

const formSchema = z.object({
  tokenContract: z
    .string()
    .regex(validAddress, "ERC20 contract must be a valid address."),
  amount: z.coerce.bigint().min(BigInt(0), "Amount cannot be negative."),
})

export function DonateForm({
  chainId,
  to,
  tokens,
}: {
  chainId: number
  to: Address
  tokens: Address[]
}) {
  const walletClient = useAbstractWalletClient({ chainId })
  const { performTransaction, performingTransaction, loggers } =
    usePerformTransaction({
      chainId,
    })
  const queryClient = useQueryClient()

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      tokenContract: tokens[0],
      amount: BigInt(0),
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Donate funds",
      transaction: async () => {
        if (!isAddress(values.tokenContract)) {
          loggers?.onError?.({
            title: "Error",
            description: `${values.tokenContract} is not a valid address.`,
          })
          return undefined
        }

        return {
          abi: [parseAbiItem("function transfer(address to, uint256 amount)")],
          address: values.tokenContract,
          functionName: "transfer",
          args: [to, values.amount],
        }
      },
      onConfirmed: (receipt) => {
        queryClient
          .invalidateQueries({
            queryKey: [chainId, to, "directBudget"],
          })
          .catch(console.error)
        form.setValue("amount", BigInt(0))
      },
    })
  }

  const [budgetTokens, setBudgetTokens] = useState<SelectableAddresses>({})
  useEffect(() => {
    const getBudgetTokens = async () => {
      const request: TokenMetadataRequest = {
        chainId: chainId,
        addresses: tokens,
      }
      const tokensResponse = await axios.post(
        "/api/tokenMetadata/",
        JSON.stringify(request)
      )

      if (tokensResponse.status === 200) {
        const data = tokensResponse.data as TokenMetadataResponse
        setBudgetTokens(
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
        console.warn(
          `Token metadata fetch failed: ${JSON.stringify(tokensResponse)}`
        )
      }
    }

    getBudgetTokens().catch(console.error)
  }, [chainId, tokens])

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="tokenContract"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Token</FormLabel>
              <FormControl>
                <AddressPicker
                  chainId={chainId}
                  addressName="ERC20 token"
                  selectableAddresses={budgetTokens}
                  value={field.value}
                  onChange={(a) => {
                    field.onChange(a)
                    form.trigger("tokenContract")
                  }}
                />
              </FormControl>
              <FormDescription>The type of token to donate.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <ERC20BalanceInput
                  chainId={chainId}
                  token={form.getValues().tokenContract as Address}
                  value={field.value}
                  onChange={(a) => {
                    field.onChange(a)
                    form.trigger("amount")
                  }}
                  account={walletClient?.account.address}
                  showAvailable={true}
                />
              </FormControl>
              <FormDescription>The amount of tokens to donate.</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={performingTransaction || !walletClient}>
          Donate
        </Button>
        {!walletClient && (
          <div>
            <span>Please log in to donate.</span>
          </div>
        )}
      </form>
    </Form>
  )
}
