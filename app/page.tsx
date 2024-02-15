import Link from "next/link"

import { siteConfig } from "@/config/site"
import { buttonVariants } from "@/components/ui/button"
import { ShowRecentEvents } from "@/components/tasks/show/show-recent-events"

export default function IndexPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1 className="text-3xl font-extrabold leading-tight tracking-tighter md:text-4xl">
          OpenR&D
        </h1>
        <p className="max-w-[700px] text-lg text-muted-foreground">
          Open-source platform designed to empower decentralized teams to
          collaborate seamlessly.
        </p>
      </div>
      <div className="flex gap-4">
        <Link
          href={siteConfig.links.guide}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants()}
        >
          Get started
        </Link>
        <Link
          href={siteConfig.links.docs}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants()}
        >
          Documentation
        </Link>
        <Link
          href={siteConfig.links.forum}
          target="_blank"
          rel="noreferrer"
          className={buttonVariants()}
        >
          Join the community
        </Link>
      </div>
      <ShowRecentEvents />
    </section>
  )
}
