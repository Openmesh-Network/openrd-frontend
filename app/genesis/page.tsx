import { Leaderboard } from "@/components/leaderboard"

export default function LeaderboardPage() {
  return (
    <section className="container grid items-center gap-6 pb-8 pt-6 md:py-10">
      <div className="flex max-w-[980px] flex-col items-start gap-2">
        <h1
          className="text-4xl font-extrabold leading-tight tracking-tighter md:text-5xl"
          style={{
            backgroundImage: "url(/images/genesis-text.png)",
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center",
            color: "transparent",
            backgroundClip: "text",
            WebkitBackgroundClip: "text",
          }}
        >
          Genesis Airdrop – The Big Thank You
        </h1>
        <p className="text-xl text-muted-foreground md:text-2xl">
          First-Ever sOPEN Distribution for Our Amazing Early Supporters
        </p>
      </div>
      <span className="pt-2">
        We want to thank everyone for the tremendous support over the last
        couple of weeks. Our community is{" "}
        <strong>
          more active than some of the most popular Web3 communities
        </strong>
        , and we couldn&apos;t have done it without you. Over the weekend,{" "}
        <strong>we made an important decision</strong>: for the first{" "}
        <strong>1,000 supporters</strong>, we will be distributing{" "}
        <strong>10x more sOPEN than originally planned</strong> as a token of
        our appreciation. The first 500 will be on a first come,{" "}
        <strong>first served basis</strong>, whereas the other 500 will be{" "}
        <strong>chosen at random</strong> from the remaining participants. The
        campaign starts at <strong>7 PM AEDT, 9th October</strong>. This is just
        the beginning—soon, Openmesh Community Governance will go live, giving
        you the opportunity to vote and actively shape the future of our
        ecosystem.
      </span>
      <Leaderboard />
    </section>
  )
}
