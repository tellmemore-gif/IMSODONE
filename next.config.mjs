/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ["recharts"]
  },
  outputFileTracingIncludes: {
    "/*": ["./data/**/*"]
  }
};

export default nextConfig;
