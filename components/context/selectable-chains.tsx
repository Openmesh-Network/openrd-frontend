"use client"

import { createContext, useContext, useState } from "react"

import { chains } from "@/config/wagmi-config"

export type SelectableChainsContextData = number[]
const defaultSelectableChainsContextData: SelectableChainsContextData =
  chains.map((c) => c.id)
const SelectableChainsContext = createContext<SelectableChainsContextData>(
  defaultSelectableChainsContextData
)
const SetSelectableChainsContext = createContext<
  (selectableChains: SelectableChainsContextData) => void
>(() => {})

export function SelectableChainsProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [selectableChains, setSelectableChains] =
    useState<SelectableChainsContextData>(defaultSelectableChainsContextData)

  return (
    <SelectableChainsContext.Provider value={selectableChains}>
      <SetSelectableChainsContext.Provider value={setSelectableChains}>
        {children}
      </SetSelectableChainsContext.Provider>
    </SelectableChainsContext.Provider>
  )
}

export function useSelectableChains() {
  return useContext(SelectableChainsContext)
}

export function useSetSelectableChains() {
  const setSelectableChains = useContext(SetSelectableChainsContext)
  return { allChains: chains, setSelectableChains: setSelectableChains }
}
