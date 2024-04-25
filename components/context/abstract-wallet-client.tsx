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
import { arbitrumSepolia, mainnet, polygon, sepolia } from "viem/chains"
import { useWalletClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { useSettings } from "@/components/context/settings"

const chainSettings: {
  [chainId: number]: {
    BUNDLER_RPC: string
    PAYMASTER_RPC?: string
    ENTRY_POINT: EntryPoint
  }
} = {
  [mainnet.id]: {
    BUNDLER_RPC:
      "https://rpc.zerodev.app/api/v2/bundler/62fda705-23e5-4939-857f-2459ea4343e7",
    // Gas fees are not sponsored
    ENTRY_POINT: ENTRYPOINT_ADDRESS_V07,
  },
  [polygon.id]: {
    BUNDLER_RPC:
      "https://rpc.zerodev.app/api/v2/bundler/377dbd56-c0b9-4988-9463-3cf08d8fd564",
    PAYMASTER_RPC:
      "https://rpc.zerodev.app/api/v2/paymaster/377dbd56-c0b9-4988-9463-3cf08d8fd564",
    ENTRY_POINT: ENTRYPOINT_ADDRESS_V07,
  },
  [sepolia.id]: {
    BUNDLER_RPC: `https://rpc.zerodev.app/api/v2/bundler/8722ba0e-bd7a-432b-9410-136e01c41774`,
    PAYMASTER_RPC: `https://rpc.zerodev.app/api/v2/paymaster/8722ba0e-bd7a-432b-9410-136e01c41774`,
    ENTRY_POINT: ENTRYPOINT_ADDRESS_V07,
  },
  [arbitrumSepolia.id]: {
    BUNDLER_RPC: `https://rpc.zerodev.app/api/v2/bundler/7bd2daf9-729f-49ea-9eae-c73b99bf84ca`,
    PAYMASTER_RPC: `https://rpc.zerodev.app/api/v2/paymaster/7bd2daf9-729f-49ea-9eae-c73b99bf84ca`,
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
      middleware: !settings.PAYMASTER_RPC
        ? undefined
        : {
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
