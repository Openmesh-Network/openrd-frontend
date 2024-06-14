"use client"

import { useEffect, useRef, useState } from "react"
import { RFPsContract } from "@/openrd-indexer/contracts/RFPs"
import { IndexedRFP, RFP } from "@/openrd-indexer/types/rfp"
import { erc20Abi, formatUnits } from "viem"
import { deepEqual, usePublicClient } from "wagmi"

import { chains } from "@/config/wagmi-config"
import { arrayToIndexObject } from "@/lib/array-to-object"
import { timestampToDateFormatted } from "@/lib/general-functions"
import { getRFP, getRFPEvent } from "@/lib/indexer"
import { objectKeysInt } from "@/lib/object-keys"
import { useAddressTitle } from "@/hooks/useAddressTitle"
import { useMetadata } from "@/hooks/useMetadata"
import { Budget, usePrice } from "@/hooks/usePrice"
import { Badge } from "@/components/ui/badge"
import { Link } from "@/components/ui/link"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useAbstractWalletClient } from "@/components/context/abstract-wallet-client"
import { ProjectCreationForm } from "@/components/rfps/forms/project-creation-form"
import { SanitizeHTML } from "@/components/sanitize-html"
import { ShowBudgetItem } from "@/components/tasks/show/show-budget-item"

import { ShowProject } from "./show-project"
import { ShowRFPEvent } from "./show-rfp-event"

// These variables could contain anything
// Should not assume these types are correct
export interface ShowRFPMetadata {
  title?: string
  tags?: { tag?: string }[]
  maxProjectFunding?: string
  maxAwardedProjects?: number
  description?: string
  projectRequirements?: string
  links?: {
    name?: string
    url?: string
  }[]
}

