import { dehydrate, HydrationBoundary, QueryClient } from '@tanstack/react-query'
import { db } from '@/server/utils/db'
import ProductsClient from './ProductsClient'

/**
 * 商品列表页外壳（练习③：React Query SSR Hydration）。
 *
 * 拆分模式：Next 约定 page.jsx 是路由入口，可以是 Server Component；
 * 原客户端实现整体平移到 ProductsClient.jsx（'use client'），本文件只做三件事：
 *
 * ① prefetchQuery：服务端渲染时先把 ['products', query] / ['categories'] 两条
 *    缓存查好——直接调 db（同进程），绕过 HTTP 层；queryKey 必须与客户端
 *    useQuery 的 key 逐字段一致（含 undefined 值的键），对不上就白预取
 * ② dehydrate(queryClient)：把缓存序列化成普通对象
 * ③ <HydrationBoundary state>：随 HTML 下发；客户端 useQuery 命中缓存，
 *    首屏直出真实数据，不再发「第一发请求」——对标 Nuxt useAsyncData 体验
 *
 * 两个设计要点：
 * - QueryClient 在这里 new：本页是动态渲染（每次请求执行一遍函数体），
 *   天然「每请求一个 client」，不会跨用户串缓存（providers.jsx 的客户端
 *   client 不能拿到服务端用——它是 useState 单例，跨请求共享）
 * - prefetchQuery 失败会静默吞掉（不 throw）：服务端预取挂了客户端照常
 *   自己发请求，天然降级回原来的客户端拉取模式，不会把页面整挂
 *
 * 权限层级：能执行到这里说明 (admin)/layout.jsx 会话守卫已通过；
 * 无 product:view 权限的用户在 AdminShell 层已被拦成 403 页。
 */
export default async function ProductsPage() {
  // 与 ProductsClient 首屏的 query 逐字段一致（page:1 / pageSize:8 / 筛选全空）
  const query = { page: 1, pageSize: 8, categoryId: undefined, status: undefined, q: undefined }

  const queryClient = new QueryClient()
  await Promise.all([
    // query() 是 fetchQuery/prefetchQuery 的统一替代（5.104 起旧名废弃）：
    // 失败会 reject，.catch 显式吞掉以保留 prefetchQuery 原语义——
    // 预取挂了不阻塞渲染，客户端照常自己发请求（静默降级）
    queryClient
      .query({
        queryKey: ['products', query],
        queryFn: () => {
          const { items, total } = db.listProducts({ page: query.page, pageSize: query.pageSize })
          // 返回形态与 GET /api/products 对齐（多带 page/pageSize）
          return { items, total, page: query.page, pageSize: query.pageSize }
        },
      })
      .catch(() => {}),
    queryClient
      .query({
        queryKey: ['categories'],
        // 与 GET /api/categories 对齐：带 productCount，系统分类「待分类」排最后
        queryFn: () => ({
          items: db
            .listCategories()
            .map(category => ({
              ...category,
              productCount: db.countProductsInCategory(category.id),
            }))
            .sort((a, b) => Number(Boolean(a.system)) - Number(Boolean(b.system)) || a.id - b.id),
        }),
      })
      .catch(() => {}),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ProductsClient />
    </HydrationBoundary>
  )
}
