"use client"

import { useState } from "react"

import { Link } from "@/components/ui/link"
import { RPFsFilter } from "@/components/rfps/filter/rfps-filter"

import { RFPIdentifier, ShowRecentRFPss } from "./show-recent-rfps"

export function RFPOverview() {
  const [rfpList, setRFPList] = useState<RFPIdentifier[]>([])

  return (
    <div className="grid grid-cols-1 gap-y-3">
      <Link
        href="/rfps/create"
        className="flex w-fit cursor-pointer items-center justify-center rounded-md border-[0.5px] border-[#0354EC] bg-transparent !py-[2px] px-[10px] text-[14px] text-[#0354EC] hover:bg-[#0354EC] hover:text-white md:ml-auto"
      >
        + Add a RFP
      </Link>
      <RPFsFilter onFilterApplied={setRFPList} />
      <ShowRecentRFPss rfpList={rfpList} />
    </div>
  )
}
