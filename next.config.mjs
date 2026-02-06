/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone",
  async rewrites() {
    return [
      {
        source: "/api/proxy/:path*",
        destination: "https://dev-interface.cournot.ai/play/polymarket/:path*",
      },
    ];
  },
};

export default nextConfig;
