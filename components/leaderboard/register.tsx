"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import axios from "axios"
import { CheckCircle2 } from "lucide-react"
import { zeroAddress } from "viem"
import { useWalletClient } from "wagmi"

import { formatAddress } from "@/lib/general-functions"
import { useLoggers } from "@/hooks/useLoggers"

import { LoginWithX } from "../social/login-with-x"
import { Button } from "../ui/button"
import { Link } from "../ui/link"
import { ConnectButton } from "../web3/connect-button"

export function LeaderboardRegister() {
  const { data: walletClient } = useWalletClient()
  const loggers = useLoggers()
  const queryClient = useQueryClient()

  const { data: metadataRequests } = useQuery({
    initialData: [],
    queryKey: [
      "metadataRequests",
      walletClient?.account.address ?? zeroAddress,
    ],
    queryFn: async () => {
      const address = walletClient?.account.address
      if (!address) {
        return []
      }

      return await axios
        .get(`/leaderboard-indexer/metadataRequests/${address}`)
        .then((res) => res.data as { metadataField: "x"; value: string }[])
    },
  })

  const [clickedFollow, setClickedFollow] = useState<boolean>(false)
  const onClickFollow = () => {
    window.open("https://x.com/OpenmeshNetwork", "_blank")
    setClickedFollow(true)
  }

  const [clickedRetweet, setClickedRetweet] = useState<boolean>(false)
  const onClickRetweet = () => {
    window.open(
      "https://x.com/OpenmeshNetwork/status/1843925647661605320",
      "_blank"
    )
    setClickedRetweet(true)
  }

  const register = async () => {
    if (!walletClient) {
      loggers.onError?.({
        title: "WalletClient undefined",
        description: "Please refresh the page or log out and in again.",
      })
      return
    }
    if (metadataRequests.length === 0) {
      loggers.onError?.({
        title: "No pending request found",
        description: "Please refresh the page or log out and in again.",
      })
      return
    }
    const address = walletClient.account.address
    const request = JSON.stringify(metadataRequests.at(-1))

    loggers.onUpdate?.({
      title: "Sign confirmation",
      description: "Verify and sign the confirmation message in your wallet.",
    })
    const signature = await walletClient
      .signMessage({
        account: address,
        message: `Accept Openmesh Leaderboard metadata request: ${request}`,
      })
      .catch((err) => {
        loggers.onError?.({
          title: "Signature Error",
          description: "Signature result was not given.",
          error: err,
        })
        return undefined
      })
    if (!signature) {
      return
    }

    loggers.onUpdate?.({
      title: "Verifying signature",
      description: "Signature has been submitted and is being verified...",
    })
    await axios
      .post("/leaderboard-indexer/acceptMetadataRequest", undefined, {
        params: {
          address,
          request,
          signature,
        },
      })
      .then(async () => {
        loggers.onUpdate?.({
          title: "X account linked",
          description: "Registering for droplist...",
        })
        await axios
          .post("/leaderboard-indexer/registerDroplist", undefined, {
            params: {
              address,
            },
          })
          .then(() => {
            loggers.onSuccess?.({
              title: "Registration finished",
              description: "You have successfully registered.",
            })
            queryClient.invalidateQueries({ queryKey: ["droplist"] })
          })
          .catch((err) => {
            loggers.onError?.({
              title: "Droplist registration failed",
              description:
                err?.response?.data?.error ?? "An unknown error has occurred.",
              error: err,
            })
          })
      })
      .catch((err) => {
        console.log(err)
        loggers.onError?.({
          title: "Signature rejected",
          description:
            err?.response?.data?.error ?? "An unknown error has occurred.",
          error: err,
        })
      })
  }

  const step1Done = walletClient !== undefined
  const step2Done = step1Done && metadataRequests.length > 0
  const step3Done = step2Done && clickedFollow
  const step4Done = step3Done && clickedRetweet

  return (
    <div className="flex w-full flex-col gap-5">
      <div className="flex flex-col gap-1">
        <span className="text-xl">Step 1 - Log in</span>
        {step1Done ? (
          <div className="flex gap-1">
            <CheckCircle2 className="text-green-600" />
            <Link
              href={`https://etherscan.io/address/${walletClient.account.address}`}
              target="_blank"
            >
              {formatAddress(walletClient.account.address)}
            </Link>
          </div>
        ) : (
          <div>
            <ConnectButton />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xl">Step 2 - Connect X</span>
        {step2Done ? (
          <div className="flex place-items-center gap-1">
            <CheckCircle2 className="text-green-600" />
            <Link
              href={`https://x.com/${metadataRequests.at(-1)?.value}`}
              target="_blank"
            >
              @{metadataRequests.at(-1)?.value}
            </Link>
            <LoginWithX
              className="h-auto p-1"
              address={walletClient?.account.address}
              text="Change"
              variant={"outline"}
            />
          </div>
        ) : (
          <div>
            <LoginWithX
              address={walletClient?.account.address}
              text="Login with X"
            />
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xl">Step 3 - Follow @OpenmeshNetwork</span>
        {step3Done ? (
          <div className="flex gap-1">
            <CheckCircle2 className="text-green-600" />
            <span>Will be checked several times before the distribution.</span>
          </div>
        ) : (
          <div>
            <Button disabled={!step2Done} onClick={() => onClickFollow()}>
              Follow @OpenmeshNetwork
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xl">Step 4 - Comment & Retweet</span>
        {step4Done ? (
          <div className="flex gap-1">
            <CheckCircle2 className="text-green-600" />
            <span>Will be checked several times before the distribution.</span>
          </div>
        ) : (
          <div>
            <Button disabled={!step3Done} onClick={() => onClickRetweet()}>
              Comment & Retweet
            </Button>
          </div>
        )}
      </div>
      <div className="flex flex-col gap-1">
        <span className="text-xl">Step 5</span>
        <div>
          <Button
            disabled={!step4Done}
            onClick={() => register().catch(console.error)}
          >
            Whitelist
          </Button>
        </div>
      </div>
    </div>
  )
}
