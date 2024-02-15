import { parseBigInt } from "@/openrd-indexer/utils/parseBigInt"
import {
  Alchemy,
  TokenMetadataResponse as AlchemyTokenMetadataResponse,
  GetTokensForOwnerResponse,
  Network,
  OwnedToken,
  TokenBalancesResponse,
} from "alchemy-sdk"
import axios from "axios"
import { Address } from "viem"

import {
  TokenMetadataRequest,
  TokenMetadataResponse,
} from "../tokenMetadata/route"
import { ITokenProvider } from "./ITokenProvider"
import { TokensRequest, TokensResponse } from "./route"

export class AlchemyProvider implements ITokenProvider {
  private alchemyInstances: { [chainId: number]: Alchemy } = {}
  private apiKey

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  private alchemyNetwork(chainId: number): Network {
    switch (chainId) {
      case 1:
        return Network.ETH_MAINNET
      case 137:
        return Network.MATIC_MAINNET
      case 80001:
        return Network.MATIC_MUMBAI
      case 11155111:
        return Network.ETH_SEPOLIA
    }

    throw new Error(`Unknown Alchemy network for chain ${chainId}`)
  }

  private getAlchemy(chainId: number): Alchemy {
    if (!this.alchemyInstances[chainId]) {
      this.alchemyInstances[chainId] = new Alchemy({
        apiKey: this.apiKey,
        network: this.alchemyNetwork(chainId),
        batchRequests: true,
      })
    }

    return this.alchemyInstances[chainId]
  }

  private id = 1
  public async handleTokensRequest(
    request: TokensRequest
  ): Promise<TokensResponse> {
    //const alchemy = this.getAlchemy(request.chainId)

    let alchemyTokens = [] as OwnedToken[]
    // https://github.com/alchemyplatform/alchemy-sdk-js/issues/400
    // let alchemyResponse: GetTokensForOwnerResponse | undefined
    // do {
    //   alchemyResponse = await alchemy.core.getTokensForOwner(request.address, {
    //     pageKey: alchemyResponse?.pageKey,
    //   })
    //   alchemyTokens.push(
    //     ...alchemyResponse.tokens.filter((t) => t.logo !== undefined)
    //   ) // Only return tokens with a logo as a spam filter
    // } while (alchemyResponse.pageKey)
    const url = `https://${this.alchemyNetwork(request.chainId)}.g.alchemy.com/v2/${this.apiKey}`
    const tokenBalancesResponse = (
      await axios.post(url, {
        jsonrpc: "2.0",
        method: "alchemy_getTokenBalances",
        params: [`${request.address}`, "erc20"],
        id: this.id++,
      })
    ).data.result as TokenBalancesResponse
    const tokenMetadataResponse = await this.handleTokenMetadataRequest({
      chainId: request.chainId,
      addresses: tokenBalancesResponse.tokenBalances.map(
        (token) => token.contractAddress as Address
      ),
    })
    alchemyTokens.push(
      ...tokenMetadataResponse.tokens.filter((t) => t.logo !== undefined)
    )
    const response: TokensResponse = {
      tokens: alchemyTokens.map((token) => {
        return {
          contractAddress: token.contractAddress as Address,
          name: token.name,
          symbol: token.symbol,
          logo: token.logo,
        }
      }),
    }
    return response
  }

  public async handleTokenMetadataRequest(
    request: TokenMetadataRequest
  ): Promise<TokenMetadataResponse> {
    const url = `https://${this.alchemyNetwork(request.chainId)}.g.alchemy.com/v2/${this.apiKey}`
    const tokenMetadataResponse = (
      await axios.post(
        url,
        request.addresses.map((address) => {
          return {
            jsonrpc: "2.0",
            method: "alchemy_getTokenMetadata",
            params: [address],
            id: this.id++,
          }
        })
      )
    ).data.map((d: any) => d.result) as AlchemyTokenMetadataResponse[]
    return {
      tokens: request.addresses.map((address, i) => {
        return {
          contractAddress: address,
          name: tokenMetadataResponse[i].name ?? undefined, // null -> undefined
          symbol: tokenMetadataResponse[i].symbol ?? undefined,
          logo: tokenMetadataResponse[i].logo ?? undefined,
        }
      }),
    }
  }
}
