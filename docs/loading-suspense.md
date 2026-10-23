# loading.jsx 与 Suspense 流式渲染（练习②笔记）

> 2026-10-23 完成。对应 Next.js 的「Loading UI and Streaming」约定。

## 一、做了什么

| 文件 | 作用 |
| --- | --- |
| `src/app/(admin)/loading.jsx` | **段级**骨架屏：导航到任何没有自己 loading 的页面（products/categories/roles…）时显示 |
| `src/app/(admin)/logs/loading.jsx` | **页面级**骨架：导航到 /logs 时优先显示这份（布局贴近 logs 页） |
| `src/app/(admin)/slow/page.jsx` | 演示页：async Server Component + `await` 1.5s，让骨架屏**可见 1.5 秒**，未加菜单 |

验证脚本：`D:/0328/verify-tools/verify-loading.mjs`（生产模式 3100，6/6 通过）。

## 二、核心心智模型：两层 loading 的分工

本项目页面全是 `'use client'` + React Query，于是任何一次「进入页面」实际经过两个等待阶段，各有各的 loading：

```text
点击侧栏「操作日志」
   │
   ▼
阶段① 导航期：拉取页面 JS chunk / RSC payload
   └─ loading.jsx 的骨架屏（Next Suspense 自动接管）
   │
   ▼
阶段② 数据期：React Query 发请求
   └─ 页面里 Table 的 loading={isPending}（我们自己写的）
   │
   ▼
真实内容
```

- **loading.jsx 管「路由导航期间」**：页面组件还没就绪（chunk 没下完 / 服务端还没渲染完）。
- **页面 spinner 管「数据请求期间」**：组件已挂载，等 React Query。

### 关键推论：client 页面里 loading.jsx 几乎不可见

页面是 client 组件时，SSR **直出不挂起**——服务端瞬间把初始 HTML 吐完，导航期只剩 chunk 拉取的几十毫秒。所以本项目列表页里你平时只会看到 Table 的 spinner。

loading.jsx 存在感最强的场景是 **async Server Component 直接 await 数据**（如 `slow/page.jsx`）：await 期间页面段处于挂起状态，骨架屏一直显示到服务端渲染完。这也是练习③（React Query SSR Hydration）要消除「第二层等待」的另一面——两条路线对比：

| 路线 | 等待发生在哪 | 显示什么 |
| --- | --- | --- |
| 本项目现状：client + useQuery | 浏览器里发请求 | loading.jsx（一闪）→ Table spinner |
| async Server Component + await | 服务端渲染时 | loading.jsx 骨架（全程可见，流式替换） |

## 三、就近原则（嵌套规则）

`loading.jsx` 可以放在任意层级的路由段目录里，Next 自动为每层建 `<Suspense>` 边界。导航时**离目标页面最近的 loading.jsx 生效**：

- 进 `/logs` → `logs/loading.jsx`（页面级）
- 进 `/roles` → `(admin)/loading.jsx`（段级回退）
- 侧栏 / 顶栏在 `(admin)/layout.jsx` 里，永不显示骨架——只替换内容区，和 error.jsx 同层级语义

## 四、Suspense 流式渲染（streaming）原理

SSR 首次请求一个慢页面时，Next 不会攒齐全部 HTML 再响应：

1. 立刻发送 layout + loading 骨架的 HTML（骨架以 **inline 方式**内置在首块 HTML 里，`/slow` 首屏验证抓到的就是它）；
2. 页面段 await 完成后，把真实内容连同一段替换脚本流式推下去；
3. 浏览器执行脚本，用真实内容**原地替换**骨架。

所以验证脚本里 `/slow` 的时序是：`domcontentloaded` 时 DOM 里已是骨架 → 1.5s 后「慢查询演示页」出现、骨架节点被移除。

## 五、踩坑与注意

1. **生产模式才能观察**：dev 模式编译耗时会制造大量假 loading，预取行为也与生产不同（和 error.jsx 验证同一教训）。
2. **`<Link>` 预取**：生产模式下视口内的链接会预取目标页 payload，命中后切换近乎瞬时——要人工观察骨架，需 DevTools 限速或脚本拦截延迟 RSC 请求。
3. **骨架屏 ≠ 数据 loading**：别指望 loading.jsx 替代页面里的 Table spinner（client + useQuery 架构下两阶段天然分离）；反过来给 async 页面写 Table spinner 也轮不到它显示。
4. **data-loading 标记**：两个骨架屏加了 `data-loading="admin-segment"` / `"logs-page"`，自动化脚本靠它区分两层；对人眼来说靠布局差异区分。

## 六、和 error.jsx 的对照记忆

| | loading.jsx | error.jsx |
| --- | --- | --- |
| 包裹层 | Suspense（挂起） | Error Boundary（异常） |
| 触发 | 页面段渲染未完成 | 渲染期 throw |
| 显示位置 | 段内容区（layout 保留） | 段内容区（layout 保留） |
| 恢复 | 渲染完成自动替换 | `reset()` 手动重试 |
