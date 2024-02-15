/** @type {import('next').NextConfig} */
const nextConfig = {
  rewrites: () => [
    {
      source: "/indexer/:call*",
      destination: "https://openrd.plopmenz.com/indexer/:call*",
    },
  ],
  reactStrictMode: true,
  images: {
    remotePatterns: [
      {
        hostname: "static.alchemyapi.io",
      },
      {
        hostname: "s2.coinmarketcap.com",
      },
      {
        hostname: "logos.covalenthq.com",
      },
    ],
  },
}

export default nextConfig
