"use client"

import React, { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { coinbaseWallet, injected, walletConnect } from "@wagmi/connectors"
import { createWeb3Modal } from "@web3modal/wagmi/react"
import { arbitrumSepolia, mainnet, polygon, sepolia } from "viem/chains"
import { createConfig, http, WagmiProvider } from "wagmi"

import { chains, metadata, projectId } from "@/config/wagmi-config"

import Web3AuthConnectorInstance from "./web3auth"

// Setup queryClient
const queryClient = new QueryClient()

const config = createConfig({
  chains,
  ssr: true,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [sepolia.id]: http(),
    [arbitrumSepolia.id]: http(),
  },
  connectors: [
    walletConnect({ projectId, metadata, showQrModal: false }),
    injected({ shimDisconnect: true }),
    coinbaseWallet({
      appName: metadata.name,
      appLogoUrl: metadata.icons[0],
    }),
    Web3AuthConnectorInstance() as any,
  ],
})

createWeb3Modal({
  wagmiConfig: config,
  projectId,
})

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
