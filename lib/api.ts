import { Loggers } from "@plopmenz/viem-extensions"
import axios from "axios"

import { AddToIpfsRequest, AddToIpfsResponse } from "@/app/api/addToIpfs/route"

export async function addToIpfs(
  metadata: any,
  loggers: Loggers
): Promise<string | undefined> {
  loggers.onUpdate?.({
    title: "Updating metadata",
    description: "Uploading metadata to IPFS...",
  })

  const addToIpfsRequest: AddToIpfsRequest = {
    json: JSON.stringify(metadata),
  }
  const cid = await axios
    .post("/api/addToIpfs", addToIpfsRequest)
    .then((response) => (response.data as AddToIpfsResponse).cid)
    .catch((err) => {
      console.error(err)
      return undefined
    })
  if (!cid) {
    loggers.onError?.({
      title: "Metadata update failed",
      description: "Could not upload metadata to IPFS.",
    })
    return
  }
  console.log(`Successfully uploaded updated metadata to ipfs: ${cid}`)
  return cid
}
