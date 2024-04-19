"use client"

import React from "react"
import { CaretSortIcon, CheckIcon } from "@radix-ui/react-icons"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface ComboboxOption<T> {
  label: string
  value: T
  hidden?: boolean
}

export interface ComboboxProps<T>
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  options: ComboboxOption<T>[]
  value: T
  onChange: (value: T) => void
}

const Combobox = React.forwardRef(
  <T,>(
    { options, value, onChange, className, ...props }: ComboboxProps<T>,
    ref: React.Ref<HTMLDivElement>
  ) => {
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
            <Button
              variant="outline"
              role="combobox"
              className={cn("justify-between")}
            >
              <span>
                {options.find((o) => o.value === value)?.label ??
                  "UNKNOWN VALUE"}
              </span>
              <CaretSortIcon className="ml-2 size-4 shrink-0 opacity-50" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[450px] p-0">
            {options.map((option, i) => {
              if (option.hidden) {
                return <></>
              }

              return (
                <Button
                  key={i}
                  onClick={() => onChange(option.value)}
                  variant="outline"
                  className="w-full"
                >
                  <span>{option.label}</span>
                  <CheckIcon
                    className={cn(
                      "ml-auto size-4",
                      option.value === value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </Button>
              )
            })}
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)
Combobox.displayName = "Combobox"

export { Combobox }
