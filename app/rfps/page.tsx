import { RFPOverview } from "@/components/rfps/show/rfp-overview"

export default function RFPsPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-xl font-extrabold leading-tight tracking-tighter md:text-2xl">
          RFPs
        </h1>
      </div>
      <RFPOverview />
    </section>
  )
}
