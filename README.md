# 商城后台管理系统（react_shop_admin）

基于 Next.js 16 App Router 的商城后台管理系统，由 Nuxt 3 项目（nuxt_demo）迁移而来：服务端 API 已完成迁移，前端页面渐进迁移中。

## 技术栈

| 类别 | 选型 | 说明 |
|---|---|---|
| 框架 | Next.js 16.4 (App Router, TS) | Turbopack 构建，全动态渲染（页面依赖会话鉴权） |
| UI | Ant Design 6 + Tailwind CSS 4 | antd 管组件和交互，Tailwind 管布局细节 |
| 样式 | SCSS + 语义类 | `@apply` 组合工具类，就近存放 |
| 状态 | Zustand + @tanstack/react-query | 客户端登录态 / 服务端数据 |
| 服务端 | Next Route Handlers | 复用自旧项目的业务层（内存库，开箱即用） |

## 快速开始

```bash
npm install
npm run dev     # http://localhost:3000
npm run build   # 生产构建
```

无需数据库——服务端使用内存存储，启动时自动灌入种子数据。

**演示账号**（密码均为 `demo-123456`）：

| 账号 | 角色 | 权限 |
|---|---|---|
| admin | 1 级 · 管理员 | 全部（含角色权限管理、操作日志） |
| editor | 2 级 · 运营 | 商品/分类增删改，不可管理权限 |
| viewer | 3 级 · 只读 | 仅查看 |

登录页提供一键填入按钮，菜单与按钮按权限点过滤渲染。

## 目录结构

```
src/
├─ app/
│  ├─ (admin)/                  # 后台路由组（括号不出现在 URL）
│  │  ├─ layout.jsx             # 服务端登录守卫：未登录 307 → /login
│  │  ├─ AdminShell.jsx         # 侧边栏/顶栏骨架，菜单按权限过滤
│  │  ├─ admin.scss             # admin-* 骨架语义类
│  │  └─ products|categories|roles|logs/   # 业务页面
│  ├─ login/                    # 登录页（路由组外，无后台壳）
│  ├─ api/                      # Route Handlers，见下
│  └─ globals.scss              # 全局底座：tailwind 入口 + body
├─ server/utils/                # 服务端业务层（session/permission/audit/db…）
├─ shared/                      # 前后端共享常量（权限点定义、种子数据）
├─ stores/  hooks/  lib/        # Zustand store / usePermission / api 封装
```

**API 一览**（全部经会话鉴权 + 权限校验 + 操作审计）：

- `auth`：login / logout / me（签名 cookie 会话）
- `products`：列表分页筛选 / 详情 / 增删改 / 上下架
- `categories`：列表（含商品计数）/ 增删改
- `roles`：按级别读取与修改权限点（1 级锁定不可改）
- `logs`：操作日志分页查询

## 样式约定

三层分工，避免长 className 堆砌：

1. **组件外观** → antd 组件 + theme token（主题色 `#2563eb` 只在 ConfigProvider 定义）
2. **布局组合** → 语义类（`.admin-topbar`、`.login-card`），用 `@apply` 组合工具类
3. **动态条件** → `cn()`（`src/lib/cn.js`）拼接

文件组织规则：

- 页面级语义类与组件**就近存放**（如 `login/login.scss`），由对应组件 import
- 跨组件共用的骨架样式放 `(admin)/admin.scss`
- 全项目**只有 `globals.scss` 一处** `@import "tailwindcss"`；其它 scss 文件写 `@apply` 前必须加 `@reference "../globals.scss"`，否则工具类无法解析
- 不要用 `@layer components` 包裹 `@apply`（Tailwind 4 + Turbopack 会整块丢弃）

## 已知踩坑记录

- Next 16 默认 `cacheComponents` 与 `export const dynamic = 'force-dynamic'` 互斥，已在 `next.config.ts` 关闭（后台全鉴权页，无静态化价值）
- antd 组件不能在 Server Component 里渲染，页面组件一律标 `'use client'`
- Tailwind 管道：内置 sass 先编译 `.scss` → PostCSS（`postcss.config.js`）再跑 tailwind，不要在 `turbopack.rules` 手动挂 tailwind loader（顺序不对会拿到原始 SCSS 而解析失败）

## 相关文档

- `PLAN.md` — Nuxt → Next 迁移计划与进度
