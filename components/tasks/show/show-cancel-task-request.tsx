"use client"

import { useEffect, useState } from "react"
import { TasksContract } from "@/openrd-indexer/contracts/Tasks"
import {
  CancelTaskRequest,
  RequestType,
  Task,
  TaskState,
} from "@/openrd-indexer/types/tasks"

import { useMetadata } from "@/hooks/useMetadata"
import { usePerformTransaction } from "@/hooks/usePerformTransaction"
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
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
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
  const walletClient = useAbstractWalletClient({ chainId })
  const { performTransaction, performingTransaction } = usePerformTransaction({
    chainId,
  })

  const executorApplication = task
    ? task.applications[task.executorApplication]
    : undefined

  const directMetadata = useMetadata<ShowRequestMetadata | undefined>({
    url: request.metadata,
    defaultValue: undefined,
    emptyValue: {},
  })

  async function approveRequest() {
    await performTransaction({
      transactionName: "Approve request",
      transaction: async () => {
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "acceptRequest",
          args: [taskId, RequestType.CancelTask, requestId, false],
        }
      },
      onConfirmed: (receipt) => {
        refresh()
      },
    })
  }

  async function executeRequest() {
    await performTransaction({
      transactionName: "Execute request",
      transaction: async () => {
        return {
          abi: TasksContract.abi,
          address: TasksContract.address,
          functionName: "executeRequest",
          args: [taskId, RequestType.CancelTask, requestId],
        }
      },
      onConfirmed: (receipt) => {
        refresh()
      },
    })
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
              disabled={performingTransaction}
              onClick={() => executeRequest().catch(console.error)}
            >
              Execute
            </Button>
          ) : (
            walletClient?.account?.address &&
            walletClient.account.address === executorApplication?.applicant && (
              <Button
                disabled={performingTransaction}
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
