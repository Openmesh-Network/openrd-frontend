"use client"

import React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { FormControl } from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface DatePickerProps
  extends Omit<React.HTMLAttributes<HTMLDivElement>, "onChange"> {
  minValue?: Date
  value?: Date
  onChange?: (date?: Date) => void
}

const DatePicker = React.forwardRef<HTMLDivElement, DatePickerProps>(
  ({ minValue, value, onChange, ...props }, ref) => {
    return (
      <div ref={ref} {...props}>
        <Popover>
          <PopoverTrigger asChild>
            <FormControl>
              <Button
                variant={"outline"}
                className={cn(
                  "w-[240px] pl-3 text-left font-normal",
                  !value && "text-muted-foreground"
                )}
              >
                {value ? format(value, "PPP") : <span>Pick a date</span>}
                <CalendarIcon className="ml-auto size-4 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={value}
              onSelect={onChange}
              disabled={(date) => minValue !== undefined && date < minValue}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>
    )
  }
)
DatePicker.displayName = "DatePicker"

export { DatePicker }
