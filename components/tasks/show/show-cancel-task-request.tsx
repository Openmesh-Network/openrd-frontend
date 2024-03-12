"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import {
  CancelTaskRequest,
  RequestType,
  Task,
  TaskState,
} from "@/openrd-indexer/types/tasks"
import { BaseError, ContractFunctionRevertedError, decodeEventLog } from "viem"
import {
  useAccount,
  useChainId,
  usePublicClient,
  useSwitchChain,
  useWalletClient,
} from "wagmi"

import { chains } from "@/config/wagmi-config"
import { useMetadata } from "@/hooks/useMetadata"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
import { SanitizeHTML } from "@/components/sanitize-html"

export interface ShowRequestMetadata {
  reason?: string
}

export function ShowCancelTaskRequest({
  chainId,
  taskId,
  requestId,
  request,
  indexerMetadata,
  task,
  refresh,
}: {
  chainId: number
  taskId: bigint
  requestId: number
  request: CancelTaskRequest
  indexerMetadata?: string
  task?: Task
  refresh: () => Promise<void>
}) {
  const account = useAccount()
  const connectedChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const { data: walletClient } = useWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()

  const executorApplication = task
    ? task.applications[task.executorApplication]
    : undefined

  const directMetadata = useMetadata<ShowRequestMetadata | undefined>({
    url: request.metadata,
    defaultValue: undefined,
    emptyValue: {},
  })

  const [approvingRequest, setApprovingRequest] = useState<boolean>(false)
  async function approveRequest() {
    if (connectedChainId !== chainId) {
      const switchChainResult = await switchChainAsync?.({
        chainId: chainId,
      }).catch((err) => {
        console.error(err)
      })
      if (!switchChainResult || switchChainResult.id !== chainId) {
        toast({
          title: "Wrong chain",
          description: `Please switch to ${chains.find((c) => c.id === chainId)?.name ?? chainId}.`,
          variant: "destructive",
        })
        return
      }
    }
    if (approvingRequest) {
      toast({
        title: "Please wait",
        description: "The past approve is still running.",
        variant: "destructive",
      })
      return
    }
    const approve = async () => {
      setApprovingRequest(true)
      let { dismiss } = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      })

      if (!publicClient || !walletClient) {
        dismiss()
        toast({
          title: "Request approve failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      const transactionRequest = await publicClient
        .simulateContract({
          account: walletClient.account.address,
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "acceptRequest",
          args: [taskId, RequestType.CancelTask, requestId, false],
          chain: chains.find((c) => c.id == chainId),
        })
        .catch((err) => {
          console.error(err)
          if (err instanceof BaseError) {
            let errorName = err.shortMessage ?? "Simulation failed."
            const revertError = err.walk(
              (err) => err instanceof ContractFunctionRevertedError
            )
            if (revertError instanceof ContractFunctionRevertedError) {
              errorName += ` -> ${revertError.data?.errorName}` ?? ""
            }
            return errorName
          }
          return "Simulation failed."
        })
      if (typeof transactionRequest === "string") {
        dismiss()
        toast({
          title: "Request approve failed",
          description: transactionRequest,
          variant: "destructive",
        })
        return
      }
      const transactionHash = await walletClient
        .writeContract(transactionRequest.request)
        .catch((err) => {
          console.error(err)
          return undefined
        })
      if (!transactionHash) {
        dismiss()
        toast({
          title: "Request approve failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Approve transaction submitted",
        description: "Waiting until confirmed on the blockchain...",
        action: (
          <ToastAction
            altText="View on explorer"
            onClick={() => {
              const chain = chains.find((c) => c.id === chainId)
              if (!chain) {
                return
              }

              window.open(
                `${chain.blockExplorers.default.url}/tx/${transactionHash}`,
                "_blank"
              )
            }}
          >
            View on explorer
          </ToastAction>
        ),
      }).dismiss

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      })
      dismiss()
      dismiss = toast({
        title: "Approve transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let requestAccepted = false
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== TasksContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the tasks contract
            return
          }

          const requestAcceptedEvent = decodeEventLog({
            abi: TasksContract.abi,
            eventName: "RequestAccepted",
            topics: log.topics,
            data: log.data,
          })
          if (
            requestAcceptedEvent.args.taskId === taskId &&
            requestAcceptedEvent.args.requestId === requestId
          ) {
            requestAccepted = true
          }
        } catch {}
      })
      if (!requestAccepted) {
        dismiss()
        toast({
          title: "Error confirming approve",
          description: "The request approve possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The request has been approved.",
        variant: "success",
        action: (
          <ToastAction
            altText="Refresh"
            onClick={() => {
              refresh()
            }}
          >
            Refresh
          </ToastAction>
        ),
      }).dismiss
    }

    await approve().catch(console.error)
    setApprovingRequest(false)
  }

  const [executingRequest, setExecutingRequest] = useState<boolean>(false)
  async function executeRequest() {
    if (connectedChainId !== chainId) {
      const switchChainResult = await switchChainAsync?.({
        chainId: chainId,
      }).catch((err) => {
        console.error(err)
      })
      if (!switchChainResult || switchChainResult.id !== chainId) {
        toast({
          title: "Wrong chain",
          description: `Please switch to ${chains.find((c) => c.id === chainId)?.name ?? chainId}.`,
          variant: "destructive",
        })
        return
      }
    }
    if (executingRequest) {
      toast({
        title: "Please wait",
        description: "The past submission is still running.",
        variant: "destructive",
      })
      return
    }
    const execute = async () => {
      setExecutingRequest(true)
      let { dismiss } = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      })

      if (!publicClient || !walletClient) {
        dismiss()
        toast({
          title: "Request execute failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      const transactionRequest = await publicClient
        .simulateContract({
          account: walletClient.account.address,
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "executeRequest",
          args: [taskId, RequestType.CancelTask, requestId],
          chain: chains.find((c) => c.id == chainId),
        })
        .catch((err) => {
          console.error(err)
          if (err instanceof BaseError) {
            let errorName = err.shortMessage ?? "Simulation failed."
            const revertError = err.walk(
              (err) => err instanceof ContractFunctionRevertedError
            )
            if (revertError instanceof ContractFunctionRevertedError) {
              errorName += ` -> ${revertError.data?.errorName}` ?? ""
            }
            return errorName
          }
          return "Simulation failed."
        })
      if (typeof transactionRequest === "string") {
        dismiss()
        toast({
          title: "Request execute failed",
          description: transactionRequest,
          variant: "destructive",
        })
        return
      }
      const transactionHash = await walletClient
        .writeContract(transactionRequest.request)
        .catch((err) => {
          console.error(err)
          return undefined
        })
      if (!transactionHash) {
        dismiss()
        toast({
          title: "Request execute failed",
          description: "Transaction rejected.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        duration: 120_000, // 2 minutes
        title: "Execute transaction submitted",
        description: "Waiting until confirmed on the blockchain...",
        action: (
          <ToastAction
            altText="View on explorer"
            onClick={() => {
              const chain = chains.find((c) => c.id === chainId)
              if (!chain) {
                return
              }

              window.open(
                `${chain.blockExplorers.default.url}/tx/${transactionHash}`,
                "_blank"
              )
            }}
          >
            View on explorer
          </ToastAction>
        ),
      }).dismiss

      const receipt = await publicClient.waitForTransactionReceipt({
        hash: transactionHash,
      })
      dismiss()
      dismiss = toast({
        title: "Execute transaction confirmed!",
        description: "Parsing transaction logs...",
      }).dismiss

      let requestExecuted = false
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== TasksContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the tasks contract
            return
          }

          const requestExecutedEvent = decodeEventLog({
            abi: TasksContract.abi,
            eventName: "RequestExecuted",
            topics: log.topics,
            data: log.data,
          })
          if (
            requestExecutedEvent.args.taskId === taskId &&
            requestExecutedEvent.args.requestId === requestId
          ) {
            requestExecuted = true
          }
        } catch {}
      })
      if (!requestExecuted) {
        dismiss()
        toast({
          title: "Error confirming execution",
          description: "The request execute possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The request has been executed.",
        variant: "success",
        action: (
          <ToastAction
            altText="Refresh"
            onClick={() => {
              refresh()
            }}
          >
            Refresh
          </ToastAction>
        ),
      }).dismiss
    }

    await execute().catch(console.error)
    setExecutingRequest(false)
  }

  const indexedMetadata = indexerMetadata
    ? (JSON.parse(indexerMetadata) as ShowRequestMetadata)
    : undefined
  const reason = directMetadata?.reason ?? indexedMetadata?.reason

  const [firstRender, setFirstRender] = useState(true)
  useEffect(() => {
    setFirstRender(false)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex space-x-2">
          {/* Would be cool to add a hover effect here to show stats of the person (completion rate etc.) */}
          <span>Request #{requestId}</span>
          {request.request.accepted && (
            <Badge variant="success">Accepted</Badge>
          )}
          {request.request.executed && <Badge>Executed</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent>{reason && <SanitizeHTML html={reason} />}</CardContent>
      <CardFooter>
        <Separator />
      </CardFooter>
      <CardFooter>
        {!firstRender &&
          !request.request.executed &&
          task?.state === TaskState.Taken &&
          (request.request.accepted ? (
            <Button
              disabled={executingRequest}
              onClick={() => executeRequest().catch(console.error)}
            >
              Execute
            </Button>
          ) : (
            account.address &&
            account.address === executorApplication?.applicant && (
              <Button
                disabled={approvingRequest}
                onClick={() => approveRequest().catch(console.error)}
              >
                Accept
              </Button>
            )
          ))}
      </CardFooter>
    </Card>
  )
}
