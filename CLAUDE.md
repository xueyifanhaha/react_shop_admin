# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 项目概况

商城后台管理系统，由 `nuxt_demo`（Nuxt 4 + Element Plus + Pinia）迁移到 **Next.js 16 App Router + Ant Design 6 + Tailwind v4 + Zustand**。迁移路线、框架概念映射和阶段进度以根目录 `PLAN.md` 为准：server 层 11 个 API 已完成，后台骨架与登录页已完成，`products` / `categories` / `roles` / `logs` 页面目前仍是占位组件（阶段 4 待做）。

数据是**进程内内存库**，重启即回到种子状态。演示账号：`admin` / `editor` / `viewer`，密码统一 `demo-123456`。

## 常用命令

```bash
npm run dev       # Turbopack 开发服务器，http://localhost:3000
npm run build     # 生产构建
npm start         # 运行生产构建
npm run lint      # ESLint CLI（Next 16 已移除 next lint）
npx tsc --noEmit  # 类型检查（项目 TS/JS 混用，allowJs）
```

项目**没有测试框架**，也没有 test 脚本；不要臆造单测命令。

## Next.js 16 注意事项

- 根目录 `AGENTS.md` 是 `next dev` 自动生成的规则：**写代码前先读 `node_modules/next/dist/docs/` 里的对应指南**，该版本与训练数据可能存在差异。不要从 diff 中删除 AGENTS.md 的规则块。
- Request API 全部异步：`await cookies()`、`await params`；`layout.tsx` 使用 Next 生成的 `LayoutProps<"/">` 类型。
- `next.config.ts` 中 `cacheComponents: false` 是刻意配置：后台全动态页无静态化价值，且与 antd 运行时样式/`export const dynamic` 冲突。不要随意开启。
- Turbopack 默认启用。`postcss.config.js` 必须保持 **CJS**（ESM 的 `.mjs` 在 Turbopack 的 PostCSS 求值器中会找不到 `@tailwindcss/postcss`）。
- antd 组件不能在 Server Component 中渲染，页面/交互组件必须标 `'use client'`。

## 服务端架构

请求链路：`src/app/api/**/route.js`（薄适配层）→ `src/server/utils/*`（业务与校验）→ `db`（内存库）；共享领域定义在 `src/shared/`。

- `src/shared/permissions.js`：权限点 `PERM`、角色预设 `ROLE_PRESETS`、侧边栏 `ADMIN_NAV`、权限分组 `PERMISSION_GROUPS` 的唯一定义处，前端与服务端共用。
- `src/shared/seed.js`：种子商品/分类/日志；系统分类「待分类」固定 id 为 `-1`（刻意不用 0，避免被 falsy 判断吞掉）。
- `src/server/utils/db.js`：`globalThis` 上的进程内单例。所有读写方法集中于此，将来换 SQLite/Prisma 只需改这个文件。含 scrypt 密码哈希、分页筛选、SKU 独立递增序列、删除分类时商品迁移到「待分类」等规则。
- `src/server/utils/http.js`：`ApiError(statusCode, message)` + `handler(fn)` 包装器。路由文件内**不写 try/catch**；未捕获异常统一 500。`parseId()` 解析路由参数。
- `src/server/utils/permission.js`：`requireUser()` / `requirePerm(perm)`，所有写接口第一行调用；401 = 未登录，403 = 缺权限。前端隐藏按钮只是体验，**这里才是安全边界**。
- `src/server/utils/session.js`：自实现 HMAC-SHA256 签名 cookie `admin_session`，有效期 7 天；`SESSION_SECRET` 环境变量，开发有默认值；本地 http 下 `secure: false`。`getSessionUser()` 在 Route Handler / Server Component 中还原用户。
- `src/server/utils/audit.js`：写接口成功后调用 `writeLog(actor, ...)`，日志只增不改不删。
- `src/server/utils/product.js` / `category.js`：请求体清洗与字段校验（服务端是权威，前端表单规则与之对齐）；商品修改日志只记录真正变化的字段。

接口约定：成功返回 `{ item }` 或 `{ items, total, page, pageSize }`；失败返回 `{ statusCode, message }`，`message` 是中文业务文案。

现有端点：`/api/auth/{login,logout,me}`、`/api/products`（GET/POST）、`/api/products/[id]`（GET/PUT/DELETE）、`/api/products/[id]/status`（PUT）、`/api/categories`（GET/POST）、`/api/categories/[id]`（PUT/DELETE）、`/api/roles`（GET）、`/api/roles/[level]`（PUT）、`/api/logs`（GET）。

## 前端架构

- 路由组：`src/app/(admin)/` 受保护后台；`/login` 登录页；`/403`；根 `page.tsx` 按会话重定向到 `/products` 或 `/login`。
- `src/app/(admin)/layout.jsx` 是**服务端守卫**（替代 Nuxt 全局中间件）：`getSessionUser()` 失败即 `redirect('/login')`，成功则从 `db` 读权限并传给 `AdminShell`。
- `src/app/(admin)/AdminShell.jsx`（client）：首次渲染时把 user/permissions 注入 Zustand，渲染 antd Layout/Menu，菜单按 `ADMIN_NAV` + `can()` 过滤。
- `src/stores/auth.js`：Zustand 的登录态与权限唯一前端数据源（`user` / `permissions` / `loaded`，`login` / `logout` / `fetchMe`）。
- `src/hooks/usePermission.js`：页面内 `can` / `canAny` 判断；角色文案读 `ROLE_PRESETS`。
- `src/lib/api.js`：**全项目唯一写接口 URL 的地方**，页面通过 `api.products.list(...)` 等方式调用；失败抛出的 `err.bizMessage` 即用户可读文案，`err.statusCode` 为 HTTP 状态码。新增接口先在这里加方法，不要页面里裸写 `fetch`。

## 样式约定

- Tailwind v4 由 `postcss.config.js`（`@tailwindcss/postcss`）处理；Next 内置 sass 先编译 `.scss`，产物再进 PostCSS。
- 全局只有 `src/app/globals.scss` 引入 `@import "tailwindcss"`；路由级语义类就近存放：`.admin-*` 在 `src/app/(admin)/admin.scss`，`.login-*` 在 `src/app/login/login.scss`。
- 独立 `.scss` 文件里用 `@apply` 必须先 `@reference "../globals.scss"`，否则报 unknown utility class。不要用 `@layer components` 包裹 `@apply`（Tailwind v4 会丢弃）。

## 代码风格

- 服务端、路由、页面组件用 `.jsx`（与迁移源一致）；根布局保留 `.tsx`；路径别名 `@/*` → `src/*`。
- 注释与用户可见文案用中文；注释解释「为什么」而非复述代码。
- 依赖中已安装 `@tanstack/react-query`，但尚未接入（没有 QueryClient Provider）；阶段 4 迁移页面时按需接入或保持 `api.js` 直调。
- 开发分支为 `dev`，`main` 用于合并。
