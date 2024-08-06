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
      title: "Donate",
      href: `/donate?tag=${JSON.stringify({
        equal: "Donate",
      })}&manager=${JSON.stringify({ equal: "0x24496D746Fd003397790E41d0d1Ce61F4F7fd61f" })}`,
    },
  ],
  links: {
    guide:
      "https://open-mesh.gitbook.io/l3a-dao-documentation/getting-started-create-tasks/create-a-task/connect-wallet",
    docs: "https://open-mesh.gitbook.io/l3a-dao-documentation/about/openr-and-d-101",
    forum: "https://circle.openmesh.network/",
    github: "https://github.com/Openmesh-Network/openrd",
  },
}