export function ShowRFP({
  chainId,
  rfpId,
}: {
  chainId: number
  rfpId: bigint
}) {
  const [activeTab, setActiveTab] = useState("description")

  const walletClient = useAbstractWalletClient({ chainId })
  const publicClient = usePublicClient({ chainId })
  const chain = chains.find((c) => c.id === chainId)

  const [blockchainRFP, setBlockchainRFP] = useState<RFP | undefined>(undefined)
  const directMetadata = useMetadata<ShowRFPMetadata | undefined>({
    url: blockchainRFP?.metadata,
    defaultValue: undefined,
    emptyValue: {},
  })
  const [indexerRFP, setIndexerRFP] = useState<IndexedRFP | undefined>(
    undefined
  )
  const [rfpAssets, setRFPAssets] = useState<Budget>({
    nativeBudget: BigInt(0),
    budget: [],
  })
  useEffect(() => {
    const getRFPAssets = async () => {
      const rfp = blockchainRFP ?? indexerRFP
      if (!rfp || !publicClient) {
        setRFPAssets({
          nativeBudget: BigInt(0),
          budget: [],
        })
        return
      }

      const balances = await Promise.all([
        publicClient.getBalance({ address: rfp.escrow }),
        publicClient.multicall({
          contracts: rfp.budget.map((b) => {
            return {
              abi: erc20Abi,
              address: b.tokenContract,
              functionName: "balanceOf",
              args: [rfp.escrow],
            }
          }),
          allowFailure: false,
        }),
      ])
      setRFPAssets({
        nativeBudget: balances[0] as bigint,
        budget: rfp.budget.map((b, i) => {
          return {
            ...b,
            amount: balances[1][i] as bigint,
          }
        }),
      })
    }

    getRFPAssets().catch(console.error)
  }, [blockchainRFP, indexerRFP, publicClient])
  const directPrice = usePrice({
    chainId: chainId,
    budget: rfpAssets,
  })

  const applyRef = useRef<HTMLDivElement>(null)

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

  const getIndexerRFP = async () => {
    const rfp = await getRFP(chainId, rfpId)
    setIndexerRFP(rfp)
  }
  useEffect(() => {
    getIndexerRFP().catch((err) => {
      console.error(err)
      setIndexerRFP(undefined)
    })
  }, [chainId, rfpId])

  const refresh = async () => {
    getBlockchainRFP().catch(console.error)
    getIndexerRFP().catch(console.error)
  }

  useEffect(() => {
    if (blockchainRFP && indexerRFP) {
      // Check for differences/inconsistencies (will be logged as warnings)
      compareRFPs(
        blockchainRFP,
        indexerRFP,
        `Mismatch in blockchain rfp and indexer rfp`
      )
      console.log("Equality check finished")
    }
  }, [blockchainRFP, indexerRFP])

  const indexedMetadata = indexerRFP?.cachedMetadata
    ? (JSON.parse(indexerRFP?.cachedMetadata) as ShowRFPMetadata)
    : undefined
  const title =
    directMetadata?.title ?? indexedMetadata?.title ?? "No title was provided."
  const tags = directMetadata?.tags ?? indexedMetadata?.tags ?? []
  const maxProjectFunding =
    directMetadata?.maxProjectFunding ?? indexedMetadata?.maxProjectFunding
  const maxAwardedProjects =
    directMetadata?.maxAwardedProjects ?? indexedMetadata?.maxAwardedProjects
  const description =
    directMetadata?.description ??
    indexedMetadata?.description ??
    "No description was provided."
  const projectRequirements =
    directMetadata?.projectRequirements ?? indexedMetadata?.projectRequirements
  const links = directMetadata?.links ?? indexedMetadata?.links ?? []

  const deadline = blockchainRFP?.deadline ?? indexerRFP?.deadline
  const manager = blockchainRFP?.manager ?? indexerRFP?.manager
  const tasksManager = blockchainRFP?.tasksManager ?? indexerRFP?.tasksManager
  const disputeManager =
    blockchainRFP?.disputeManager ?? indexerRFP?.disputeManager
  const creator = blockchainRFP?.creator ?? indexerRFP?.creator
  const escrow = blockchainRFP?.escrow ?? indexerRFP?.escrow
  const nativeBudget = rfpAssets.nativeBudget
  const budget = rfpAssets.budget
  const projects = blockchainRFP?.projects ?? indexerRFP?.projects ?? {}
  const usdValue = directPrice ?? indexerRFP?.usdValue ?? 0

  const managerTitle = useAddressTitle(manager)
  const tasksManagerTitle = useAddressTitle(tasksManager)
  const disputeManagerTitle = useAddressTitle(disputeManager)
  const creatorTitle = useAddressTitle(creator)

  const events = indexerRFP?.events ?? []
  const [budgetLink, setBudgetLink] = useState<string | undefined>(undefined)
  useEffect(() => {
    const getBudgetLink = async () => {
      if (!chain) {
        setBudgetLink(undefined)
        return
      }

      let newBudgetLink: string | undefined
      for (let i = 0; i < events.length; i++) {
        const eventIndex = events.at(i)
        if (eventIndex === undefined) {
          continue
        }
        const taskCreationEvent = await getRFPEvent(eventIndex)
        if (taskCreationEvent.type !== "RFPCreated") {
          continue
        }
        newBudgetLink = `${chain.blockExplorers.default.url}/tx/${taskCreationEvent.transactionHash}`
        break
      }
      setBudgetLink(newBudgetLink)
    }

    getBudgetLink().catch(console.error)
  }, [chain, events])

  return (
    <div>
      <div className="gap-x-[20px] md:flex md:justify-between">
        <div>
          <div className="flex max-w-[980px] flex-col items-start gap-2">
            <h1 className="text-3xl font-bold leading-tight tracking-tighter md:text-2xl">
              {title}
            </h1>
          </div>
          <div className="mb-[20px] grid grid-cols-1 gap-4">
            <div className="mb-[10px] mt-[30px] space-x-1">
              <Badge variant="outline">
                Chain: {chain?.name ?? chainId.toString()}
              </Badge>
              <Badge variant="outline">RFP ID: {rfpId.toString()}</Badge>
            </div>
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
            <Link
              href={budgetLink}
              target="_blank"
              className="mb-[5px] flex text-[12px] font-medium text-grey dark:text-light lg:text-[16px]"
            >
              <div className="mr-[22px] flex">
                <svg
                  className="mr-[10px] size-[22px]"
                  fill="currentColor"
                  viewBox="0 0 22 22"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M0 17.4152V19.25C0 20.7668 3.69531 22 8.25 22C12.8047 22 16.5 20.7668 16.5 19.25V17.4152C14.7254 18.6656 11.4812 19.25 8.25 19.25C5.01875 19.25 1.77461 18.6656 0 17.4152ZM13.75 5.5C18.3047 5.5 22 4.2668 22 2.75C22 1.2332 18.3047 0 13.75 0C9.19531 0 5.5 1.2332 5.5 2.75C5.5 4.2668 9.19531 5.5 13.75 5.5ZM0 12.9078V15.125C0 16.6418 3.69531 17.875 8.25 17.875C12.8047 17.875 16.5 16.6418 16.5 15.125V12.9078C14.7254 14.3687 11.477 15.125 8.25 15.125C5.02305 15.125 1.77461 14.3687 0 12.9078ZM17.875 13.3805C20.3371 12.9035 22 12.0184 22 11V9.16523C21.0031 9.86992 19.5379 10.3512 17.875 10.6477V13.3805ZM8.25 6.875C3.69531 6.875 0 8.41328 0 10.3125C0 12.2117 3.69531 13.75 8.25 13.75C12.8047 13.75 16.5 12.2117 16.5 10.3125C16.5 8.41328 12.8047 6.875 8.25 6.875ZM17.673 9.29414C20.2512 8.83008 22 7.91914 22 6.875V5.04023C20.4746 6.11875 17.8535 6.69883 15.0949 6.83633C16.3625 7.45078 17.2949 8.27578 17.673 9.29414Z" />
                </svg>
                <p className="mr-[3px] flex items-center">Available funds:</p>{" "}
                <span className="flex items-center text-[12px] font-bold text-black dark:text-white lg:text-[16px]">
                  ${usdValue.toFixed(2)}
                </span>
              </div>
            </Link>
            <div className="mb-[5px] text-[12px] font-medium text-grey dark:text-light md:flex lg:text-[16px]">
              <div className="mr-[50px] flex">
                <svg
                  className="mr-[10px] size-[22px]"
                  fill="currentColor"
                  viewBox="0 0 25 18"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M7.5 9C9.91797 9 11.875 7.04297 11.875 4.625C11.875 2.20703 9.91797 0.25 7.5 0.25C5.08203 0.25 3.125 2.20703 3.125 4.625C3.125 7.04297 5.08203 9 7.5 9ZM10.5 10.25H10.1758C9.36328 10.6406 8.46094 10.875 7.5 10.875C6.53906 10.875 5.64062 10.6406 4.82422 10.25H4.5C2.01562 10.25 0 12.2656 0 14.75V15.875C0 16.9102 0.839844 17.75 1.875 17.75H13.125C14.1602 17.75 15 16.9102 15 15.875V14.75C15 12.2656 12.9844 10.25 10.5 10.25ZM18.75 9C20.8203 9 22.5 7.32031 22.5 5.25C22.5 3.17969 20.8203 1.5 18.75 1.5C16.6797 1.5 15 3.17969 15 5.25C15 7.32031 16.6797 9 18.75 9ZM20.625 10.25H20.4766C19.9336 10.4375 19.3594 10.5625 18.75 10.5625C18.1406 10.5625 17.5664 10.4375 17.0234 10.25H16.875C16.0781 10.25 15.3438 10.4805 14.6992 10.8516C15.6523 11.8789 16.25 13.2422 16.25 14.75V16.25C16.25 16.3359 16.2305 16.418 16.2266 16.5H23.125C24.1602 16.5 25 15.6602 25 14.625C25 12.207 23.043 10.25 20.625 10.25Z" />
                </svg>
                <p className="mr-[3px] flex items-center">
                  Max project funding:
                </p>{" "}
                <span className="flex items-center text-[12px] font-bold text-black dark:text-white lg:text-[16px]">
                  {maxProjectFunding}
                </span>
              </div>
              <div className="mr-[50px] mt-[25px] flex lg:mt-0">
                <svg
                  className="mr-[10px] size-[22px]"
                  fill="currentColor"
                  viewBox="0 0 22 22"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M11 0C4.92339 0 0 4.92339 0 11C0 17.0766 4.92339 22 11 22C17.0766 22 22 17.0766 22 11C22 4.92339 17.0766 0 11 0ZM13.5327 15.5286L9.62056 12.6855C9.48306 12.5835 9.40323 12.4238 9.40323 12.2552V4.79032C9.40323 4.49758 9.64274 4.25806 9.93548 4.25806H12.0645C12.3573 4.25806 12.5968 4.49758 12.5968 4.79032V10.898L15.4133 12.9472C15.6528 13.1202 15.7016 13.4528 15.5286 13.6923L14.2778 15.4133C14.1048 15.6484 13.7722 15.7016 13.5327 15.5286Z" />
                </svg>
                <p className="mr-[3px] flex items-center">
                  Max awarded projects:
                </p>{" "}
                <span className="flex items-center text-[12px] font-bold text-black dark:text-white  lg:text-[16px]">
                  {maxAwardedProjects}
                </span>
              </div>
              <div className="mr-[10px] mt-[25px] flex text-black dark:text-light lg:mt-0">
                <a
                  target="_blank"
                  rel="noopener noreferrer"
                  href="https://github.com/Openmesh-Network"
                  className="mr-[18px]  cursor-pointer hover:text-primary"
                >
                  <svg
                    className="size-[22px]"
                    fill="currentColor"
                    viewBox="0 0 23 22"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M7.54703 17.7144C7.54703 17.8053 7.4424 17.8781 7.31047 17.8781C7.16035 17.8918 7.05572 17.819 7.05572 17.7144C7.05572 17.6234 7.16035 17.5506 7.29228 17.5506C7.42875 17.537 7.54703 17.6097 7.54703 17.7144ZM6.13225 17.5097C6.1004 17.6006 6.19139 17.7053 6.32786 17.7326C6.44614 17.7781 6.58261 17.7326 6.60991 17.6416C6.6372 17.5506 6.55077 17.446 6.41429 17.405C6.29602 17.3732 6.16409 17.4187 6.13225 17.5097ZM8.14297 17.4323C8.01104 17.4642 7.92006 17.5506 7.93371 17.6552C7.94735 17.7462 8.06563 17.8054 8.20211 17.7735C8.33403 17.7417 8.42501 17.6552 8.41137 17.5642C8.39772 17.4778 8.27489 17.4187 8.14297 17.4323ZM11.1363 0C4.82664 0 0 4.79025 0 11.0999C0 16.1449 3.1753 20.4621 7.7108 21.9815C8.29309 22.0861 8.4978 21.7267 8.4978 21.431C8.4978 21.149 8.48415 19.5932 8.48415 18.6378C8.48415 18.6378 5.29975 19.3202 4.63103 17.2822C4.63103 17.2822 4.11243 15.9584 3.36637 15.6172C3.36637 15.6172 2.32461 14.903 3.43915 14.9166C3.43915 14.9166 4.57189 15.0076 5.19512 16.0903C6.19139 17.8463 7.86092 17.3413 8.51145 17.0411C8.61608 16.3132 8.91177 15.8083 9.23931 15.508C6.69634 15.226 4.13062 14.8575 4.13062 10.4812C4.13062 9.23021 4.47636 8.60243 5.20422 7.80178C5.08594 7.50609 4.69927 6.28692 5.3225 4.71291C6.27327 4.41722 8.46141 5.94118 8.46141 5.94118C9.37124 5.68643 10.3493 5.55451 11.3183 5.55451C12.2872 5.55451 13.2653 5.68643 14.1751 5.94118C14.1751 5.94118 16.3633 4.41267 17.314 4.71291C17.9373 6.29147 17.5506 7.50609 17.4323 7.80178C18.1602 8.60698 18.606 9.23476 18.606 10.4812C18.606 14.8712 15.9266 15.2214 13.3836 15.508C13.8021 15.8674 14.1569 16.5498 14.1569 17.6188C14.1569 19.1519 14.1433 21.0489 14.1433 21.4219C14.1433 21.7176 14.3526 22.077 14.9303 21.9724C19.4794 20.4621 22.5638 16.1449 22.5638 11.0999C22.5638 4.79025 17.446 0 11.1363 0ZM4.42177 15.69C4.36263 15.7355 4.37628 15.8401 4.45361 15.9266C4.5264 15.9993 4.63103 16.0312 4.69017 15.972C4.74931 15.9266 4.73566 15.8219 4.65832 15.7355C4.58554 15.6627 4.48091 15.6309 4.42177 15.69ZM3.93046 15.3215C3.89862 15.3807 3.94411 15.4534 4.03509 15.4989C4.10788 15.5444 4.19886 15.5308 4.2307 15.4671C4.26255 15.408 4.21706 15.3352 4.12607 15.2897C4.03509 15.2624 3.9623 15.276 3.93046 15.3215ZM5.40438 16.941C5.3316 17.0002 5.35889 17.1366 5.46352 17.2231C5.56815 17.3277 5.70008 17.3413 5.75922 17.2686C5.81836 17.2094 5.79106 17.0729 5.70008 16.9865C5.6 16.8819 5.46352 16.8682 5.40438 16.941ZM4.88578 16.2723C4.81299 16.3178 4.81299 16.4361 4.88578 16.5407C4.95857 16.6453 5.08139 16.6908 5.14053 16.6453C5.21332 16.5862 5.21332 16.4679 5.14053 16.3633C5.07685 16.2586 4.95857 16.2132 4.88578 16.2723Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>
        <div className="w-full text-grey dark:text-light lg:w-[163px]">
          <div className="mt-[25px] flex text-[12px] font-bold !leading-[150%] text-grey dark:text-light lg:block lg:text-[16px]">
            <p className="mr-[10px] lg:mr-0"> Deadline: </p>
            <p className="font-medium text-black dark:text-white">
              {timestampToDateFormatted(String(deadline))}
            </p>
          </div>
          <div className="mb-6 mt-[25px] md:mb-0">
            <a
              onClick={() => {
                setActiveTab("projects")
                setTimeout(() => {
                  if (applyRef.current) {
                    applyRef.current.scrollIntoView({
                      behavior: "smooth",
                    })
                  }
                }, 100)
              }}
              className="flex h-[43px] w-[163px] cursor-pointer items-center justify-center rounded-[10px] bg-[#12AD50] text-[12px] font-bold text-white hover:bg-[#0b9040] lg:text-[16px] "
            >
              {"Apply now"}
            </a>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4">
        <Tabs
          defaultValue="description"
          value={activeTab}
          onValueChange={setActiveTab}
        >
          <TabsList className="max-w-[250px] !overflow-auto md:max-w-full">
            <TabsTrigger value="description">Description</TabsTrigger>
            <TabsTrigger value="general">General info</TabsTrigger>
            <TabsTrigger value="projects">Projects</TabsTrigger>
            {projectRequirements && (
              <TabsTrigger value="projectRequirements">
                Project Requirements
              </TabsTrigger>
            )}
            {events.length !== 0 && (
              <TabsTrigger value="events">Updates</TabsTrigger>
            )}
            {walletClient?.account?.address &&
              walletClient.account.address === manager && (
                <TabsTrigger value="manage">Manage</TabsTrigger>
              )}
          </TabsList>
          <TabsContent value="description">
            <SanitizeHTML html={description} styleClass="!text-lg" />
          </TabsContent>
          <TabsContent value="general">
            <div className="grid grid-cols-1 space-y-3 text-xs md:text-base">
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
              <Separator />
              <span>
                Deadline:{" "}
                {deadline
                  ? new Date(Number(deadline) * 1000).toDateString()
                  : "Unknown"}
              </span>
              <Link href={manager ? `/profile/${manager}` : undefined}>
                Manager:{" "}
                <span className="break-words hover:text-[#0354EC]">
                  {managerTitle ?? "Unknown"}
                </span>
              </Link>
              <Link
                href={tasksManager ? `/profile/${tasksManager}` : undefined}
              >
                Tasks Manager:{" "}
                <span className="break-words hover:text-[#0354EC]">
                  {tasksManagerTitle ?? "Unknown"}
                </span>
              </Link>
              <Link
                href={disputeManager ? `/profile/${disputeManager}` : undefined}
              >
                Dispute Manager:{" "}
                <span className="break-words hover:text-[#0354EC]">
                  {disputeManagerTitle ?? "Unknown"}
                </span>
              </Link>
              <Link href={creator ? `/profile/${creator}` : undefined}>
                Creator:{" "}
                <span className="break-words hover:text-[#0354EC]">
                  {creatorTitle ?? "Unknown"}
                </span>
              </Link>
              <Link
                href={
                  escrow && chain
                    ? `${chain.blockExplorers.default.url}/address/${escrow}`
                    : undefined
                }
                target="_blank"
              >
                Escrow:{" "}
                <span className="break-words hover:text-[#0354EC]">
                  {escrow ?? "Unknown"}
                </span>
              </Link>
              <Separator />
              {nativeBudget !== BigInt(0) && (
                <Link
                  href={
                    escrow && chain
                      ? `${chain.blockExplorers.default.url}/address/${escrow}`
                      : undefined
                  }
                  target="_blank"
                >
                  Native Budget:{" "}
                  {formatUnits(
                    nativeBudget,
                    chain?.nativeCurrency.decimals ?? 18
                  )}{" "}
                  {chain?.nativeCurrency.symbol}
                </Link>
              )}
              {budget.length !== 0 && (
                <div className="grid grid-cols-1">
                  <span>Budget:</span>
                  <ul>
                    {budget.map((budgetItem, i) => (
                      <li key={i}>
                        <ShowBudgetItem
                          budgetItem={budgetItem}
                          chainId={chainId}
                          escrow={escrow}
                        />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </TabsContent>
          <TabsContent value="projects">
            <div className="space-y-7">
              <div className="space-y-1">
                {objectKeysInt(projects)
                  .sort((projectId1, projectId2) => {
                    // All accepted projects first
                    const project1 = projects[projectId1]
                    const project2 = projects[projectId2]
                    if (!project2) {
                      return -1
                    }
                    if (!project1) {
                      return 1
                    }
                    if (project1.accepted && !project2.accepted) {
                      return -1
                    }
                    if (!project1.accepted && project2.accepted) {
                      return 1
                    }

                    // Finally in order of project (earliest first aka lowest id first)
                    return projectId1 - projectId2
                  })
                  .map((projectId) => (
                    <ShowProject
                      key={projectId}
                      chainId={chainId}
                      rfpId={rfpId}
                      projectId={projectId}
                      project={projects[projectId]}
                      rfp={blockchainRFP ?? indexerRFP}
                      indexerMetadata={
                        indexerRFP?.projects[projectId]?.cachedMetadata
                      }
                      refresh={refresh}
                    />
                  ))}
              </div>
              <Separator />
              {(blockchainRFP || indexerRFP) && (
                <div className="space-y-5 pb-[20px]">
                  <p ref={applyRef} className="text-2xl">
                    Apply for rfp:
                  </p>
                  <ProjectCreationForm
                    chainId={chainId}
                    rfpId={rfpId}
                    rfp={(blockchainRFP ?? indexerRFP) as RFP} // Cannot be undefined because of the conditional render
                    refresh={refresh}
                  />
                </div>
              )}
            </div>
          </TabsContent>
          {projectRequirements && (
            <TabsContent value="projectRequirements">
              <SanitizeHTML html={projectRequirements} />
            </TabsContent>
          )}
          <TabsContent value="events">
            <div className="grid grid-cols-1">
              {[...events].reverse().map((eventId, i) => (
                <ShowRFPEvent index={i} key={i} eventIndex={eventId} />
              ))}
            </div>
          </TabsContent>
          <TabsContent value="manage">Soon!</TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

function compareRFPs(
  blockchainRFP: RFP,
  indexerRFP: IndexedRFP,
  baseWarning: string
): void {
  objectKeysInt(blockchainRFP.projects).forEach((projectId) => {
    const projectWarning = `${baseWarning}: project ${projectId}`
    const blockchain = blockchainRFP.projects[projectId]
    const indexed = indexerRFP.projects[projectId]
    compareProperty(blockchain, indexed, "accepted", projectWarning)
    compareProperty(blockchain, indexed, "representative", projectWarning)
    compareProperty(blockchain, indexed, "metadata", projectWarning)
    compareProperty(blockchain, indexed, "nativeReward", projectWarning)
    compareProperty(blockchain, indexed, "reward", projectWarning)
  })
  if (
    Object.keys(indexerRFP.projects).length >
    Object.keys(blockchainRFP.projects).length
  ) {
    console.warn(`${baseWarning}: indexer contains non-existing projects`)
  }

  blockchainRFP.budget.forEach((_, budgetId) => {
    const budgetWarning = `${baseWarning}: budget ${budgetId}`
    const blockchain = blockchainRFP.budget[budgetId]
    const indexed = indexerRFP.budget[budgetId]
    compareProperty(blockchain, indexed, "tokenContract", budgetWarning)
  })
  if (indexerRFP.budget.length > blockchainRFP.budget.length) {
    console.warn(`${baseWarning}: indexer contains non-existing budget items`)
  }

  compareProperty(blockchainRFP, indexerRFP, "creator", baseWarning)
  compareProperty(blockchainRFP, indexerRFP, "deadline", baseWarning)
  compareProperty(blockchainRFP, indexerRFP, "disputeManager", baseWarning)
  compareProperty(blockchainRFP, indexerRFP, "escrow", baseWarning)
  compareProperty(blockchainRFP, indexerRFP, "manager", baseWarning)
  compareProperty(blockchainRFP, indexerRFP, "metadata", baseWarning)
  compareProperty(blockchainRFP, indexerRFP, "tasksManager", baseWarning)
  compareProperty(blockchainRFP, indexerRFP, "creator", baseWarning)
}

function compareProperty<T>(
  obj1: T,
  obj2: T,
  key: keyof T,
  baseWarning: string
) {
  const value1 = obj1?.[key]
  const value2 = obj2?.[key]
  if (!deepEqual(value1, value2)) {
    console.warn(`${baseWarning}: ${String(key)} (${value1} vs ${value2})`)
  }
}
