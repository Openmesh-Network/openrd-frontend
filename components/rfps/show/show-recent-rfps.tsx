"use client"

import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"

import { ShowRFPSummary } from "./show-rfp-summary"

export interface RFPIdentifier {
  chainId: number
  rfpId: bigint
}

export function ShowRecentRFPss({ rfpList }: { rfpList: RFPIdentifier[] }) {
  const [showRFPCount, setShowRFPCount] = useState<number>(10)

  return (
    <div>
      <div className="flex overflow-x-auto rounded-[10px] border-[0.7px] bg-transparent text-[16px] font-medium">
        <div className="w-1/2 px-[25px] py-[10px]">
          <span>Project</span>
        </div>
        <div className="invisible w-1/5 items-center px-[25px] py-[10px] text-center md:visible">
          <span>Budget</span>
        </div>
        <div className="invisible w-1/5 items-center px-[25px] py-[10px] text-center md:visible">
          <span>Ends</span>
        </div>
        <div className="invisible w-[10%] items-center px-[25px] py-[10px] text-center md:visible">
          {/* Empty space */}
        </div>
      </div>
      {rfpList.slice(0, showRFPCount).map((rfp, i) => (
        <div>
          <ShowRFPSummary key={i} {...rfp} />
          <Separator />
        </div>
      ))}
      {showRFPCount < rfpList.length && (
        <Button
          className="w-full bg-primary/5 text-primary hover:bg-primary/10"
          onClick={() => {
            setShowRFPCount(showRFPCount + 10)
          }}
        >
          Show more
        </Button>
      )}
    </div>
  )
}
