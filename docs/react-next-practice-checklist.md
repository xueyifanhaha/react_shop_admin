# React / Next 技术练习清单（本项目视角）

> 盘点日期：2026-10-23。按「本项目里没用到」列出，标出哪些值得**在本项目里补练**（有真实落点），哪些了解即可。做完一项勾一项。

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
| React Query SSR Hydration（prefetch + dehydrate）             | ⬜ 练习③              | 讲过没写过——「Nuxt 首屏有数据」那个模式的 React 版，补上后登录页→列表页能跳过 loading 一闪                                                      |
| metadata API / `generateMetadata`                           | 没用过                | 每页现在共用根 layout 的标题，补 `<title>` 按页面变化，10 分钟的事，可顺手加进任一练习                                                         |
| `next/dynamic`                                              | 没用过                | 比如把 roles 的重型矩阵页做路由级代码分割；目前自家代码仅 25K gzip 没必要，了解即可                                                             |
| Parallel Routes / Intercepting Routes                       | 没用过                | 拦截路由 =「点商品详情 URL 变了但页面是弹窗」，后台挺实用但属于锦上添花                                                                        |
| `middleware.ts`（Edge）                                       | 讲过没写               | 已明确不用：Edge 运行时读不到内存会话，知道边界即可                                                                                   |
| `next/image` / `next/font`                                  | 没用过                | 项目无图片无自定义字体，无场景                                                                                                |
| 缓存体系（`revalidateTag` / `unstable_cache` / Cache Components） | **刻意关掉的**          | `cacheComponents: false` 是因为全站登录后私有数据 + antd，后台系统的正确选择；讲清为什么不用它本身就是知识                                          |

## 练习路线（按学习性价比排序）

1. ✅ **`useDeferredValue` 重构搜索**（2026-10-23 完成，ed94f26）
2. ✅ **`(admin)` 段加 `loading.jsx` + `error.jsx`**（2026-10-23 完成）—— error.jsx（含 global-error.jsx）+ 段级/页面级两层 loading 骨架 + /slow 流式演示页
3. ⬜ **React Query SSR Hydration** —— 补齐「服务端预取」能力，对标 Nuxt 的 useAsyncData 体验
4. ✅ **Server Actions 改写 roles 保存**（2026-10-23 完成）—— `roles/actions.js` 直接在 mutationFn 里 await 服务端函数，与 route.js 对照

> 这四个做完，日常后台开发会用到的 React/Next 面基本全覆盖。
