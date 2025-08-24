// next.config.mjs
const isProd = process.env.NODE_ENV === 'production';

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',                // даёт статический билд в папку out
  basePath: isProd ? '/dota-platform' : '',
  assetPrefix: isProd ? '/dota-platform/' : '',
  images: { unoptimized: true },   // GitHub Pages не умеет next/image-оптимизацию
};

export default nextConfig;
