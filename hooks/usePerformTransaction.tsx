import { useState } from "react"
import {
  isContractCall,
  performTransaction as performTransactionInternal,
  PerformTransactionParameters,
} from "@plopmenz/viem-extensions"
import {
  parseEther,
  type Abi,
  type Account,
  type Chain,
  type ContractFunctionArgs,
  type ContractFunctionName,
  type PublicClient,
  type RpcSchema,
  type Transport,
  type WalletClient,
} from "viem"
import { useChainId, usePublicClient, useSwitchChain } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import { useSettings } from "@/components/context/settings"

import { useLoggers } from "./useLoggers"

export interface UsePerformTransactionProps {
  chainId?: number
}

export function usePerformTransaction(props?: UsePerformTransactionProps) {
  const connectedChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const walletClient = useAbstractWalletClient({ chainId: props?.chainId })
  const publicClient = usePublicClient({ chainId: props?.chainId })
  const loggers = useLoggers(props)
  const { useAccountAbstraction, simulateTransactions } = useSettings()

  let dismiss = () => {}

  const [performingTransaction, setPerformingTransaction] =
    useState<boolean>(false)
  async function performTransaction<
    abi extends Abi | readonly unknown[] = Abi,
    functionName extends ContractFunctionName<
      abi,
      "nonpayable" | "payable"
    > = ContractFunctionName<abi, "nonpayable" | "payable">,
    args extends ContractFunctionArgs<
      abi,
      "nonpayable" | "payable",
      functionName
    > = ContractFunctionArgs<abi, "nonpayable" | "payable", functionName>,
    chain extends Chain = Chain,
    account extends Account = Account,
    pcTransport extends Transport = Transport,
    pcAccountOrAddress extends Account | undefined = undefined,
    pcRpcSchema extends RpcSchema | undefined = undefined,
    wcTransport extends Transport = Transport,
    wcRpcSchema extends RpcSchema | undefined = undefined,
  >(
    params: PerformTransactionParameters<
      abi,
      functionName,
      args,
      chain,
      account,
      pcTransport,
      pcAccountOrAddress,
      pcRpcSchema,
      wcTransport,
      wcRpcSchema
    >
  ) {
    if (props?.chainId !== undefined && connectedChainId !== props.chainId) {
      const switchChainResult = await switchChainAsync?.({
        chainId: props.chainId,
      }).catch((err) => {
        console.error(err)
      })
      if (!switchChainResult || switchChainResult.id !== props.chainId) {
        loggers.onError?.({
          title: "Wrong chain",
          description: `Please switch to ${chains.find((c) => c.id === props.chainId)?.name ?? props.chainId}.`,
        })
        return
      }
    }
    if (performingTransaction) {
      loggers.onError?.({
        title: "Please wait",
        description: "The past transaction is still running.",
      })
      return
    }
    setPerformingTransaction(true)
    await performTransactionInternal<
      abi,
      functionName,
      args,
      chain,
      account,
      pcTransport,
      pcAccountOrAddress,
      pcRpcSchema,
      wcTransport,
      wcRpcSchema
    >({
      loggers: loggers,
      publicClient: publicClient as PublicClient<
        pcTransport,
        chain,
        pcAccountOrAddress,
        pcRpcSchema
      >,
      walletClient: walletClient as any as WalletClient<
        wcTransport,
        chain,
        account,
        wcRpcSchema
      >,
      simulate: simulateTransactions,
      ...params,
      transaction: async () => {
        const tx = await params.transaction()
        if (tx === undefined) {
          return undefined
        }
        if (useAccountAbstraction && walletClient && isContractCall(tx)) {
          // Pretend to have gas
          tx.stateOverride ??= []
          tx.stateOverride.push({
            address: walletClient.account.address,
            balance: parseEther("1"),
          })
        }
        return tx
      },
    }).catch(console.error)
    setPerformingTransaction(false)
  }

  return { performTransaction, performingTransaction, dismiss, loggers }
}
