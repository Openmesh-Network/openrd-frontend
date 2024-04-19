"use client"

import { createContext, useContext, useState } from "react"

export interface Settings {
  useAccountAbstraction: boolean
}
const defaultSettings: Settings = {
  useAccountAbstraction: false,
}
const SettingsContext = createContext<Settings>(defaultSettings)
const SetSettingsContext = createContext<(settings: Settings) => void>(() => {})

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(defaultSettings)

  return (
    <SettingsContext.Provider value={settings}>
      <SetSettingsContext.Provider value={setSettings}>
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
