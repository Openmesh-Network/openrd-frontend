import type {
  BalancesResponse,
  // Chains,
  // CovalentClient,
} from "@covalenthq/client-sdk"
import axios from "axios"
import { Address } from "viem"

import {
  TokenMetadataRequest,
  TokenMetadataResponse,
} from "../tokenMetadata/route"
import { ITokenProvider } from "./ITokenProvider"
import { TokensRequest, TokensResponse } from "./route"

export class CovalentProvider implements ITokenProvider {
  //private covalentClient: CovalentClient
  private apiKey: string

  constructor(apiKey: string) {
    // SDK gives error: Module not found: ESM packages (date-fns) need to be imported. Use 'import' to reference the package instead. https://nextjs.org/docs/messages/import-esm-externals
    //this.covalentClient = new CovalentClient(apiKey)
    this.apiKey = apiKey
  }

  private covalentChain(chainId: number): Chains {
    switch (chainId) {
      case 1:
        return Chains.ETH_MAINNET
      case 137:
        return Chains.MATIC_MAINNET
      case 80001:
        return Chains.MATIC_MUMBAI
      case 11155111:
        return Chains.ETH_SEPOLIA
    }

    throw new Error(`Unknown Covalent chain for chain ${chainId}`)
  }

  public async handleTokensRequest(
    request: TokensRequest
  ): Promise<TokensResponse> {
    const covalentResponse =
      // await this.covalentClient.BalanceService.getTokenBalancesForWalletAddress(
      //   this.covalentChain(request.chainId),
      //   request.address,
      //   { noSpam: true }
      // )
      (
        await axios.get(
          `https://api.covalenthq.com/v1/${this.covalentChain(request.chainId)}/address/${request.address}/balances_v2/`,
          {
            headers: {
              Authorization: `Basic ${btoa(this.apiKey + ":")}`,
            },
            params: {
              "no-spam": true,
            },
          }
        )
      ).data as { data: BalancesResponse }
    const response: TokensResponse = {
      tokens: covalentResponse.data.items.map((token) => {
        return {
          contractAddress: token.contract_address as Address,
          name: token.contract_name,
          symbol: token.contract_ticker_symbol,
          logo: token.logo_url,
        }
      }),
    }
    return response
  }

  public async handleTokenMetadataRequest(
    request: TokenMetadataRequest
  ): Promise<TokenMetadataResponse> {
    throw new Error("Unimplemented")
  }
}

