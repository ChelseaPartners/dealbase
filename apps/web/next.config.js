/** @type {import('next').NextConfig} */
const nextConfig = {
  // Removed deprecated appDir experimental flag - it's now stable in Next.js 14
  transpilePackages: ['@dealbase/shared'],
  // Add stability configurations
  swcMinify: true,
  compress: true,
  // Ensure CSS is properly handled
  webpack: (config, { dev, isServer }) => {
    if (dev && !isServer) {
      // Add CSS stability in development
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    return config
  },
  // Add headers for better caching
  async headers() {
    return [
      {
        source: '/_next/static/css/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
