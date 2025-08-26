/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // не блокируем продакшн-сборку из-за ESLint
    ignoreDuringBuilds: true,
  },
  // если раньше отключали lightningcss — оставь строку ниже; иначе можно удалить
  experimental: {
    optimizeCss: false,
  },
};
module.exports = nextConfig;
