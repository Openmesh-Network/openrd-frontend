"use client"

import { useEffect, useState } from "react"
import {
  Submission,
  SubmissionJudgement,
  Task,
  TaskState,
} from "@/openrd-indexer/types/tasks"
import { fetchMetadata } from "@/openrd-indexer/utils/metadata-fetch"
import { useAccount } from "wagmi"

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
import { SanitizeHTML } from "@/components/sanitize-html"

import { SubmissionReviewForm } from "../forms/submission-review-form"

export interface ShowSubmissionMetadata {
  explanation?: string
}

export interface ShowSubmissionFeedbackMetadata {
  feedback?: string
}

export function ShowSubmission({
  chainId,
  taskId,
  submissionId,
  submission,
  indexerMetadata,
  indexerFeedbackMetadata,
  task,
  refresh,
}: {
  chainId: number
  taskId: bigint
  submissionId: number
  submission: Submission
  indexerMetadata?: string
  indexerFeedbackMetadata?: string
  task?: Task
  refresh: () => Promise<void>
}) {
  const account = useAccount()

  const [directMetadata, setDirectMetadata] = useState<
    ShowSubmissionMetadata | undefined
  >(undefined)
  useEffect(() => {
    const getMetadata = async () => {
      const metadata = await fetchMetadata(submission.metadata)
      setDirectMetadata(
        metadata ? (JSON.parse(metadata) as ShowSubmissionMetadata) : {}
      )
    }

    getMetadata().catch(console.error)
  }, [submission.metadata])

  const [directFeedbackMetadata, setDirectFeedbackMetadata] = useState<
    ShowSubmissionFeedbackMetadata | undefined
  >(undefined)
  useEffect(() => {
    const getMetadata = async () => {
      const metadata = await fetchMetadata(submission.feedback)
      setDirectFeedbackMetadata(
        metadata ? (JSON.parse(metadata) as ShowSubmissionFeedbackMetadata) : {}
      )
    }

    getMetadata().catch(console.error)
  }, [submission.feedback])

  const indexedMetadata = indexerMetadata
    ? (JSON.parse(indexerMetadata) as ShowSubmissionMetadata)
    : undefined
  const explanation =
    directMetadata?.explanation ?? indexedMetadata?.explanation

  const indexedFeedbackMetadata = indexerFeedbackMetadata
    ? (JSON.parse(indexerFeedbackMetadata) as ShowSubmissionFeedbackMetadata)
    : undefined
  const feedback =
    directFeedbackMetadata?.feedback ?? indexedFeedbackMetadata?.feedback

  const [firstRender, setFirstRender] = useState(true)
  useEffect(() => {
    setFirstRender(false)
  }, [])

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex space-x-2">
          {/* Would be cool to add a hover effect here to show stats of the person (completion rate etc.) */}
          <span>Submission #{submissionId}</span>
          {submission.judgement === SubmissionJudgement.Accepted && (
            <Badge variant="success">Accepted</Badge>
          )}
          {submission.judgement === SubmissionJudgement.Rejected && (
            <Badge variant="destructive">Rejected</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {explanation && <SanitizeHTML html={explanation} />}
      </CardContent>
      <CardFooter>
        <Separator />
      </CardFooter>
      <CardFooter>
        {submission.judgement !== SubmissionJudgement.None && feedback && (
          <SanitizeHTML html={feedback} />
        )}
        {!firstRender &&
          task?.state === TaskState.Taken &&
          submission.judgement === SubmissionJudgement.None &&
          account.address === task?.manager && (
            <SubmissionReviewForm
              chainId={chainId}
              taskId={taskId}
              submissionId={submissionId}
              refresh={refresh}
            />
          )}
      </CardFooter>
    </Card>
  )
}
