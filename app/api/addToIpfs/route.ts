import { addToIpfs } from "@/openrd-indexer/utils/ipfs"

export interface AddToIpfsRequest {
  json: string
}

export interface AddToIpfsResponse {
  cid: string
}

export async function POST(req: Request) {
  try {
    const params = JSON.parse(await req.text()) as AddToIpfsRequest
    const response = await addToIpfs(params.json)
    return Response.json({ cid: response }, { status: 200 })
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? JSON.stringify(error) },
      { status: 500 }
    )
  }
}
