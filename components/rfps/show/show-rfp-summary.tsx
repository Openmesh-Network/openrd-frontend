/* eslint-disable tailwindcss/no-unnecessary-arbitrary-value */
"use client"

import { useEffect, useState } from "react"
import { RFPsContract } from "@/openrd-indexer/contracts/RFPs"
import { IndexedRFP, RFP } from "@/openrd-indexer/types/rfp"
import { usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { arrayToIndexObject } from "@/lib/array-to-object"
import { daysUntil } from "@/lib/general-functions"
import { getRFP } from "@/lib/indexer"
import { useMetadata } from "@/hooks/useMetadata"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Link } from "@/components/ui/link"
import { Skeleton } from "@/components/ui/skeleton"
import { SanitizeHTML } from "@/components/sanitize-html"

import { ShowRFPMetadata } from "./show-rfp"

export function ShowRFPSummary({
  chainId,
  rfpId,
  index,
  onRFPInfo,
}: {
  chainId: number
  rfpId: bigint
  index: number
  onRFPInfo?: (rfpInfo: any) => void
}) {
  const chain = chains.find((c) => c.id === chainId)
  const publicClient = usePublicClient({ chainId })

  const [indexerRFP, setIndexerRFP] = useState<IndexedRFP | undefined>(
    undefined
  )

  const [blockchainRFP, setBlockchainRFP] = useState<RFP | undefined>(undefined)
  const directMetadata = useMetadata<ShowRFPMetadata | undefined>({
    url: blockchainRFP?.metadata,
    defaultValue: undefined,
    emptyValue: {},
  })

  const getBlockchainRFP = async () => {
    if (!publicClient) {
      return
    }

    const rawRFP = await publicClient.readContract({
      abi: RFPsContract.abi,
      address: RFPsContract.address,
      functionName: "getRFP",
      args: [rfpId],
    })

    const rfp: RFP = {
      budget: [...rawRFP.budget].map((b) => {
        return { tokenContract: b }
      }),
      creator: rawRFP.creator,
      deadline: rawRFP.deadline,
      disputeManager: rawRFP.disputeManager,
      escrow: rawRFP.escrow,
      manager: rawRFP.manager,
      metadata: rawRFP.metadata,
      projects: arrayToIndexObject([
        ...rawRFP.projects.map((projects) => {
          return {
            ...projects,
            nativeReward: [...projects.nativeReward],
            reward: [...projects.reward],
          }
        }),
      ]),
      tasksManager: rawRFP.tasksManager,
    }
    setBlockchainRFP(rfp)
  }

  useEffect(() => {
    getBlockchainRFP().catch((err) => {
      console.error(err)
      setBlockchainRFP(undefined)
    })
  }, [rfpId, publicClient])

  useEffect(() => {
    const getIndexerRFP = async () => {
      const rfp = await getRFP(chainId, rfpId)
      setIndexerRFP(rfp)
    }

    getIndexerRFP().catch((err) => {
      console.error(err)
      setIndexerRFP(undefined)
    })
  }, [chainId, rfpId])

  useEffect(() => {
    if (blockchainRFP && onRFPInfo) {
      onRFPInfo({
        chainId,
        rfpId,
        deadline: Number(blockchainRFP.deadline),
        budget: indexerRFP?.usdValue ?? 0,
      })
    }
  }, [blockchainRFP, chainId, rfpId])

  const indexedMetadata = indexerRFP?.cachedMetadata
    ? (JSON.parse(indexerRFP?.cachedMetadata) as ShowRFPMetadata)
    : undefined
  const title = indexedMetadata?.title
  const tags = indexedMetadata?.tags ?? []
  const usdValue = indexerRFP?.usdValue ?? 0
  const description =
    directMetadata?.description ??
    indexedMetadata?.description ??
    "No description was provided."
  const deadline = blockchainRFP?.deadline ?? indexerRFP?.deadline

  return (
    <Card
      className={`w-full justify-between gap-x-[10px] border-x-0 border-b-2 border-t-0 py-[20px] !shadow-none md:flex ${index !== 0 && "rounded-none"} ${index === 0 && "rounded-b-none"}`}
    >
      <div className="w-full px-2 md:flex md:px-[25px]">
        <div className="!px-0 md:w-[60%] lg:w-[55%] xl:w-[50%]">
          <CardHeader className="!px-0 !pb-0">
            <Link className="" href={`/rfps/${chainId}:${rfpId}`}>
              <div className="cursor-pointer text-lg font-bold">
                {title ?? <Skeleton className="bg-white md:h-6 md:w-[250px]" />}
              </div>
            </Link>
            <div className="overflow-hidden md:max-h-[100px]">
              <SanitizeHTML html={description} />
            </div>
          </CardHeader>
          <CardContent className="!px-0">
            <div className="space-x-1 space-y-2">
              <Badge variant="outline">
                Chain: {chain?.name ?? chainId.toString()}
              </Badge>
              <Badge variant="outline">RFP ID: {rfpId.toString()}</Badge>
              {tags
                .filter((tag) => tag.tag !== undefined)
                .map((tag, i) => (
                  <Badge key={i}>{tag.tag}</Badge>
                ))}
            </div>
          </CardContent>
        </div>
        <div className="text- text-sm md:w-[22%] md:pt-8 md:text-base">
          <span className="md:hidden">Budget: </span>${usdValue}
        </div>
        <div className="text-sm md:w-[16%] md:pt-8 md:text-base lg:w-[13%] xl:w-[10%]">
          <span className="md:hidden">Deadline: </span>
          {daysUntil(String(deadline))}
        </div>
      </div>
      <CardFooter>
        <Link
          className="mx-7 my-auto !mt-4 cursor-pointer justify-center whitespace-nowrap rounded-md border-[0.5px] border-[#0354EC] bg-transparent !py-[2px] px-[10px] text-[15px] text-[#0354EC] hover:bg-[#0354EC]  hover:text-white md:mx-0 md:!mt-0 md:mr-4 md:w-fit"
          href={`/rfps/${chainId}:${rfpId}`}
        >
          View RFP
        </Link>
      </CardFooter>
    </Card>
  )
}
