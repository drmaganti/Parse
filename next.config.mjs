/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  async redirects() {
    return [
      { source: "/about", destination: "/methodology", permanent: true },
    ];
  },
  async rewrites() {
    return {
      beforeFiles: [
        { source: "/", destination: "/home" },
        { source: "/app", destination: "/product" },
      ],
    };
  },
};

export default nextConfig;
