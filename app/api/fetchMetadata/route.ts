import { fetchMetadata } from "@/openrd-indexer/utils/metadata-fetch"

export interface FetchMetadataRequest {
  url: string
}

export interface FetchMetadataResponse {
  content: string
}

export async function POST(req: Request) {
  try {
    const params = JSON.parse(await req.text()) as FetchMetadataRequest
    const response = await fetchMetadata(params.url)
    return Response.json({ content: response }, { status: 200 })
  } catch (error: any) {
    return Response.json(
      { error: error?.message ?? JSON.stringify(error) },
      { status: 500 }
    )
  }
}
