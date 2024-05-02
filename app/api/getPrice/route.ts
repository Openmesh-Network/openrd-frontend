import { ERC20Transfer } from "@/openrd-indexer/types/tasks"
import { publicClients } from "@/openrd-indexer/utils/chain-cache"
import { getPrice } from "@/openrd-indexer/utils/get-token-price"
import { reviver } from "@/openrd-indexer/utils/json"
import { createPublicClient, http } from "viem"

import { chains } from "@/config/wagmi-config"

export interface GetPriceRequest {
  chainId: number
  nativeBudget: bigint
  budget: ERC20Transfer[]
}

export interface GetPriceResponse {
  price: number
}

export async function POST(req: Request) {
  try {
    const params = JSON.parse(await req.text(), reviver) as GetPriceRequest
    const chain = chains.find((c) => c.id === params.chainId)
    if (!chain) {
      return Response.json(
        { error: `Chain with id ${params.chainId} not found.` },
        { status: 404 }
      )
    }
    if (!publicClients[chain.id]) {
      publicClients[chain.id] = createPublicClient({
        chain: chain,
        transport: http(),
      })
    }
    const response = await getPrice(chain, params.nativeBudget, params.budget)
    return Response.json({ price: response }, { status: 200 })
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? JSON.stringify(error) },
      { status: 500 }
    )
  }
}
