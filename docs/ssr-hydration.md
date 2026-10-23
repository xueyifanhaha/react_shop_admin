# React Query SSR Hydration（练习③笔记）

> 2026-10-23 完成。落点：`products/page.jsx` 拆成 Server Component 外壳（服务端 prefetch）+ `ProductsClient.jsx`（原客户端实现原样平移）。

## 一、解决什么问题

拆分前商品页首屏时序：SSR 输出的是「表格 spinner」空壳 → 浏览器下载 JS、水合 → useQuery 发第一发请求 → 才有数据。**服务端明明在 db 旁边，却让浏览器来回跑一趟。**

Hydration 后：服务端渲染时先把缓存查好、随 HTML 下发 → 客户端 useQuery 命中缓存，**首屏直出真实数据，第一发请求消失**。对标 Nuxt `useAsyncData` 的体验（服务端取数 + payload 下发）。

验证对比（`D:/0328/verify-tools/verify-ssr-hydration.mjs`，5/5 通过）：
- 拆分前：SSR HTML 里搜不到「iPhone 15 Pro 256G」，打开页面必发 `/api/products`
- 拆分后：HTML 首块就含商品与分类数据，浏览器 0 次 API 调用，表格直接 9 行

## 二、三步 API

```jsx
// page.jsx（Server Component，每次请求执行）
const queryClient = new QueryClient()                       // ① 服务端临时 client
await queryClient.query({ queryKey, queryFn }).catch(() => {})  // ② 服务端先查（吞错降级）
return (
  <HydrationBoundary state={dehydrate(queryClient)}>        // ③ 缓存序列化随 HTML 下发
    <ProductsClient />                                       // useQuery 命中缓存
  </HydrationBoundary>
)
```

**API 命名变更**（本项目装的 5.104.5 已生效）：`fetchQuery` / `prefetchQuery` / `ensureQueryData` 全部废弃，统一为 `queryClient.query(options)`。语义差异：`query()` 失败会 reject（`fetchQuery` 原行为），要保留 `prefetchQuery` 的「吞错不阻塞渲染」，须自己 `.catch(() => {})`。编辑器对 prefetchQuery 报 deprecated 就是在提示这个。

## 三、拆分模式（为什么 page 变成外壳）

Next 约定 page.jsx 是路由入口，可以是 Server Component；但 `new QueryClient()`、useQuery 都不能在 Server Component 里做。所以标准姿势：

```text
page.jsx（Server）     ← prefetch + dehydrate + HydrationBoundary 包壳
  └─ ProductsClient.jsx（'use client'）← 原 page.jsx 一字不差平移
```

原客户端实现零改动是关键——客户端代码不感知数据是预取的还是自己拉的，`useQuery` 两种来源通吃。

## 四、踩坑与要点

1. **queryKey 必须逐字段一致**：服务端 prefetch 的 key 和客户端 useQuery 的 key 对不上 = 白预取，客户端照旧发请求（不报错，静默失效，只能靠网络面板发现）。undefined 值的键没关系——结构化哈希序列化时会省略，两端形状一致即可。
2. **每请求一个 QueryClient**：本页动态渲染，函数体每次请求执行，`new QueryClient()` 天然隔离，不会跨用户串缓存。不能复用 providers.jsx 里的客户端单例。
3. **queryFn 直接调 db**：服务端 prefetch 绕过 HTTP 层（`api.js` 是浏览器相对路径 fetch，服务端调不了），全栈一体时直接 `db.listProducts()`。**返回形态必须与 API 端点对齐**（分类的 productCount 统计、排序规则都要复刻），否则客户端拿到形状不一致的数据。
4. **prefetchQuery 失败静默吞掉**：不 throw、不阻塞渲染，客户端照常自己发请求——天然降级回客户端拉取模式，页面不会挂。
5. **只救首屏第一发**：翻页、筛选、搜索的后续请求照旧走客户端。`staleTime 30s`（providers 配置）内回列表页也不重取。
6. **权限层级**：prefetch 直接读 db 没过 `requirePerm`，但安全不破——(admin)/layout 会话守卫 + AdminShell requiredPerm 在更外层已经把无权限用户拦成 403，能进页面就必然有权看这份数据。

## 五、和练习② loading.jsx 的关系

两层 loading 分工（见 loading-suspense.md）：loading.jsx 管导航期，Table spinner 管数据期。Hydration 之后商品页的「数据期第一发」被前移到服务端——**首屏连 Table spinner 都不出现**，直接是数据。loading.jsx 的骨架仍然保留，管 chunk 拉取的导航期。

## 六、范围判断（什么时候值得做）

- 值得：用户登录落地页、核心列表页（本练习只做了 products 一个页面，就是这个理由）
- 不值得：低频页面、强交互筛选页（首屏命中率低）；后台内部页普遍首屏收益不大
- 分离架构下同样可用：SSR 服务器 prefetch 时改调内网后端 API（带 cookie 透传），BFF 常规操作
