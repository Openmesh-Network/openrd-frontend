import { useEffect, useState } from "react"
import axios from "axios"

import {
  FetchMetadataRequest,
  FetchMetadataResponse,
} from "@/app/api/fetchMetadata/route"

export function useMetadata<T>({
  url,
  defaultValue,
  emptyValue,
}: {
  url?: string
  defaultValue: T
  emptyValue: T
}) {
  const [metadata, setMetadata] = useState<T>(defaultValue)
  useEffect(() => {
    const getMetadata = async () => {
      if (!url) {
        setMetadata(defaultValue)
        return
      }

      const request: FetchMetadataRequest = { url: url }
      const newMetadata = await axios
        .post("/api/fetchMetadata", request)
        .then((res) => res.data as FetchMetadataResponse)
        .then((res) => res.content)
        .catch((err) => {
          console.error(err)
          return undefined
        })
      setMetadata(
        newMetadata
          ? (JSON.parse(newMetadata) as T)
          : newMetadata === undefined
            ? defaultValue
            : emptyValue
      )
    }

    getMetadata().catch(console.error)
  }, [url])
  return metadata
}
