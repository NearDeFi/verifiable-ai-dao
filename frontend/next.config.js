const isProduction = process.env.NODE_ENV === 'production'

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  output: "export",
  distDir: 'build',
  reactStrictMode: true,
}

module.exports = nextConfig;