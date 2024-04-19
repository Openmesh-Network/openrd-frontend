import { useEffect, useState } from "react"
import { signerToEcdsaValidator } from "@zerodev/ecdsa-validator"
import {
  createKernelAccount,
  createKernelAccountClient,
  createZeroDevPaymasterClient,
} from "@zerodev/sdk"
import {
  ENTRYPOINT_ADDRESS_V07,
  walletClientToSmartAccountSigner,
} from "permissionless"
import { Account, Chain, createPublicClient, http, WalletClient } from "viem"
import { useWalletClient } from "wagmi"

import { useSettings } from "@/components/context/settings"

const PROJECT_ID = "f93016ab-859c-4458-bb75-cd0fa56ca469"
const BUNDLER_RPC = `https://rpc.zerodev.app/api/v2/bundler/${PROJECT_ID}`
const PAYMASTER_RPC = `https://rpc.zerodev.app/api/v2/paymaster/${PROJECT_ID}`
const entryPoint = ENTRYPOINT_ADDRESS_V07

export interface AbstractWalletClientSettings {
  chainId?: number
}
export interface AbstractWalletClient
  extends Pick<
    WalletClient,
    | "account"
    | "chain"
    | "sendTransaction"
    | "signMessage"
    | "signTypedData"
    | "writeContract"
  > {
  account: Account
  chain: Chain
}
export function useAbstractWalletClient(
  settings?: AbstractWalletClientSettings
) {
  const [abstractWalletClient, setAbstractWalletClient] = useState<
    AbstractWalletClient | undefined
  >(undefined)
  const { data: walletClient } = useWalletClient(settings)
  const { useAccountAbstraction } = useSettings()

  useEffect(() => {
    const getAbstractWalletClient = async () => {
      if (!walletClient || !useAccountAbstraction) {
        setAbstractWalletClient(undefined)
        return
      }
      const publicClient = createPublicClient({
        transport: http(BUNDLER_RPC),
      })

      const ecdsaValidator = await signerToEcdsaValidator(publicClient, {
        signer: walletClientToSmartAccountSigner(walletClient),
        entryPoint,
      })

      const account = await createKernelAccount(publicClient, {
        plugins: {
          sudo: ecdsaValidator,
        },
        entryPoint,
      })

      const kernelClient = createKernelAccountClient({
        account,
        chain: walletClient.chain,
        entryPoint,
        bundlerTransport: http(BUNDLER_RPC),
        middleware: {
          sponsorUserOperation: async ({ userOperation }) => {
            const zerodevPaymaster = createZeroDevPaymasterClient({
              chain: walletClient.chain,
              entryPoint,
              transport: http(PAYMASTER_RPC),
            })
            return zerodevPaymaster.sponsorUserOperation({
              userOperation,
              entryPoint,
            })
          },
        },
      })

      setAbstractWalletClient(kernelClient)
    }

    getAbstractWalletClient().catch(console.error)
  }, [walletClient, useAccountAbstraction])

  return abstractWalletClient ?? walletClient
}
