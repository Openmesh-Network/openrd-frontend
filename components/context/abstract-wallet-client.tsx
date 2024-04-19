"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk"
import {
  ENTRYPOINT_ADDRESS_V07,
  walletClientToSmartAccountSigner,
} from "permissionless"
import { EntryPoint } from "permissionless/types"
import { Account, Chain, createPublicClient, http, WalletClient } from "viem"
import { arbitrumSepolia, sepolia } from "viem/chains"
import { useWalletClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { useSettings } from "@/components/context/settings"

const chainSettings: {
  [chainId: number]: {
    BUNDLER_RPC: string
    PAYMASTER_RPC: string
    ENTRY_POINT: EntryPoint
  }
} = {
  [sepolia.id]: {
    BUNDLER_RPC: `https://rpc.zerodev.app/api/v2/bundler/f93016ab-859c-4458-bb75-cd0fa56ca469`,
    PAYMASTER_RPC: `https://rpc.zerodev.app/api/v2/paymaster/f93016ab-859c-4458-bb75-cd0fa56ca469`,
    ENTRY_POINT: ENTRYPOINT_ADDRESS_V07,
  },
  [arbitrumSepolia.id]: {
    BUNDLER_RPC: `https://rpc.zerodev.app/api/v2/bundler/d07724af-3688-4ea0-90a1-e4d6e0b6e451`,
    PAYMASTER_RPC: `https://rpc.zerodev.app/api/v2/paymaster/d07724af-3688-4ea0-90a1-e4d6e0b6e451`,
    ENTRY_POINT: ENTRYPOINT_ADDRESS_V07,
  },
}

interface AbstractWalletClientContextData {
  getAbstractWalletClient: (
    chainId: number,
    walletClient: WalletClient
  ) => Promise<AbstractWalletClient | undefined>
}
const AbstractWalletClientContext =
  createContext<AbstractWalletClientContextData>({
    getAbstractWalletClient: async () => {
      return undefined
    },
  })
export function AbstractWalletClientProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [cache, setCache] = useState<{ [id: string]: AbstractWalletClient }>({})

  const getAbstractWalletClient = async (
    chainId: number,
    walletClient: WalletClient
  ) => {
    if (!walletClient?.account) {
      return undefined
    }
    const id = `${chainId}:${walletClient.account.address}`
    const cached = cache[id]
    if (cached) {
      return cached
    }

    const settings = chainSettings[chainId]
    const chain = chains.find((c) => c.id === chainId)
    if (!settings) {
      // No Account Abstract on this chain
      return undefined
    }

    const publicClient = createPublicClient({
      transport: http(settings.BUNDLER_RPC),
    })

    const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
      signer: walletClientToSmartAccountSigner(walletClient as any),
      entryPoint: settings.ENTRY_POINT,
    })

    const account = await createKernelAccount(publicClient, {
      plugins: {
        sudo: ecdsaValidator,
      },
      entryPoint: settings.ENTRY_POINT,
    })

    const kernelClient = createKernelAccountClient({
      account,
      chain,
      entryPoint: settings.ENTRY_POINT,
      bundlerTransport: http(settings.BUNDLER_RPC),
      middleware: {
        sponsorUserOperation: async ({ userOperation }) => {
          const zerodevPaymaster = createZeroDevPaymasterClient({
            chain,
            entryPoint: settings.ENTRY_POINT,
            transport: http(settings.PAYMASTER_RPC),
          })
          return zerodevPaymaster.sponsorUserOperation({
            userOperation,
            entryPoint: settings.ENTRY_POINT,
          })
        },
      },
    })

    setCache({ ...cache, [id]: kernelClient })
    return kernelClient
  }

  return (
    <AbstractWalletClientContext.Provider value={{ getAbstractWalletClient }}>
      {children}
    </AbstractWalletClientContext.Provider>
  )
}

export interface AbstractWalletClientSettings {
  chainId?: number
}
export interface AbstractWalletClient
  extends Pick<
    WalletClient,
    | "account"
    | "chain"
    | "sendTransaction"
    | "signMessage"
    | "signTypedData"
    | "writeContract"
  > {
  account: Account
  chain: Chain
}
export function useAbstractWalletClient(
  settings?: AbstractWalletClientSettings
) {
  const { data: walletClient } = useWalletClient(settings)
  const { useAccountAbstraction } = useSettings()
  const { getAbstractWalletClient } = useContext(AbstractWalletClientContext)
  const [abstractWalletClient, setAbstractWalletClient] = useState<
    AbstractWalletClient | undefined
  >(undefined)

  useEffect(() => {
    const chainId = settings?.chainId ?? walletClient?.chain?.id
    if (!chainId || !walletClient) {
      setAbstractWalletClient(undefined)
      return
    }

    getAbstractWalletClient(chainId, walletClient)
      .then(setAbstractWalletClient)
      .catch(console.error)
  }, [walletClient, settings])

  return !useAccountAbstraction
    ? walletClient
    : abstractWalletClient ?? walletClient
}
