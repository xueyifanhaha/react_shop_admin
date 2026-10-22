# react_shop_admin 迁移计划

> nuxt_demo（Nuxt 4 + Element Plus + Pinia）→ react_shop_admin（Next.js 16 App Router + Ant Design 6 + Tailwind v4 + Zustand）
> 分支：dev　·　开始：2026-10-21

## 总体思路

- **服务端**：业务层（内存库 / 校验 / 权限 / 审计日志）原样复用，只把 Nuxt 的胶水层（h3 event、cookie、createError、Nitro 文件路由）换成 Next 的适配层（ApiError + handler 包装器、next/headers cookies、App Router route.js）。
- **前端**：页面逐个从 Vue SFC 翻译成 React 组件，业务逻辑与接口调用顺序保持一致；Element Plus 组件换成 antd 对应组件；Pinia 换 Zustand；全局中间件换成「(admin) 路由组的服务端布局守卫」。

## 阶段进度

- [x] 阶段 1：Next.js 脚手架 + 依赖 + 清理演示代码
- [x] 阶段 2：server 层迁移（11 个 API 端点，已实测通过）
- [x] 阶段 3：前端基建 + 后台骨架 + 登录页
- [ ] **阶段 4：业务页面迁移（products → categories → roles → logs）**（进行中，products 两页 + categories 已完成）
- [ ] 阶段 5：收尾（403/错误页、响应式、构建验证、合并 main）

## 框架概念映射

| Nuxt 4 | Next.js 16 | 说明 |
|---|---|---|
| `server/api/**/*.post.js` 文件路由 | `src/app/api/**/route.js` | 已完成 |
| `#shared` 别名 | `@/shared`（tsconfig paths） | 已完成 |
| h3 `createError` | `ApiError` + `handler()`（src/server/utils/http.js） | 已完成 |
| `useSession`/h3 cookie | `next/headers cookies()` | 已完成 |
| `middleware/auth.global.js` 全局守卫 | `(admin)/layout.jsx` 服务端 `getSessionUser()` + redirect | 阶段 3 |
| `layouts/default.vue` | `(admin)/layout.jsx` + `AdminShell.jsx`（客户端 antd 布局） | 阶段 3 |
| `layouts/auth.vue` | `(auth)/login` 独立路由组 | 阶段 3 |
| Pinia `useAuthStore`（useState 承载） | Zustand `useAuthStore`（服务端布局初始化注入） | 阶段 3 |
| `useApi.js`（$fetch 封装） | `src/lib/api.js`（fetch 封装，同名方法面） | 阶段 3 |
| `usePermission.js` | `src/hooks/usePermission.js`（读 Zustand） | 阶段 3 |
| Element Plus 表格/表单/对话框 | antd Table/Form/Modal | 阶段 4 |
| `navigateTo` / `definePageMeta` | `router.push` / 路由组 | 阶段 4 |

## 页面迁移清单（阶段 4）

| 旧页面 | 新路由 | 依赖权限点 | 优先级 |
|---|---|---|---|
| `pages/products/index.vue` | `(admin)/products` | product:view | 1 |
| `pages/products/[id].vue` | `(admin)/products/[id]` | product:edit | 1 |
| `components/CategoryEditDialog.vue` | `(admin)/categories` 内部组件 | category:edit | 2 |
| `pages/categories.vue` | `(admin)/categories` | category:view | 2 |
| `pages/roles.vue` | `(admin)/roles` | role:manage | 3 |
| `pages/logs.vue` | `(admin)/logs` | log:view | 4 |
| `pages/403.vue` | `403`（公开路由） | — | 4 |

## 约定

- 服务端 JS（与迁移代码一致），页面组件 `.jsx`，根布局 `.tsx` 保留。
- 接口错误文案统一读 `err.bizMessage`（api.js 收敛）。
- 菜单按 `ADMIN_NAV` + 权限过滤渲染；页面级权限在服务端布局/页面里再查一次。
- git：dev 分支开发，阶段完成即提交推送；commit message 简洁中文。
