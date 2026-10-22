import bundleAnalyzer from "@next/bundle-analyzer";
import type { NextConfig } from "next";

// ANALYZE=true 时输出 bundle 构成报告（npm run analyze），平时构建零开销
const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig: NextConfig = {
  /* config options here */
  // 后台系统所有页面都依赖会话鉴权，无静态化价值；且 antd 运行时样式与缓存组件的预渲染冲突
  cacheComponents: false,
  // Tailwind 经 postcss.config.js (@tailwindcss/postcss) 处理；
  // 内置 sass 先编译 .scss，产物再进 PostCSS，@apply 才能生效。
  // 注意 postcss.config.js 必须是 CJS 格式，改成 .mjs 会报 Cannot find module
};

export default withBundleAnalyzer(nextConfig);
