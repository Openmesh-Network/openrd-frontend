"use client"

import { useEffect, useState } from "react"
import { TaskRole, User } from "@/openrd-indexer/types/user"
import { parseBigInt } from "@/openrd-indexer/utils/parseBigInt"
import { Address } from "viem"

import { chains } from "@/config/wagmi-config"
import { getUser } from "@/lib/indexer"
import { objectKeysInt } from "@/lib/object-keys"
import { useENS } from "@/hooks/useENS"
import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/components/ui/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import { SanitizeHTML } from "@/components/sanitize-html"
import { ShowTaskSummary } from "@/components/tasks/show/show-task-summary"

export interface ProfileMetadata {
  title?: string
  description?: string
}

export function ShowProfile({ address }: { address: Address }) {
  const walletClient = useAbstractWalletClient()
  const [user, setUser] = useState<User | undefined>(undefined)
  const [forceTab, setForceTab] = useState<string | undefined>(undefined)
  const userENS = useENS({ address: address })

  useEffect(() => {
    const getUserInfo = async () => {
      const userInfo = await getUser(address)
      setUser(userInfo)
    }

    getUserInfo().catch(console.error)
  }, [address])

  useEffect(() => {
    if (user?.metadata) {
      setForceTab("description")
    }
  }, [user?.metadata])

  const metadata = user?.metadata
    ? (JSON.parse(user.metadata) as ProfileMetadata)
    : undefined
  const title = metadata?.title ?? userENS ?? address
  const description = metadata?.description

  return (
    <div>
      <div className="flex max-w-[980px] gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          {title}
        </h1>
        {walletClient?.account?.address &&
          walletClient.account.address == address && (
            <Link href="/profile/edit" className={buttonVariants({})}>
              Edit profile
            </Link>
          )}
      </div>
      <div className="flex gap-x-10">
        {chains.map((chain) => (
          <Link
            key={chain.id}
            href={`${chain.blockExplorers.default.url}/address/${address}`}
            target="_blank"
          >
            {chain.name}: View on {chain.blockExplorers.default.name}
          </Link>
        ))}
      </div>
      <Tabs
        defaultValue="tasks"
        value={forceTab}
        onValueChange={() => setForceTab(undefined)}
      >
        <TabsList>
          {description && (
            <TabsTrigger value="description">Description</TabsTrigger>
          )}
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
        </TabsList>
        {description && (
          <TabsContent value="description">
            <SanitizeHTML html={description} />
          </TabsContent>
        )}
        <TabsContent value="tasks">
          <div>
            {user?.tasks ? (
              <div className="grid grid-cols-1 gap-y-3">
                {objectKeysInt(user.tasks).map((chainId, i) =>
                  Object.keys(user.tasks[chainId])
                    .reverse()
                    .map((taskIdString) => {
                      const taskId = parseBigInt(taskIdString)
                      if (taskId === undefined) {
                        return (
                          <span>
                            This task could not be shown. {chainId}:{taskId}
                          </span>
                        )
                      }
                      return (
                        <Card key={`${chainId}:${taskIdString}`}>
                          <CardContent className="space-y-4">
                            <div className="mt-2 space-x-2">
                              <span>User is</span>
                              {user.tasks[chainId][taskIdString].map(
                                (role, i) => (
                                  <Badge key={i} variant="secondary">
                                    {TaskRole[role]}
                                  </Badge>
                                )
                              )}
                            </div>
                            <ShowTaskSummary
                              index={i}
                              key={`${chainId}:${taskId}`}
                              chainId={chainId}
                              taskId={taskId}
                            />
                          </CardContent>
                        </Card>
                      )
                    })
                )}
              </div>
            ) : (
              <span>This user did not participate in any tasks yet.</span>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
