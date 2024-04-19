"use client"

import React, { ReactNode } from "react"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { arbitrumSepolia, mainnet, polygon, sepolia } from "viem/chains"
import { createConfig, http, WagmiProvider } from "wagmi"

import { chains } from "@/config/wagmi-config"

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
  connectors: [Web3AuthConnectorInstance() as any],
})

export function Web3Provider({ children }: { children: ReactNode }) {
  return (
    <WagmiProvider config={config} reconnectOnMount={true}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  )
}
