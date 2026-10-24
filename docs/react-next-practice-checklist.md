# React / Next 技术练习清单（本项目视角）

> 盘点日期：2026-10-23，最后一次更新：2026-10-24（全部练习条目已收口）。按「本项目里没用到」列出，标出哪些值得**在本项目里补练**（有真实落点），哪些了解即可。做完一项勾一项。

## React 侧

| 技术                                   | 状态                                            | 本项目的练手机会                                                                                                                      |
| ------------------------------------ | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `useDeferredValue` / `useTransition` | ✅ 已练（logs/products 两页）                        | 已完成：把手写 drafts/filters 双层 state 换成原生 API，见 [use-deferred-value.md](./use-deferred-value.md)。useTransition 本身还没写，分工见速记         |
| `useOptimistic`                      | ⬜ 没用过                                         | React 19 原生乐观 UI，和已学的 React Query 乐观更新是两条路线，可用「上下架开关」各实现一遍对比优劣                                                                |
| Error Boundary                       | ✅ 已练（error.jsx + global-error.jsx，2026-10-23） | ⭐ Next 的 `error.jsx` 就是它的封装，实战笔记见 [error-boundary.md](./error-boundary.md)；同批还写了 `global-error.jsx`（替换根 layout、需自带 html/body） |
| `useReducer`                         | 没用过                                           | roles 草稿这种多字段 state 适合，但 useState 方案已清晰，属于可选                                                                                  |
| Context / createContext              | 没直接用过                                         | Zustand 底层就是 `useSyncExternalStore`，理解即可，实战没必要换                                                                               |
| `React.lazy` / 动态导入                  | 没用过                                           | 对应 Next 的 `next/dynamic`，见下                                                                                                   |

## Next 侧

| 技术                                                          | 状态                 | 说明                                                                                                             |
| ----------------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------- |
| **`loading.jsx` + Suspense 流式渲染**                           | ✅ 已完成（2026-10-23）       | ⭐ 段级 + logs 页级两层骨架 + /slow 演示页，与 useQuery spinner 的两层分工见 [loading-suspense.md](./loading-suspense.md) |
| **`error.jsx` / `global-error.jsx`**                        | ✅ 已完成（2026-10-23）  | ⭐ 页面级错误自己写的 Alert 管数据失败；段级 error.jsx 兜**渲染异常**，global-error 兜根 layout 异常。 |
| **Server Actions（`'use server'`）**                          | ✅ 已完成（2026-10-23） | ⭐ roles 保存改走 `roles/actions.js`，route.js 端点版保留作两条范式对照，见 [server-actions.md](./server-actions.md) |
| React Query SSR Hydration（prefetch + dehydrate）             | ✅ 已完成（2026-10-23） | ⭐ products 页拆成 Server 外壳 + ProductsClient，首屏直出数据零请求，见 [ssr-hydration.md](./ssr-hydration.md) |
| metadata API / `generateMetadata`                           | ✅ 已完成（2026-10-23） | ⭐ 根 layout template 拼接 + 四页静态导出 + 详情页动态标题，见 [metadata-api.md](./metadata-api.md) |
| `next/dynamic`                                              | 没用过                | 比如把 roles 的重型矩阵页做路由级代码分割；目前自家代码仅 25K gzip 没必要，了解即可                                                             |
| Parallel Routes / Intercepting Routes                       | ✅ 已完成（2026-10-23）      | ⭐ 商品名点击 → 快看弹窗、刷新/直开 → 完整编辑页，同一 URL 两种呈现；`@modal/default.js` 兜底是必须，`<a>` 是绕过拦截的逃生通道。见 [intercepting-routes.md](./intercepting-routes.md) |
| **SSR / 首帧一致性（hydration）**                                | ✅ 已完成（2026-10-24）      | ⭐ 服务端读不到的数据（zustand effect 注入的权限、portal 渲染的弹窗）会让 SSR 与客户端首帧不同 → mismatch 整树重渲。修法：服务端 props → context 直传；弹窗去掉 `forceRender`。**报错栈指向的组件只是差异被发现的位置，不是原因** |
| `middleware.ts`（Edge）                                       | 讲过没写               | 已明确不用：Edge 运行时读不到内存会话，知道边界即可                                                                                   |
| `next/image` / `next/font`                                  | 没用过                | 项目无图片无自定义字体，无场景                                                                                                |
| 缓存体系（`revalidateTag` / `unstable_cache` / Cache Components） | **刻意关掉的**          | `cacheComponents: false` 是因为全站登录后私有数据 + antd，后台系统的正确选择；讲清为什么不用它本身就是知识                                          |

## 练习路线（按学习性价比排序）

1. ✅ **`useDeferredValue` 重构搜索**（2026-10-23 完成，ed94f26）
2. ✅ **`(admin)` 段加 `loading.jsx` + `error.jsx`**（2026-10-23 完成）—— error.jsx（含 global-error.jsx）+ 段级/页面级两层 loading 骨架 + /slow 流式演示页
3. ✅ **React Query SSR Hydration**（2026-10-23 完成）—— products 页服务端 prefetch + HydrationBoundary，登录落地即有数据
4. ✅ **Server Actions 改写 roles 保存**（2026-10-23 完成）—— `roles/actions.js` 直接在 mutationFn 里 await 服务端函数，与 route.js 对照
5. ✅ **Parallel / Intercepting Routes 商品快看**（2026-10-23 完成）—— `@modal/(.)[id]` + `default.js` 兜底，生产模式 9/9 验证
6. ✅ **hydration 一致性修复**（2026-10-24 完成）—— 权限走 `AuthProvider` context 直传、Modal 去 `forceRender`，dev 全页 console 干净

> 这六项做完，日常后台开发会用到的 React/Next 面基本全覆盖。刻意不做的（middleware、缓存体系、next/image·font）连同理由见上表——「知道自己为什么不用」和「会用」同等重要。
> 仍留白的：`useOptimistic`（讲解过、代码里仍在用 RQ `onMutate`，两条路线可各实现一遍对比）、`useTransition`（只在讲解里出现过）、`next/dynamic`（自家代码仅 25K gzip，无必要）。
