/* eslint-disable @next/next/no-img-element */
"use client"

import { useEffect, useState } from "react"
import { RFPsContract } from "@/openrd-indexer/contracts/RFPs"
import { Project, RFP } from "@/openrd-indexer/types/rfp"
import { Reward } from "@/openrd-indexer/types/tasks"
import { BaseError, ContractFunctionRevertedError, decodeEventLog } from "viem"
import { useChainId, usePublicClient, useSwitchChain } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { getUser } from "@/lib/indexer"
import { useENS } from "@/hooks/useENS"
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
import { Link } from "@/components/ui/link"
import { ToastAction } from "@/components/ui/toast"
import { useToast } from "@/components/ui/use-toast"
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
  const connectedChainId = useChainId()
  const { switchChainAsync } = useSwitchChain()
  const walletClient = useAbstractWalletClient()
  const publicClient = usePublicClient()
  const { toast } = useToast()
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

  const [acceptingProject, setAcceptingProject] = useState<boolean>(false)
  async function acceptProject() {
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
    if (acceptingProject) {
      toast({
        title: "Please wait",
        description: "The past accept is still running.",
        variant: "destructive",
      })
      return
    }
    const accept = async () => {
      setAcceptingProject(true)
      let { dismiss } = toast({
        title: "Generating transaction",
        description: "Please sign the transaction in your wallet...",
      })

      if (!publicClient || !walletClient?.account) {
        dismiss()
        toast({
          title: "Project accept failed",
          description: `${publicClient ? "Wallet" : "Public"}Client is undefined.`,
          variant: "destructive",
        })
        return
      }
      const transactionRequest = await publicClient
        .simulateContract({
          account: walletClient.account,
          abi: RFPsContract.abi,
          address: RFPsContract.address,
          functionName: "acceptProject",
          args: [
            rfpId,
            projectId,
            project.nativeReward.map((r) => r.amount), // accept their requested budget, should make this configurable in a form
            project.reward.map((r) => r.amount), // accept their requested budget, should make this configurable in a form
          ],
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
          title: "Project accept failed",
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
          title: "Project accept failed",
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

      let projectAccepted = false
      receipt.logs.forEach((log) => {
        try {
          if (
            log.address.toLowerCase() !== RFPsContract.address.toLowerCase()
          ) {
            // Only interested in logs originating from the rfps contract
            return
          }

          const projectAcceptedEvent = decodeEventLog({
            abi: RFPsContract.abi,
            eventName: "ProjectAccepted",
            topics: log.topics,
            data: log.data,
          })
          if (
            projectAcceptedEvent.args.rfpId === rfpId &&
            projectAcceptedEvent.args.projectId === projectId
          ) {
            projectAccepted = true
          }
        } catch {}
      })
      if (!projectAccepted) {
        dismiss()
        toast({
          title: "Error confirming accept",
          description: "The project accept possibly failed.",
          variant: "destructive",
        })
        return
      }

      dismiss()
      dismiss = toast({
        title: "Success!",
        description: "The project has been accepted.",
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

    await accept().catch(console.error)
    setAcceptingProject(false)
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
            <img
              alt="matic"
              src={`https://effigy.im/a/${project.representative}.svg`}
              className="w-[35px] rounded-full"
            ></img>
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
                    className="ml-1  border-b-[0.5px] border-[#505050] dark:border-[#7F8DA3]"
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
              disabled={acceptingProject}
            >
              Accept project
            </Button>
          </CardFooter>
        )}
    </Card>
  )
}
