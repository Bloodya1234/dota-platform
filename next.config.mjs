/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: { ignoreDuringBuilds: true },
  experimental: { optimizeCss: false },
  // redirects() НЕ добавляем; всё решает server-redirect в src/app/page.js
};

export default nextConfig;
