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
      href: "/tasks",
    },
    {
      title: "RFPs",
      href: "/rfps",
    },
    // {
    //   title: "Genesis",
    //   href: "/genesis",
    // },
  ],
  links: {
    guide:
      "https://open-mesh.gitbook.io/l3a-dao-documentation/getting-started-create-tasks/create-a-task/connect-wallet",
    docs: "https://open-mesh.gitbook.io/l3a-dao-documentation/about/openr-and-d-101",
    forum: "https://circle.openmesh.network/",
    github: "https://github.com/Openmesh-Network/openrd",
  },
}
