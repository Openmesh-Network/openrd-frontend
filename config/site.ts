export type SiteConfig = typeof siteConfig

export const siteConfig = {
  name: "OpenR&D" as const,
  description:
    "Open-source platform designed to empower decentralized teams to collaborate seamlessly." as const,
  mainNav: [
    {
      title: "Home",
      href: "/",
    },
    {
      title: "Tasks",
      href: "/tasks/",
    },
    // {
    //   title: "Organizations",
    //   href: "/organizations/",
    // },
    {
      title: "Request for Proposals",
      href: "/rfps/",
    },
  ],
  links: {
    guide: "https://discord.gg/6QDSHqbBvP", // Should be replaced when the guide is made
    docs: "https://open-mesh.gitbook.io/l3a-dao-documentation/about/openr-and-d-101",
    forum: "https://circle.openmesh.network/",
  },
}
