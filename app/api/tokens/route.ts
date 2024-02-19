import { Address } from "viem"

import { AlchemyProvider } from "./alchemy-provider"
import { ITokenProvider } from "./ITokenProvider"

export interface TokensRequest {
  chainId: number
  address: Address
}

export interface Token {
  contractAddress: Address
  name?: string
  symbol?: string
  logo?: string
}

export interface TokensResponse {
  tokens: Token[]
}

let provider: ITokenProvider | undefined

function getProvider(): ITokenProvider {
  if (!provider) {
    if (!process.env.ALCHEMY_API_KEY) {
      throw new Error("Alchemy API key not set!")
    }
    provider = new AlchemyProvider(process.env.ALCHEMY_API_KEY)
  }
  return provider
}

export async function POST(req: Request) {
  try {
    const params = JSON.parse(await req.text()) as TokensRequest
    const response = await getProvider().handleTokensRequest(params)
    return Response.json(response, { status: 200 })
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? JSON.stringify(error) },
      { status: 500 }
    )
  }
}
