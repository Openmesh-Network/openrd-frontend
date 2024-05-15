import { parseBigInt } from "@/openrd-indexer/utils/parseBigInt"

import { ShowRFP } from "@/components/rfps/show/show-rfp"

export default function RFPPage({
  params,
}: {
  params: { chainIdRfpId?: string }
}) {
  const split = params.chainIdRfpId?.split("%3A", 2) // %3A = :
  if (!split || split.length < 2) {
    return <span>Incorrect chain+rfp identifier!</span>
  }

  const chainId = parseInt(split[0])
  const rfpId = parseBigInt(split[1])
  if (Number.isNaN(chainId) || rfpId === undefined) {
    return <span>ChainId or RfpId is not a number.</span>
  }

  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <ShowRFP chainId={chainId} rfpId={rfpId} />
    </section>
  )
}
