"use client"

import "@rainbow-me/rainbowkit/styles.css"

import { getDefaultConfig } from "@rainbow-me/rainbowkit"
import { http } from "wagmi"
import { mainnet, polygon, polygonMumbai, sepolia } from "wagmi/chains"

import { siteConfig } from "./site"

export const chains = [mainnet, polygon, polygonMumbai, sepolia] as const
export const defaultChain = mainnet

export const appName = siteConfig.name
export const appDescription = siteConfig.description
export const appIcon = "https://openrd.plopmenz.com/icon.png" as const
export const appUrl = "https://openrd.plopmenz.com" as const
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
