import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // 后台系统所有页面都依赖会话鉴权，无静态化价值；且 antd 运行时样式与缓存组件的预渲染冲突
  cacheComponents: false,
  // Tailwind 经 postcss.config.mjs (@tailwindcss/postcss) 处理，
  // 内置 sass 先编译 .scss，产物再进 PostCSS，@apply 才能生效
};

export default nextConfig;
