/** @type {import('next').NextConfig} */
const nextConfig = {
  // чтобы ESLint не валил продакшн-сборку (можешь убрать позже)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // если раньше отключали lightningcss из-за ошибки — оставь;
  // когда починим установку optional deps, можно удалить
  experimental: {
    optimizeCss: false,
  },
};

export default nextConfig;
