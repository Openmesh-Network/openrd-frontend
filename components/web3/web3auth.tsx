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
    "BMHAMqIuGsNQs7cmzGu4yvsVbyLwT480PuO-Fz-coWA0qbmXtNg-7Wmbv0SVDKfdvE6mmyfC5npRIGHSYvDvWdE"

  const privateKeyProvider = new EthereumPrivateKeyProvider({
    config: { chainConfig: getChainConfig(chains[0]) },
  })

  const web3AuthInstance = new Web3Auth({
    clientId,
    privateKeyProvider,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_MAINNET,
    storageKey: "local",
    enableLogging: true,
  })

  web3AuthInstance.initModal().catch(console.error)

  return web3AuthInstance
}
