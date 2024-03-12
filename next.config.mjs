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
  webpack: (webpackConfig, { webpack }) => {
    // For wallet connect
    webpackConfig.externals.push("pino-pretty", "lokijs", "encoding")

    // Workaround until next fixed es6 imports (with .js extension)
    // https://github.com/vercel/next.js/discussions/32237
    webpackConfig.plugins.push(
      new webpack.NormalModuleReplacementPlugin(new RegExp(/\.js$/), function (
        /** @type {{ request: string }} */
        resource
      ) {
        if (resource.request === "./ipfs.js") {
          resource.request = resource.request.replace(".js", "")
        }
      })
    )
    return webpackConfig
  },
}

export default nextConfig
