<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 项目协作约定（react_shop_admin）

商城后台管理系统：Next.js 16 (App Router, TS) + antd 6 + Tailwind 4 + SCSS，由 Nuxt 3 项目迁移而来。技术栈与目录结构见 `README.md`，迁移进度见 `PLAN.md`。

## 交互规则

- 全程简体中文交流；代码、命令、标识符保持英文
- commit message 用简洁中文（20 字以内），先展示变更摘要再提交
- 不自动 commit / push，除非明确要求；删除文件、改密钥/CI 配置、push/rebase/reset 等红线操作必须先确认
- 结论先行，不铺垫；方案有问题直接指出

## 硬性技术约束（踩过的坑，勿再踩）

1. **Server Component 里不能渲染 antd 组件**（element type undefined）。所有用到 antd 的页面/组件一律标 `'use client'`；动态路由取参用 `await params`（Next 15+ 为 Promise）
2. **Tailwind 管道顺序**：内置 sass 先编译 `.scss` → PostCSS（`postcss.config.js`）再跑 tailwind。不要在 `turbopack.rules` 手动挂 `@tailwindcss/turbopack`——它会在 sass 之前执行，拿到原始 SCSS（`//` 注释、`&-` 嵌套）直接解析失败
3. **`@apply` 只在 tailwind 入口文件生效**：全项目只有 `src/app/globals.scss` 一处 `@import "tailwindcss"`；其它 scss 写 `@apply` 前必须加 `@reference "../globals.scss"`
4. **不要用 `@layer components` 包裹 `@apply`**：Tailwind 4 + Turbopack 会把整块编译丢弃且不报错
5. **`postcss.config` 必须用 CJS**（`postcss.config.js` + `module.exports`）；`.mjs`/ESM 形式在 turbopack 的 postcss 求值器里报 "Cannot find module"
6. **`cacheComponents: false` 已固定在 `next.config.ts`**：后台全为鉴权动态页，勿重新开启（与 `dynamic = 'force-dynamic'` 互斥）
7. **同一 `route.js` 的多个 HTTP 方法（GET/POST…）必须写在同一文件**，分两次写会互相覆盖
8. 内存库（`src/server/utils/db.js`）数据随 dev 进程存亡，重启即回到种子状态——测试产生的脏数据不是 bug

## 样式规范

- 组件外观 → antd 组件 + theme token（主题色 `#2563eb` 只在根布局 ConfigProvider 定义）
- 布局组合 → 语义类（`.admin-*`、`.login-*`），`@apply` 组合工具类，禁止长串原子类堆砌
- 动态条件类 → `cn()`（`src/lib/cn.js`）
- 文件位置：页面级样式与组件就近（`login/login.scss` 由 `login/page.jsx` 引入）；跨组件共用的放 `(admin)/admin.scss`

## 验证要求

- 改样式后**必须验证编译产物**（fetch 页面引用的 CSS chunk 确认规则实际生成），不能只看 `npm run build` 通过——`@layer` 丢弃、`@reference` 缺失这类问题 build 阶段无感知
- 本机 localhost 请求注意代理干扰（沙箱环境有 `HTTP_PROXY`，测本地服务需绕开）
- 接口测试后如有写入，提醒用户重启 dev 即恢复种子数据
