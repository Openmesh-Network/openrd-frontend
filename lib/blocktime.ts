import { mainnet, polygon } from "viem/chains"

export function getBlockTime(chainId: number): number {
  switch (chainId) {
    case mainnet.id:
      return 12
    case polygon.id:
      return 2
    default:
      return 12
  }
}
