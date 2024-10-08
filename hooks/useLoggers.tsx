import { Loggers, UpdateDuration } from "@plopmenz/viem-extensions"
import { useChainId } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { ToastAction, ToastActionElement } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"

export interface UseLoggersProps {
  chainId?: number
}

export function useLoggers(props?: UseLoggersProps) {
  const connectedChainId = useChainId()
  const { toast } = useToast()

  let dismiss = () => {}
  const loggers: Loggers = {
    onError: (item) => {
      console.error(`${item.title}: ${item.description}\n${item.error}`)
      dismiss()
      dismiss = toast({
        ...item,
        variant: "destructive",
      }).dismiss
    },
    onUpdate: (item) => {
      console.log(`${item.title}: ${item.description}`)
      dismiss()
      let action: ToastActionElement | undefined = undefined
      const update = item.updateType
      switch (update?.type) {
        case "ViewTransactionUpdate":
          action = (
            <ToastAction
              altText="View on explorer"
              onClick={() => {
                const chain = chains.find(
                  (c) => c.id === (props?.chainId ?? connectedChainId)
                )
                if (!chain) {
                  return
                }

                window.open(
                  `${chain.blockExplorers.default.url}/tx/${update.transactionHash}`,
                  "_blank"
                )
              }}
            >
              View on explorer
            </ToastAction>
          )
          break
      }
      dismiss = toast({
        ...item,
        duration:
          item.updateDuration === UpdateDuration.Long ? 120_000 : undefined, // 2 minutes
        action: action,
      }).dismiss
    },
    onSuccess: (item) => {
      console.log(`${item.title}: ${item.description}`)
      dismiss()
      dismiss = toast({
        ...item,
        variant: "success",
      }).dismiss
    },
  }

  return loggers
}
