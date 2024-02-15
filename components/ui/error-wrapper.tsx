import React from "react"
import { ExclamationTriangleIcon } from "@radix-ui/react-icons"
import {
  FieldError,
  FieldErrorsImpl,
  FieldValues,
  Merge,
} from "react-hook-form"

import { cn } from "@/lib/utils"
import { Alert, AlertTitle } from "@/components/ui/alert"

interface ErrorWrapperProps<T extends FieldValues>
  extends React.HTMLAttributes<HTMLDivElement> {
  error?: Merge<FieldError, FieldErrorsImpl<T>>
}

const ErrorWrapper = React.forwardRef(
  <T extends FieldValues>(
    { children, error, className }: ErrorWrapperProps<T>,
    ref: React.Ref<HTMLDivElement>
  ) => {
    const firstError = error
      ? Object.values(error).find((err) => err !== undefined)
      : undefined

    return (
      <div
        className={cn("flex w-full flex-col space-y-1", className)}
        ref={ref}
      >
        {children}
        {firstError && (
          <Alert variant="destructive">
            <ExclamationTriangleIcon className="size-4" />
            <AlertTitle>{firstError?.message ?? "Invalid"}</AlertTitle>
          </Alert>
        )}
      </div>
    )
  }
)
ErrorWrapper.displayName = "ErrorWrapper"

export { ErrorWrapper }