enum Chains {
  BTC_MAINNET = "btc-mainnet",
  ETH_MAINNET = "eth-mainnet",
  MATIC_MAINNET = "matic-mainnet",
  BSC_MAINNET = "bsc-mainnet",
  AVALANCHE_MAINNET = "avalanche-mainnet",
  OPTIMISM_MAINNET = "optimism-mainnet",
  FANTOM_MAINNET = "fantom-mainnet",
  MOONBEAM_MAINNET = "moonbeam-mainnet",
  MOONBEAM_MOONRIVER = "moonbeam-moonriver",
  RSK_MAINNET = "rsk-mainnet",
  ARBITRUM_MAINNET = "arbitrum-mainnet",
  PALM_MAINNET = "palm-mainnet",
  KLAYTN_MAINNET = "klaytn-mainnet",
  HECO_MAINNET = "heco-mainnet",
  NERVOS_GODWOKEN_MAINNET = "nervos-godwoken-mainnet",
  AXIE_MAINNET = "axie-mainnet",
  EVMOS_MAINNET = "evmos-mainnet",
  ASTAR_MAINNET = "astar-mainnet",
  IOTEX_MAINNET = "iotex-mainnet",
  HARMONY_MAINNET = "harmony-mainnet",
  CRONOS_MAINNET = "cronos-mainnet",
  AURORA_MAINNET = "aurora-mainnet",
  EMERALD_PARATIME_MAINNET = "emerald-paratime-mainnet",
  BOBA_MAINNET = "boba-mainnet",
  ETH_GOERLI = "eth-goerli",
  MATIC_MUMBAI = "matic-mumbai",
  AVALANCHE_TESTNET = "avalanche-testnet",
  BSC_TESTNET = "bsc-testnet",
  MOONBEAM_MOONBASE_ALPHA = "moonbeam-moonbase-alpha",
  RSK_TESTNET = "rsk-testnet",
  ARBITRUM_GOERLI = "arbitrum-goerli",
  FANTOM_TESTNET = "fantom-testnet",
  PALM_TESTNET = "palm-testnet",
  HECO_TESTNET = "heco-testnet",
  NERVOS_GODWOKEN_TESTNET = "nervos-godwoken-testnet",
  EVMOS_TESTNET = "evmos-testnet",
  ASTAR_SHIDEN = "astar-shiden",
  IOTEX_TESTNET = "iotex-testnet",
  HARMONY_TESTNET = "harmony-testnet",
  AURORA_TESTNET = "aurora-testnet",
  SCROLL_SEPOLIA_TESTNET = "scroll-sepolia-testnet",
  COVALENT_INTERNAL_NETWORK_V1 = "covalent-internal-network-v1",
  DEFI_KINGDOMS_MAINNET = "defi-kingdoms-mainnet",
  SWIMMER_MAINNET = "swimmer-mainnet",
  BOBA_AVALANCHE_MAINNET = "boba-avalanche-mainnet",
  BOBA_BOBABEAM_MAINNET = "boba-bobabeam-mainnet",
  BOBA_BNB_MAINNET = "boba-bnb-mainnet",
  BOBA_RINKEBY_TESTNET = "boba-rinkeby-testnet",
  BOBA_BOBABASE_TESTNET = "boba-bobabase-testnet",
  BOBA_BNB_TESTNET = "boba-bnb-testnet",
  BOBA_AVALANCHE_TESTNET = "boba-avalanche-testnet",
  KLAYTN_TESTNET = "klaytn-testnet",
  GATHER_MAINNET = "gather-mainnet",
  GATHER_TESTNET = "gather-testnet",
  SKALE_CALYPSO = "skale-calypso",
  SKALE_MAINNET = "skale-mainnet",
  SKALE_RAZOR = "skale-razor",
  AVALANCHE_DEXALOT_MAINNET = "avalanche-dexalot-mainnet",
  SKALE_OMNUS = "skale-omnus",
  AVALANCHE_DEXALOT_TESTNET = "avalanche-dexalot-testnet",
  ASTAR_SHIBUYA = "astar-shibuya",
  CRONOS_TESTNET = "cronos-testnet",
  DEFI_KINGDOMS_TESTNET = "defi-kingdoms-testnet",
  METIS_MAINNET = "metis-mainnet",
  METIS_STARDUST = "metis-stardust",
  MILKOMEDA_A1_MAINNET = "milkomeda-a1-mainnet",
  MILKOMEDA_A1_DEVNET = "milkomeda-a1-devnet",
  MILKOMEDA_C1_MAINNET = "milkomeda-c1-mainnet",
  MILKOMEDA_C1_DEVNET = "milkomeda-c1-devnet",
  SWIMMER_TESTNET = "swimmer-testnet",
  SOLANA_MAINNET = "solana-mainnet",
  SKALE_EUROPA = "skale-europa",
  METER_MAINNET = "meter-mainnet",
  METER_TESTNET = "meter-testnet",
  SKALE_EXORDE = "skale-exorde",
  BOBA_GOERLI = "boba-goerli",
  NEON_TESTNET = "neon-testnet",
  SKALE_STAGING_UUM = "skale-staging-uum",
  SKALE_STAGING_LCC = "skale-staging-lcc",
  ARBITRUM_NOVA_MAINNET = "arbitrum-nova-mainnet",
  CANTO_MAINNET = "canto-mainnet",
  BITTORRENT_MAINNET = "bittorrent-mainnet",
  BITTORRENT_TESTNET = "bittorrent-testnet",
  FLARENETWORKS_FLARE_MAINNET = "flarenetworks-flare-mainnet",
  FLARENETWORKS_FLARE_TESTNET = "flarenetworks-flare-testnet",
  FLARENETWORKS_CANARY_MAINNET = "flarenetworks-canary-mainnet",
  FLARENETWORKS_CANARY_TESTNET = "flarenetworks-canary-testnet",
  KCC_MAINNET = "kcc-mainnet",
  KCC_TESTNET = "kcc-testnet",
  POLYGON_ZKEVM_TESTNET = "polygon-zkevm-testnet",
  LINEA_TESTNET = "linea-testnet",
  BASE_TESTNET = "base-testnet",
  MANTLE_TESTNET = "mantle-testnet",
  SCROLL_ALPHA_TESTNET = "scroll-alpha-testnet",
  OASYS_MAINNET = "oasys-mainnet",
  OASYS_TESTNET = "oasys-testnet",
  FINDORA_MAINNET = "findora-mainnet",
  FINDORA_FORGE_TESTNET = "findora-forge-testnet",
  SX_MAINNET = "sx-mainnet",
  OASIS_SAPPHIRE_MAINNET = "oasis-sapphire-mainnet",
  OASIS_SAPPHIRE_TESTNET = "oasis-sapphire-testnet",
  OPTIMISM_GOERLI = "optimism-goerli",
  POLYGON_ZKEVM_MAINNET = "polygon-zkevm-mainnet",
  HORIZEN_YUMA_TESTNET = "horizen-yuma-testnet",
  CLV_PARACHAIN = "clv-parachain",
  ENERGI_MAINNET = "energi-mainnet",
  ENERGI_TESTNET = "energi-testnet",
  HORIZEN_GOBI_TESTNET = "horizen-gobi-testnet",
  ETH_SEPOLIA = "eth-sepolia",
  SKALE_NEBULA = "skale-nebula",
  SKALE_BATTLEGROUNDS = "skale-battleground",
  AVALANCHE_MELD_TESTNET = "avalanche-meld-testnet",
  GUNZILLA_TESTNET = "gunzilla-testnet",
  ULTRON_MAINNET = "ultron-mainnet",
  ULTRON_TESTNET = "ultron-testnet",
  ZORA_MAINNET = "zora-mainnet",
  ZORA_TESTNET = "zora-testnet",
  NEON_MAINNET = "neon-mainnet",
  AVALANCHE_SHRAPNEL_MAINNET = "avalanche-shrapnel-mainnet",
  BASE_MAINNET = "base-mainnet",
  MANTLE_MAINNET = "mantle-mainnet",
  AVALANCHE_LOCO_LEGENDS_MAINNET = "avalanche-loco-legends-mainnet",
  LINEA_MAINNET = "linea-mainnet",
  HORIZEN_EON_MAINNET = "horizen-eon-mainnet",
  AVALANCHE_NUMBERS = "avalanche-numbers",
  AVALANCHE_DOS = "avalanche-dos",
  AVALANCHE_STEP_NETWORK = "avalanche-step-network",
  AVALANCHE_XPLUS = "avalanche-xplus",
  AVALANCHE_XANACHAIN = "avalanche-xanachain",
  AVALANCHE_MELD_MAINNET = "avalanche-meld-mainnet",
  OPSIDE_PUBLIC_ZKEVM = "opside-public-zkevm",
  OPSIDE_LAW_CHAIN = "opside-law-chain",
  AVALANCHE_SHRAPNEL_TESTNET = "avalanche-shrapnel-testnet",
  AVALANCHE_LOCO_LEGENDS_TESTNET = "avalanche-loco-legends-testnet",
  OPSIDE_CB_ZKEVM = "opside-cb-zkevm",
  OPSIDE_PRE_ALPHA_TESTNET = "opside-pre-alpha-testnet",
  OPSIDE_ERA7 = "opside-era7",
  OPSIDE_XTHRILL = "opside-xthrill",
  ZKSYNC_MAINNET = "zksync-mainnet",
  METIS_TESTNET = "metis-testnet",
  ZKSYNC_TESTNET = "zksync-testnet",
  AVALANCHE_BLITZ_TESTNET = "avalanche-blitz-testnet",
  AVALANCHE_D_CHAIN_TESTNET = "avalanche-d-chain-testnet",
  AVALANCHE_GREEN_DOT_TESTNET = "avalanche-green-dot-testnet",
  AVALANCHE_MINTARA_TESTNET = "avalanche-mintara-testnet",
  AVALANCHE_BEAM_TESTNET = "avalanche-beam-testnet",
  BNB_META_APES_MAINNET = "bnb-meta-apes-mainnet",
  BNB_ANTIMATTER_MAINNET = "bnb-antimatter-mainnet",
  BNB_ANTIMATTER_TESTNET = "bnb-antimatter-testnet",
  BNB_OPBNB_TESTNET = "bnb-opbnb-testnet",
  OPSIDE_DEBOX = "opside-debox",
  OPSIDE_JACKBOT = "opside-jackbot",
  OPSIDE_ODX_ZKEVM_TESTNET = "opside-odx-zkevm-testnet",
  OPSIDE_READON_CONTENT_TESTNET = "opside-readon-content-testnet",
  OPSIDE_RELATION = "opside-relation",
  OPSIDE_SOQUEST_ZKEVM = "opside-soquest-zkevm",
  OPSIDE_VIP3 = "opside-vip3",
  OPSIDE_ZKMETA = "opside-zkmeta",
  AVALANCHE_PULSAR_TESTNET = "avalanche-pulsar-testnet",
  AVALANCHE_UPTN = "avalanche-uptn",
  BNB_FNCY_MAINNET = "bnb-fncy-mainnet",
  ZETACHAIN_TESTNET = "zetachain-testnet",
  KINTO_TESTNET = "kinto-testnet",
  MODE_TESTNET = "mode-testnet",
  LOOT_MAINNET = "loot-mainnet",
  BNB_FNCY_TESTNET = "bnb-fncy-testnet",
  MANTA_TESTNET = "manta-testnet",
  PGN_MAINNET = "pgn-mainnet",
  PGN_TESTNET = "pgn-testnet",
  GNOSIS_MAINNET = "gnosis-mainnet",
  GNOSIS_TESTNET = "gnosis-testnet",
  ROLLUX_MAINNET = "rollux-mainnet",
  ROLLUX_TESTNET = "rollux-testnet",
  TAIKO_JOLNIR_TESTNET = "taiko-jolnir-testnet",
  OPTIMISM_SEPOLIA = "optimism-sepolia",
  BNB_OPBNB_MAINNET = "bnb-opbnb-mainnet",
  TELOS_MAINNET = "telos-mainnet",
  TELOS_TESTNET = "telos-testnet",
  AVALANCHE_HUBBLE_EXCHANGE_TESTNET = "avalanche-hubble-exchange-testnet",
  AVALANCHE_MIHO_TESTNET = "avalanche-miho-testnet",
  AVALANCHE_BULLETIN_TESTNET = "avalanche-bulletin-testnet",
  AVALANCHE_KIWI_TESTNET = "avalanche-kiwi-testnet",
  AVALANCHE_HERO_TESTNET = "avalanche-hero-testnet",
  AVALANCHE_AVACLOUD_TESTNET = "avalanche-avacloud-testnet",
  AVALANCHE_THIRDWEB_TESTNET = "avalanche-thirdweb-testnet",
  AVALANCHE_MONDRIAN_TESTNET = "avalanche-mondrian-testnet",
  AVALANCHE_CONDUIT_TESTNET = "avalanche-conduit-testnet",
  AVALANCHE_NMAC_TESTNET = "avalanche-nmac-testnet",
  AVALANCHE_ORDERLY_TESTNET = "avalanche-orderly-testnet",
  AVALANCHE_AMPLIFY_TESTNET = "avalanche-amplify-testnet",
  AVALANCHE_MIRAI_TESTNET = "avalanche-mirai-testnet",
  AVALANCHE_WAGMI_TESTNET = "avalanche-wagmi-testnet",
  AVALANCHE_PLAYA3ULL_TESTNET = "avalanche-playa3ull-testnet",
  AVALANCHE_BEAM_MAINNET = "avalanche-beam-mainnet",
  SCROLL_MAINNET = "scroll-mainnet",
  ETH_HOLESKY = "eth-holesky",
}
