import { Web3Provider } from "../web3/web3-provider"
import { AbstractWalletClientProvider } from "./abstract-wallet-client"
import { SelectableChainsProvider } from "./selectable-chains"
import { SettingsProvider } from "./settings"
import { ThemeProvider } from "./theme-provider"

export function ContextProvider({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <SelectableChainsProvider>
        <SettingsProvider>
          <Web3Provider>
            <AbstractWalletClientProvider>
              {children}
            </AbstractWalletClientProvider>
          </Web3Provider>
        </SettingsProvider>
      </SelectableChainsProvider>
    </ThemeProvider>
  )
}
