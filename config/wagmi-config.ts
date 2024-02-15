"use client"

import "@rainbow-me/rainbowkit/styles.css"

import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { http } from "wagmi"
import { mainnet, polygon, polygonMumbai, sepolia } from "wagmi/chains"

export const chains = [mainnet, polygon, polygonMumbai, sepolia] as const
export const defaultChain = mainnet

export const appName = "OpenR&D" as const
export const appDescription =
  "Open-source platform designed to empower decentralized teams to collaborate seamlessly." as const
export const appIcon = "https://openrd.openmesh.network/icon.png" as const
export const appUrl = "https://openrd.openmesh.network" as const
const projectId = "0ec5e8af894898c29bc27a1c4dc11e78" as const // WalletConnect

export const config = getDefaultConfig({
  appName: appName,
  projectId: projectId,
  appDescription: appDescription,
  appIcon: appIcon,
  appUrl: appUrl,
  chains: chains,
  transports: {
    [mainnet.id]: http(),
    [polygon.id]: http(),
    [polygonMumbai.id]: http(),
    [sepolia.id]: http(),
  },
})
