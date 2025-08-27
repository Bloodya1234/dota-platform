/** @type {import('next').NextConfig} */
const nextConfig = {
  // Не роняем билд из-за ESLint (можно убрать позже)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Отключаем lightningcss, чтобы избежать нативного бинарника
  experimental: {
    optimizeCss: false,
  },

  // Жёсткий редирект главной страницы на /login
  async redirects() {
    return [
      {
        source: '/',
        destination: '/login',
        permanent: false, // 307/308 (не кешируем навсегда)
      },
    ];
  },
};

export default nextConfig;
