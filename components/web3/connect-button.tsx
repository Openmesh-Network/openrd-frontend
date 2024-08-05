"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useWeb3Modal } from "@web3modal/wagmi/react"
import { Account } from "viem"
import { useChainId, useConnect, useDisconnect, useSwitchChain } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { useAddressTitle } from "@/hooks/useAddressTitle"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Combobox } from "@/components/ui/combobox"
import { Separator } from "@/components/ui/separator"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import { useSelectableChains } from "@/components/context/selectable-chains"
import { useSetSettings, useSettings } from "@/components/context/settings"

export function ConnectButton() {
  const connectedChain = useChainId()
  const { switchChain } = useSwitchChain()
  const walletClient = useAbstractWalletClient({ chainId: connectedChain })
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
    <Modal title="Log in" dismiss={dismiss}>
      <div className="grid grid-cols-1 place-items-center gap-y-5">
        <Button
          onClick={() => {
            const connector = connectors.find((c) => c.id === "web3auth")
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
  const { push } = useRouter()

  return (
    <Modal title="Settings" dismiss={dismiss}>
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
            Allows you to use OpenR&D without needing gas. This will use a smart
            contract to handle all transaction for you, hence this contract will
            need and gain all assets. Disable this to use your wallet directly.
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

          <p className="text-sm text-muted-foreground">
            Allows you to pick testnet chains in the dropdown. These chains have
            no assets of monetary value and are solely meant for testing.
          </p>
        </div>
      </div>
      <br />
      <div className="items-top flex space-x-2">
        <Checkbox
          id="simulateTransactions"
          checked={settings.simulateTransactions}
          onCheckedChange={(checked) =>
            setSettings({
              ...settings,
              simulateTransactions:
                checked === "indeterminate"
                  ? settings.simulateTransactions
                  : checked,
            })
          }
        />
        <div className="grid gap-1.5 leading-none">
          <label
            htmlFor="simulateTransactions"
            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
          >
            Simulate transactions
          </label>

          <p className="text-sm text-muted-foreground">
            All transactions will first be simulated to check for errors. This
            is only recommended to be disabled in combination with a proposal
            builder, in case the transaction success is dependent on the other
            actions in the proposal.
          </p>
        </div>
      </div>
      <br />
      <div className="grid grid-cols-1 gap-2">
        <Button
          onClick={() => {
            push("/withdraw")
            dismiss()
          }}
        >
          Withdraw assets
        </Button>
        <Button
          onClick={() => {
            disconnect()
            dismiss()
          }}
          variant="destructive"
        >
          Disconnect
        </Button>
      </div>
    </Modal>
  )
}

function Modal({
  title,
  dismiss,
  children,
}: {
  title: string
  dismiss: () => void
  children: React.ReactNode
}) {
  return (
    <>
      <div
        className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto overflow-x-hidden outline-none focus:outline-none"
        onClick={() => dismiss()}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          className="relative mx-2 my-6 w-auto min-w-64 max-w-sm drop-shadow-xl"
        >
          {/*content*/}
          <div
            className={`relative flex w-full flex-col rounded-lg bg-secondary outline-none focus:outline-none`}
          >
            {/*header*/}
            <div className="flex items-start justify-between rounded-t p-3">
              <h3 className={`pr-4 text-lg font-semibold text-primary`}>
                {title}
              </h3>
              <button
                className={`opacity-1 float-right rounded-lg bg-transparent text-3xl`}
                onClick={() => dismiss()}
              >
                <span
                  className={`opacity-1 -mt-1 block h-8 w-6 bg-transparent text-2xl text-primary`}
                >
                  ×
                </span>
              </button>
            </div>
            <Separator />
            {/*footer*/}
            <div className={`w-full rounded-b-lg bg-secondary p-3`}>
              {children}
            </div>
          </div>
        </div>
      </div>
      <div className="fixed inset-0 z-40 bg-primary opacity-25"></div>
    </>
  )
}
