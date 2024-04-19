"use client"

import { createContext, useContext, useEffect, useState } from "react"

import { useSetSelectableChains } from "./selectable-chains"

export interface Settings {
  useAccountAbstraction: boolean
  showTestnet: boolean
}
const defaultSettings: Settings = {
  useAccountAbstraction: true,
  showTestnet: false,
}
const SettingsContext = createContext<Settings>(defaultSettings)
const SetSettingsContext = createContext<(settings: Settings) => void>(() => {})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)
  const { allChains, setSelectableChains } = useSetSelectableChains()

  const updateSettings = (settings: Settings) => {
    setSettings(settings)
    localStorage.setItem("settings", JSON.stringify(settings))
  }

  useEffect(() => {
    const storedSettings = localStorage.getItem("settings")
    if (storedSettings) {
      setSettings(JSON.parse(storedSettings))
    }
  }, [])

  useEffect(() => {
    setSelectableChains(
      allChains
        .filter((chain) => settings.showTestnet || !chain.testnet)
        .map((chain) => chain.id)
    )
  }, [settings.showTestnet])

  return (
    <SettingsContext.Provider value={settings}>
      <SetSettingsContext.Provider value={updateSettings}>
        {children}
      </SetSettingsContext.Provider>
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}

export function useSetSettings() {
  return useContext(SetSettingsContext)
}
