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
    {
      title: "Genesis",
      href: "/genesis",
    },
  ],
  links: {
    guide:
      "https://docs.openmesh.network/open-source-initiatives/openr-and-d/getting-started/perform-tasks/apply-to-task",
    docs: "https://docs.openmesh.network/open-source-initiatives/openr-and-d",
    forum: "https://circle.openmesh.network/",
    github: "https://github.com/Openmesh-Network/openrd",
  },
}
