"use client"

import { Dispute, Reward, Task, TaskState } from "@/openrd-indexer/types/tasks"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Link } from "@/components/ui/link"

import { ShowERC20Reward } from "./show-erc20-reward"
import { ShowNativeReward } from "./show-native-reward"

export function ShowDispute({
  chainId,
  dispute,
  task,
}: {
  chainId: number
  dispute: Dispute
  task?: Task
}) {
  const executorApplication = task?.executorApplication
    ? task.applications[task.executorApplication]
    : undefined

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex space-x-2">Dispute</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {executorApplication &&
            executorApplication.nativeReward.length !== 0 && (
              <ShowNativeReward
                chainId={chainId}
                reward={executorApplication.nativeReward.map(
                  (nativeReward, i) => {
                    return {
                      ...nativeReward,
                      partialAmount:
                        dispute.partialNativeReward.at(i) ?? BigInt(0),
                    }
                  }
                )}
              />
            )}
          {executorApplication &&
            executorApplication.reward.length !== 0 &&
            task &&
            task.budget.map((b, i) => (
              <ShowERC20Reward
                key={i}
                chainId={chainId}
                budget={b}
                reward={
                  executorApplication.reward.reduce(
                    (acc, value, i) => {
                      if (acc.token === i) {
                        acc.return.push({
                          ...value,
                          partialAmount:
                            dispute.partialReward.at(i) ?? BigInt(0),
                        })
                      }
                      if (value.nextToken) {
                        acc.token++
                      }
                      return acc
                    },
                    { token: 0, return: [] as ShowERC20Reward[] }
                  ).return
                }
              />
            ))}
        </div>
      </CardContent>
      {/* <CardFooter>
        <Link>View dispute proposal</Link>
      </CardFooter> */}
    </Card>
  )
}
