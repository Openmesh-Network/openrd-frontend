import { isAddress } from "viem"

import { ShowProfile } from "@/components/profile/show-profile"

export default function ProfilePage({
  params,
}: {
  params: { address?: string }
}) {
  if (!params.address || !isAddress(params.address)) {
    return <span>Incorrect address.</span>
  }

  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <ShowProfile address={params.address} />
    </section>
  )
}
