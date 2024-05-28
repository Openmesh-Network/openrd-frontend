"use client"

import React, { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"
import { Address, isAddress } from "viem"
import { useChainId, usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command"
import { FormControl } from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface SelectableAddresses {
  [address: Address]:
    | {
        name: string
        logo?: string
      }
    | undefined
}

export interface AddressPickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  chainId?: number
  addressName?: string
  selectableAddresses?: SelectableAddresses
  value?: string
  onChange?: (address: Address | undefined) => void
  customAllowed?: true | undefined
}

const AddressPicker = React.forwardRef<HTMLDivElement, AddressPickerProps>(
  (
    {
      chainId: _chainId,
      addressName: _addressName,
      selectableAddresses: _selectableAddresses,
      value: _value,
      onChange,
      customAllowed,
      className,
      ...props
    },
    ref
  ) => {
    const connectedChainId = useChainId()
    const chainId = _chainId ?? connectedChainId
    const chain = chains.find((c) => c.id === chainId)

    const selectableAddresses = _selectableAddresses ?? {}
    const addressList = Object.keys(selectableAddresses).reduce(
      (acc, address) => {
        // Normalize all addresses to lowercase
        acc[address.toLowerCase() as Address] =
          selectableAddresses[address as Address]
        return acc
      },
      {} as SelectableAddresses
    )
    const addressName = _addressName ?? "address"
    const value = _value ? (_value.toLowerCase() as Address) : undefined

    const [searchValue, setSearchValue] = useState<string>("")

    const mainnetPublicClient = usePublicClient({ chainId: 1 })
    useEffect(() => {
      const checkENS = async () => {
        if (!mainnetPublicClient || isAddress(searchValue)) {
          return
        }

        const address = await mainnetPublicClient.getEnsAddress({
          name: searchValue,
        })
        if (address) {
          setSearchValue(address)
        }
      }

      checkENS().catch(console.error)
    }, [searchValue, mainnetPublicClient])

    if (customAllowed && isAddress(searchValue)) {
      // Only overwrite if not exists
      addressList[searchValue.toLowerCase() as Address] ??= {
        name: `Custom: ${searchValue}`,
      }
    }

    const [firstRender, setFirstRender] = useState(true)
    useEffect(() => {
      setFirstRender(false)
    }, [])

    return (
      <div
        ref={ref}
        {...props}
        className={cn(
          "flex w-full flex-col space-y-1 max-w-[450px]",
          className
        )}
      >
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant="outline"
                role="combobox"
                className={cn(
                  "justify-between",
                  (!value || firstRender) && "text-muted-foreground"
                )}
              >
                {!firstRender && (
                  <Logo src={addressList[value as Address]?.logo} />
                )}
                <span>
                  {!value || firstRender
                    ? `Select ${addressName}`
                    : addressList[value]?.name ?? value}
                </span>
                <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-[450px] p-0">
            <Command>
              <CommandInput
                placeholder={`Search ${addressName}...`}
                className="h-9"
                value={searchValue}
                onValueChange={setSearchValue}
              />
              <CommandEmpty>No {addressName} found.</CommandEmpty>
              <CommandGroup>
                {Object.keys(addressList).map((address, i) => (
                  <CommandItem
                    key={i}
                    value={address}
                    onSelect={
                      onChange as
                        | ((address: string | undefined) => void)
                        | undefined
                    }
                    className="gap-3"
                  >
                    <Logo src={addressList[address as Address]?.logo} />
                    <span>
                      {addressList[address as Address]?.name ?? address}
                    </span>
                    <CheckIcon
                      className={cn(
                        "ml-auto size-4",
                        address === value ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </CommandItem>
                ))}
              </CommandGroup>
            </Command>
          </PopoverContent>
        </Popover>
        {!firstRender && value && chain && (
          <Link
            href={`${chain.blockExplorers.default.url}/address/${value}`}
            target="_blank"
            className="text-xs"
          >
            View on explorer
          </Link>
        )}
      </div>
    )
  }
)
AddressPicker.displayName = "AddressPicker"

function Logo({ src }: { src?: string }) {
  return (
    <div>{src && <Image alt="logo" src={src} width={20} height={20} />}</div>
  )
}

export { AddressPicker }
