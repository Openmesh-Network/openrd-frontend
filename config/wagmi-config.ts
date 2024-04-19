import { arbitrumSepolia, mainnet, polygon, sepolia } from "wagmi/chains"

import { siteConfig } from "./site"

export const appName = siteConfig.name
export const appDescription = siteConfig.description
export const appIcon = "https://openrd.plopmenz.com/icon.png" as const
export const appUrl = "https://openrd.plopmenz.com" as const
export const metadata = {
  name: appName,
  description: appDescription,
  url: appUrl,
  icons: [appIcon],
}

export const projectId = "0ec5e8af894898c29bc27a1c4dc11e78" as const
export const chains = [mainnet, sepolia, polygon, arbitrumSepolia] as const
