import { Address } from "viem"

import { AlchemyProvider } from "../tokens/alchemy-provider"
import { ITokenProvider } from "../tokens/ITokenProvider"
import { Token } from "../tokens/route"

export interface TokenMetadataRequest {
  chainId: number
  addresses: Address[]
}

export interface TokenMetadataResponse {
  tokens: Token[]
}

let provider: ITokenProvider | undefined

function getProvider(): ITokenProvider {
  if (!provider) {
    if (!process.env.ALCHEMY_API_KEY) {
      throw new Error("Covalent API key not set!")
    }
    provider = new AlchemyProvider(process.env.ALCHEMY_API_KEY)
  }
  return provider
}

export async function POST(req: Request) {
  try {
    const params = JSON.parse(await req.text()) as TokenMetadataRequest
    const response = await getProvider().handleTokenMetadataRequest(params)
    return Response.json(response, { status: 200 })
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? JSON.stringify(error) },
      { status: 500 }
    )
  }
}
