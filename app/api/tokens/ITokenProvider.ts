import {
  TokenMetadataRequest,
  TokenMetadataResponse,
} from "../tokenMetadata/route"
import { TokensRequest, TokensResponse } from "./route"

export interface ITokenProvider {
  handleTokensRequest: (request: TokensRequest) => Promise<TokensResponse>
  handleTokenMetadataRequest: (
    request: TokenMetadataRequest
  ) => Promise<TokenMetadataResponse>
}
