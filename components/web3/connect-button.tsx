"use client"

import { useState } from "react"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { Account } from "viem"
import { useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { useAddressTitle } from "@/hooks/useAddressTitle"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import { useSetSettings, useSettings } from "@/components/context/settings"

import { useSelectableChains } from "../context/selectable-chains"
import { Combobox } from "../ui/combobox"
import { Separator } from "../ui/separator"

export function ConnectButton() {
  const connectedChain = useChainId()
  const { switchChain } = useSwitchChain()
  const walletClient = useAbstractWalletClient()
  const addressTitle = useAddressTitle(walletClient?.account?.address)
  const selectableChains = useSelectableChains()

  const [connectorPopup, setConnectorPopup] = useState<boolean>(false)
  const [accountPopup, setAccountPopup] = useState<boolean>(false)

  if (!walletClient?.account) {
    return (
      <>
        <Button onClick={() => setConnectorPopup(true)}>Log in</Button>
        {connectorPopup && (
          <ConnecterModal dismiss={() => setConnectorPopup(false)} />
        )}
      </>
    )
  }

  return (
    <>
      <div className="flex gap-x-2">
        <Combobox
          options={chains.map((chain) => {
            return {
              label: chain.name,
              value: chain.id,
              hidden: !selectableChains.includes(chain.id),
            }
          })}
          value={connectedChain}
          onChange={(chainId) => switchChain({ chainId: chainId as number })}
        />
        <Button onClick={() => setAccountPopup(true)}>{addressTitle}</Button>
      </div>
      {accountPopup && (
        <AccountModal
          account={walletClient.account}
          dismiss={() => setAccountPopup(false)}
        />
      )}
    </>
  )
}

function ConnecterModal({ dismiss }: { dismiss: () => void }) {
  const { connect, connectors } = useConnect()
  const { open } = useWeb3Modal()

  return (
    <Modal dismiss={dismiss}>
      <div className="grid grid-cols-1 place-items-center gap-y-5">
        <Button
          onClick={() => {
            const connector = connectors.find((c) => c.name === "Web3Auth")
            if (!connector) {
              console.error("Web3Auth connector not found")
              return
            }
            connect({ connector: connector })
          }}
        >
          Social Login
        </Button>
        <Button onClick={() => open()}>Web3 Wallet</Button>
      </div>
    </Modal>
  )
}

function AccountModal({
  account,
  dismiss,
}: {
  account: Account
  dismiss: () => void
}) {
  const { disconnect } = useDisconnect()
  const settings = useSettings()
  const setSettings = useSetSettings()

  return (
    <Modal dismiss={dismiss}>
      <p className="text-sm">Address: {account.address}</p>
      <br />
      <div className="items-top flex space-x-2">
        <Checkbox
          id="useAA"
          checked={settings.useAccountAbstraction}
          onCheckedChange={(checked) =>
            setSettings({
              ...settings,
              useAccountAbstraction:
                checked === "indeterminate"
                  ? settings.useAccountAbstraction
                  : checked,
            })
          }
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="useAA"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Use Account Abstraction
          </label>

          <p className="text-sm text-muted-foreground">
            ERC-4337 will be used.
          </p>
        </div>
      </div>
      <br />
      <div className="items-top flex space-x-2">
        <Checkbox
          id="showTestnet"
          checked={settings.showTestnet}
          onCheckedChange={(checked) =>
            setSettings({
              ...settings,
              showTestnet:
                checked === "indeterminate" ? settings.showTestnet : checked,
            })
          }
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="showTestnet"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Show testnet
          </label>
        </div>
      </div>
      <br />
      <Button
        onClick={() => {
          disconnect()
          dismiss()
        }}
        variant="destructive"
      >
        Disconnect
      </Button>
    </Modal>
  )
}

function Modal({
  dismiss,
  children,
}: {
  dismiss: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <div
        className="justify-center items-center flex overflow-x-hidden overflow-y-auto fixed inset-0 z-50 outline-none focus:outline-none"
        onClick={() => dismiss()}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative w-auto my-6 mx-2 max-w-sm min-w-64 drop-shadow-xl"
        >
          {/*content*/}
          <div
            className={`rounded-lg relative flex flex-col w-full bg-secondary outline-none focus:outline-none`}
          >
            {/*header*/}
            <div className="flex items-start justify-between p-3 rounded-t">
              <h3 className={`text-lg pr-4 font-semibold text-primary`}>
                Log in
              </h3>
              <button
                className={`bg-transparent opacity-1 float-right text-3xl rounded-lg`}
                onClick={() => dismiss()}
              >
                <span
                  className={`-mt-1 bg-transparent text-primary opacity-1 h-8 w-6 text-2xl block`}
                >
                  ×
                </span>
              </button>
            </div>
            <Separator />
            {/*footer*/}
            <div className={`p-3 w-full rounded-b-lg bg-secondary`}>
              {children}
            </div>
          </div>
        </div>
      </div>
      <div className="opacity-25 fixed inset-0 z-40 bg-primary"></div>
    </>
  )
}
