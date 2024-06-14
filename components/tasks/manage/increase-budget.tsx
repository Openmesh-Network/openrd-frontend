"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import { ERC20Transfer } from "@/openrd-indexer/types/tasks"
import { zodResolver } from "@hookform/resolvers/zod"
import axios from "axios"
import { useFieldArray, useForm } from "react-hook-form"
import { Address } from "viem"
import { z } from "zod"

import { validAddress } from "@/lib/regex"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
import { Button } from "@/components/ui/button"
import { ErrorWrapper } from "@/components/ui/error-wrapper"
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
import { ERC20AllowanceCheck } from "@/components/web3/erc20-allowance-check"
import { ERC20BalanceInput } from "@/components/web3/erc20-balance-input"
import { NativeBalanceInput } from "@/components/web3/native-balance-input"
import {
  TokenMetadataRequest,
  TokenMetadataResponse,
} from "@/app/api/tokenMetadata/route"

const formSchema = z.object({
  nativeBudget: z.coerce
    .bigint()
    .min(BigInt(0), "Native budget cannot be negative."),
  budget: z
    .object({
      tokenContract: z
        .string()
        .regex(validAddress, "ERC20 contract must be a valid address."),
      amount: z.coerce.bigint().min(BigInt(0), "Amount cannot be negative."),
    })
    .array(),
})

export function IncreaseBudget({
  chainId,
  taskId,
  nativeBudget,
  budget,
  refresh,
}: {
  chainId: number
  taskId: bigint
  nativeBudget: bigint
  budget: ERC20Transfer[]
  refresh: () => Promise<void>
}) {
  const walletClient = useAbstractWalletClient({ chainId })
  const { performTransaction, performingTransaction } = usePerformTransaction({
    chainId,
  })

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nativeBudget: nativeBudget,
      budget: budget,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    await performTransaction({
      transactionName: "Increase budget",
      transaction: async () => {
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "increaseBudget",
          args: [
            taskId,
            values.budget.map((b, i) => b.amount - budget[i].amount),
          ],
          value: values.nativeBudget - nativeBudget,
        }
      },
      onConfirmed: (receipt) => {
        refresh()
      },
    })
  }

  const [budgetTokens, setBudgetTokens] = useState<SelectableAddresses>({})
  useEffect(() => {
    const getBudgetTokens = async () => {
      const request: TokenMetadataRequest = {
        chainId: chainId,
        addresses: budget.map((b) => b.tokenContract),
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
  }, [chainId, budget])

  const {
    fields: newBudget,
    append: appendBudget,
    remove: removeBudget,
    update: updateBudget,
  } = useFieldArray({
    name: "budget",
    control: form.control,
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        <FormField
          control={form.control}
          name="nativeBudget"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Native Budget</FormLabel>
              <FormControl>
                <NativeBalanceInput
                  chainId={chainId}
                  {...field}
                  onChange={(change) => {
                    field.onChange(change)
                    form.trigger("nativeBudget")
                  }}
                  account={walletClient?.account?.address}
                />
              </FormControl>
              <FormDescription>
                The amount of native currency that is available as budget for
                this task (ETH on Ethereum, MATIC on Polygon).
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormItem>
          <FormLabel>ERC20 Budget</FormLabel>
          <FormControl>
            <div>
              {newBudget.map((budgetItem, i) => (
                <ErrorWrapper
                  key={i}
                  error={form.formState.errors.budget?.at?.(i)}
                >
                  <div className="flex w-full gap-x-1">
                    <AddressPicker
                      chainId={chainId}
                      addressName="ERC20 token"
                      selectableAddresses={{
                        [budgetItem.tokenContract]:
                          budgetTokens[budgetItem.tokenContract as Address],
                      }}
                      value={budgetItem.tokenContract}
                    />
                    <ERC20BalanceInput
                      chainId={chainId}
                      token={budgetItem.tokenContract as Address}
                      min={budget[i].amount}
                      value={budgetItem.amount}
                      onChange={(change) => {
                        updateBudget(i, { ...budgetItem, amount: change })
                        form.trigger("budget")
                      }}
                      account={walletClient?.account?.address}
                    />
                  </div>
                  <ERC20AllowanceCheck
                    spender={TasksContract.address}
                    token={budgetItem.tokenContract as Address}
                    amount={budgetItem.amount - budget[i].amount}
                    account={walletClient?.account?.address}
                  />
                </ErrorWrapper>
              ))}
            </div>
          </FormControl>
          <FormDescription>
            The amount of ERC20 currency that is available as budget for this
            task. This can be any token, such as USDT, USDC, or WETH.
          </FormDescription>
          <FormMessage />
        </FormItem>
        <Button type="submit" disabled={performingTransaction}>
          Increase budget
        </Button>
      </form>
    </Form>
  )
}
