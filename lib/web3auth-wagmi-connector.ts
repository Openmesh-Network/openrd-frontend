import { ChainNotConfiguredError, createConnector } from "@wagmi/core"
import type { IProvider, IWeb3Auth, WALLET_ADAPTER_TYPE } from "@web3auth/base"
import * as pkg from "@web3auth/base"
import type { IWeb3AuthModal, ModalConfig } from "@web3auth/modal"
import type { OpenloginLoginParams } from "@web3auth/openlogin-adapter"
import {
  Address,
  Chain,
  getAddress,
  SwitchChainError,
  UserRejectedRequestError,
  zeroAddress,
} from "viem"

export interface Web3AuthConnectorParams {
  web3AuthInstance: IWeb3Auth | IWeb3AuthModal
  loginParams?: OpenloginLoginParams
  modalConfig?: Record<WALLET_ADAPTER_TYPE, ModalConfig>
}

//Source: https://github.com/Web3Auth/web3auth-wagmi-connector/blob/master/src/lib/connector.ts
export type Provider = IProvider

const { ADAPTER_STATUS, CHAIN_NAMESPACES, WALLET_ADAPTERS, log } = pkg

function isIWeb3AuthModal(
  obj: IWeb3Auth | IWeb3AuthModal
): obj is IWeb3AuthModal {
  return typeof (obj as IWeb3AuthModal).initModal !== "undefined"
}

export function getChainConfig(chain: Chain) {
  const chainConfig = {
    chainNamespace: CHAIN_NAMESPACES.EIP155,
    chainId: "0x" + chain.id.toString(16),
    rpcTarget: chain.rpcUrls.default.http[0], // This is the public RPC we have added, please pass on your own endpoint while creating an app
    displayName: chain.name,
    tickerName: chain.nativeCurrency?.name,
    ticker: chain.nativeCurrency?.symbol,
    decimals: chain.nativeCurrency?.decimals,
    blockExplorerUrl: chain.blockExplorers?.default.url[0],
    isTestnet: chain.testnet,
  }
  return chainConfig
}

export function Web3AuthConnector(parameters: Web3AuthConnectorParams) {
  let walletProvider: Provider | null = null

  const { web3AuthInstance, loginParams, modalConfig } = parameters

  return createConnector<Provider>((config) => ({
    id: "web3auth",
    name: "Web3Auth",
    type: "Web3Auth",
    async connect({ chainId } = {}) {
      try {
        config.emitter.emit("message", {
          type: "connecting",
        })
        const provider = await this.getProvider()

        provider.on("accountsChanged", this.onAccountsChanged)
        provider.on("chainChanged", this.onChainChanged)
        provider.on("disconnect", this.onDisconnect.bind(this))

        if (!web3AuthInstance.connected) {
          if (isIWeb3AuthModal(web3AuthInstance)) {
            await web3AuthInstance.connect()
          } else if (loginParams) {
            await web3AuthInstance.connectTo(
              WALLET_ADAPTERS.OPENLOGIN,
              loginParams
            )
          } else {
            log.error(
              "please provide valid loginParams when using @web3auth/no-modal"
            )
            throw new UserRejectedRequestError(
              "please provide valid loginParams when using @web3auth/no-modal" as unknown as Error
            )
          }
        }

        let currentChainId = await this.getChainId()
        if (chainId && currentChainId !== chainId) {
          const chain = await this.switchChain!({ chainId }).catch((error) => {
            if (error.code === UserRejectedRequestError.code) throw error
            return { id: currentChainId }
          })
          currentChainId = chain?.id ?? currentChainId
        }

        const accounts = await this.getAccounts()

        return { accounts, chainId: currentChainId }
      } catch (error) {
        log.error("error while connecting", error)
        this.onDisconnect()
        throw new UserRejectedRequestError(
          "Something went wrong" as unknown as Error
        )
      }
    },
    async getAccounts(): Promise<Address[]> {
      const provider = await this.getProvider()
      return (
        (
          await provider?.request<unknown, string[]>({
            method: "eth_accounts",
          })
        )?.map((x) => (x ? getAddress(x) : zeroAddress)) ?? []
      )
    },
    async getChainId(): Promise<number> {
      const provider = await this.getProvider()
      const chainId = await provider.request<unknown, number>({
        method: "eth_chainId",
      })
      return Number(chainId)
    },
    async getProvider(): Promise<Provider> {
      if (walletProvider) {
        return walletProvider
      }
      if (web3AuthInstance.status === ADAPTER_STATUS.NOT_READY) {
        if (isIWeb3AuthModal(web3AuthInstance)) {
          await web3AuthInstance.initModal({
            modalConfig,
          })
        } else if (loginParams) {
          await web3AuthInstance.init()
        } else {
          log.error(
            "please provide valid loginParams when using @web3auth/no-modal"
          )
          throw new UserRejectedRequestError(
            "please provide valid loginParams when using @web3auth/no-modal" as unknown as Error
          )
        }
      }

      walletProvider = web3AuthInstance.provider
      if (!walletProvider) {
        throw new Error("No wallet provider.")
      }
      return walletProvider
    },
    async isAuthorized(): Promise<boolean> {
      try {
        const accounts = await this.getAccounts()
        return !!accounts.length
      } catch {
        return false
      }
    },
    async switchChain({ chainId }): Promise<Chain> {
      try {
        const chain = config.chains.find((x) => x.id === chainId)
        if (!chain) throw new SwitchChainError(new ChainNotConfiguredError())

        await web3AuthInstance.addChain(getChainConfig(chain))
        log.info("Chain Added: ", chain.name)
        await web3AuthInstance.switchChain({
          chainId: `0x${chain.id.toString(16)}`,
        })
        log.info("Chain Switched to ", chain.name)
        config.emitter.emit("change", {
          chainId,
        })
        return chain
      } catch (error: unknown) {
        log.error("Error: Cannot change chain", error)
        throw new SwitchChainError(error as Error)
      }
    },
    async disconnect(): Promise<void> {
      await web3AuthInstance.logout()
      const provider = await this.getProvider()
      provider.removeListener("accountsChanged", this.onAccountsChanged)
      provider.removeListener("chainChanged", this.onChainChanged)
    },
    onAccountsChanged(accounts) {
      if (accounts.length === 0) config.emitter.emit("disconnect")
      else
        config.emitter.emit("change", {
          accounts: accounts.map((x) => getAddress(x)),
        })
    },
    onChainChanged(chain) {
      const chainId = Number(chain)
      config.emitter.emit("change", { chainId })
    },
    async onConnect(connectInfo) {
      const accounts = await this.getAccounts()
      if (accounts.length === 0) return

      const chainId = Number(connectInfo.chainId)
      config.emitter.emit("connect", { accounts, chainId })

      const provider = await this.getProvider()
      if (provider) {
        provider.on("accountsChanged", this.onAccountsChanged.bind(this) as any)
        provider.on("chainChanged", this.onChainChanged as any)
        provider.on("disconnect", this.onDisconnect.bind(this) as any)
      }
    },
    onDisconnect(): void {
      config.emitter.emit("disconnect")
    },
  }))
}
