"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { RFPsContract } from "@/openrd-indexer/contracts/RFPs"
import { Project, RFP } from "@/openrd-indexer/types/rfp"
import { Reward } from "@/openrd-indexer/types/tasks"

import { getUser } from "@/lib/indexer"
import { useENS } from "@/hooks/useENS"
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
import { Link } from "@/components/ui/link"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import { SanitizeHTML } from "@/components/sanitize-html"
import { ShowApplicantMetadata } from "@/components/tasks/show/show-application"
import { ShowERC20Reward } from "@/components/tasks/show/show-erc20-reward"
import { ShowNativeReward } from "@/components/tasks/show/show-native-reward"
import { ShowTaskMetadata } from "@/components/tasks/show/show-task"

export type ShowProjectMetadata = ShowTaskMetadata

export type ShowRepresentativeMetadata = ShowApplicantMetadata

export function ShowProject({
  chainId,
  rfpId,
  projectId,
  project,
  indexerMetadata,
  rfp,
  refresh,
}: {
  chainId: number
  rfpId: bigint
  projectId: number
  project: Project
  indexerMetadata?: string
  rfp?: RFP
  refresh: () => Promise<void>
}) {
  const walletClient = useAbstractWalletClient({ chainId })
  const { performTransaction, performingTransaction } = usePerformTransaction({
    chainId,
  })
  const representativeENS = useENS({ address: project.representative })

  const directMetadata = useMetadata<ShowProjectMetadata | undefined>({
    url: project.metadata,
    defaultValue: undefined,
    emptyValue: {},
  })

  const indexedMetadata = indexerMetadata
    ? (JSON.parse(indexerMetadata) as ShowProjectMetadata)
    : undefined
  const title =
    directMetadata?.title ?? indexedMetadata?.title ?? "No title was provided."
  const tags = directMetadata?.tags ?? indexedMetadata?.tags ?? []
  const projectSize =
    directMetadata?.projectSize ?? indexedMetadata?.projectSize
  const teamSize = directMetadata?.teamSize ?? indexedMetadata?.teamSize
  const description =
    directMetadata?.description ??
    indexedMetadata?.description ??
    "No description was provided."
  const resources = directMetadata?.resources ?? indexedMetadata?.resources
  const links = directMetadata?.links ?? indexedMetadata?.links ?? []

  const [representativeMetadata, setRepresentativeMetadata] = useState<
    ShowRepresentativeMetadata | undefined
  >(undefined)
  useEffect(() => {
    const getRepresentativeMetadata = async () => {
      const user = await getUser(project.representative)
      setRepresentativeMetadata(
        user.metadata
          ? (JSON.parse(user.metadata) as ShowRepresentativeMetadata)
          : {}
      )
    }

    getRepresentativeMetadata().catch(console.error)
  }, [project.representative])
  const userTitle =
    representativeMetadata?.title ?? representativeENS ?? project.representative
  const userDescription = representativeMetadata?.description

  async function acceptProject() {
    await performTransaction({
      transactionName: "Accept project",
      transaction: async () => {
        return {
          abi: RFPsContract.abi,
          address: RFPsContract.address,
          functionName: "acceptProject",
          args: [
            rfpId,
            projectId,
            project.nativeReward.map((r) => r.amount), // accept their requested budget, should make this configurable in a form
            project.reward.map((r) => r.amount), // accept their requested budget, should make this configurable in a form
          ],
        }
      },
      onConfirmed: (receipt) => {
        refresh()
      },
    })
  }

  const [firstRender, setFirstRender] = useState(true)
  useEffect(() => {
    setFirstRender(false)
  }, [])

  return (
    <Card className="!rounded-none !border-0 !border-b-2 !shadow-none">
      <CardHeader>
        <CardTitle className="flex space-x-2">
          {/* Would be cool to add a hover effect here to show stats of the person (completion rate etc.) */}
          <div className="flex gap-x-[15px]">
            <Image
              alt="matic"
              src={`https://effigy.im/a/${project.representative}.svg`}
              className="w-[35px] rounded-full"
            />
            <Link
              href={`/profile/${project.representative}`}
              className="shrink text-[20px]"
            >
              {userTitle}
            </Link>
          </div>
          {project.accepted && <Badge variant="success">Accepted</Badge>}
        </CardTitle>
        {userDescription && <SanitizeHTML html={userDescription} />}
      </CardHeader>
      <CardContent className="">
        <div className="space-y-2">
          {title && <span>{title}</span>}
          {tags?.length > 0 && (
            <div className="mb-[5px] flex text-[11px] font-semibold text-grey dark:text-light md:text-[14px]">
              <p className="">Tags:</p>
              <div className="flex flex-wrap gap-y-[10px] italic">
                {tags?.map?.((tag, index) => (
                  <p
                    className="ml-1  border-b-[0.5px] border-grey dark:border-light"
                    key={index}
                  >
                    {tag.tag}
                    {index !== tags.length - 1 && ", "}
                  </p>
                ))}
              </div>
            </div>
          )}
          {projectSize !== undefined && projectSize !== 0 && (
            <span>Project size: {projectSize}</span>
          )}
          <br />
          {teamSize !== undefined && teamSize !== 0 && (
            <span>Team size: {teamSize}</span>
          )}
          {links.length !== 0 && (
            <div className="grid grid-cols-1">
              <span>Links:</span>
              <ul>
                {links.map?.((link, i) => (
                  <li key={i}>
                    <Link
                      href={link.url}
                      target="_blank"
                      className="hover:text-[#0354EC]"
                    >
                      {link.name ? `${link.name}: ` : ""}
                      {link.url}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {description && (
            <div className="mb-8">
              <div className="mb-4 text-grey dark:text-light">Description</div>
              <SanitizeHTML html={description} />
            </div>
          )}
          {resources && (
            <div className="">
              <div className="mb-4 text-grey dark:text-light">Resources</div>
              <SanitizeHTML html={resources} />
            </div>
          )}
          <div className="!mt-8 mb-4 text-grey dark:text-light">Budget</div>
          {project.nativeReward.length !== 0 && (
            <ShowNativeReward chainId={chainId} reward={project.nativeReward} />
          )}
          {project.reward.length !== 0 &&
            rfp &&
            rfp.budget.map((b, i) => (
              <ShowERC20Reward
                key={i}
                chainId={chainId}
                budget={b}
                reward={
                  project.reward.reduce(
                    (acc, value) => {
                      if (acc.token === i) {
                        acc.return.push(value)
                      }
                      if (value.nextToken) {
                        acc.token++
                      }
                      return acc
                    },
                    { token: 0, return: [] as Reward[] }
                  ).return
                }
              />
            ))}
        </div>
      </CardContent>
      {!firstRender &&
        !project.accepted &&
        walletClient?.account?.address &&
        walletClient.account.address === rfp?.manager && (
          <CardFooter>
            <Button
              onClick={() => acceptProject().catch(console.error)}
              disabled={performingTransaction}
            >
              Accept project
            </Button>
          </CardFooter>
        )}
    </Card>
  )
}
