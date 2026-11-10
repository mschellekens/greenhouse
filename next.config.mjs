/** @type {import('next').NextConfig} */
const repo = "/greenhouse";
const nextConfig = {
  reactStrictMode: true,
  output: "export",
  trailingSlash: true,
  basePath: repo,
  assetPrefix: repo,
  images: { unoptimized: true },
};
export default nextConfig;
