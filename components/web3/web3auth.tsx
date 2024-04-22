import { WEB3AUTH_NETWORK } from "@web3auth/base"
import { EthereumPrivateKeyProvider } from "@web3auth/ethereum-provider"
import { Web3Auth } from "@web3auth/modal"

import { appName, chains } from "@/config/wagmi-config"
import {
  getChainConfig,
  Web3AuthConnector,
} from "@/lib/web3auth-wagmi-connector"

// Source: https://web3auth.io/docs/sdk/pnp/web/wagmi-connector
export default function Web3AuthConnectorInstance() {
  return Web3AuthConnector({
    web3AuthInstance: getWeb3Auth(),
  })
}

function getWeb3Auth(): Web3Auth {
  const clientId =
    "BN9fUSi9sm0PSaT1opW5MF_a4PuaeYqoYO4XHgNu2GIkEpivpwnUWT1tFI_pYZUyQ4t7LMug8FXdwcXPFtcM5Lk"

  const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig: getChainConfig(chains[0]) },
  })

  const web3AuthInstance = new Web3Auth({
    clientId,
    privateKeyProvider,
    uiConfig: {
      appName,
      mode: "dark",
    },
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    storageKey: "local",
    enableLogging: true,
  })

  web3AuthInstance.initModal().catch(console.error)

  return web3AuthInstance
}
