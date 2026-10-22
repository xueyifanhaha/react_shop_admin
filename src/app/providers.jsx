'use client'

import { useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

/**
 * React Query 全局 Provider。
 * 客户端组件（QueryClient 本身带状态，不能在 Server Component 里 new）。
 *
 * 默认策略按后台系统习惯调过：
 * - staleTime 30s：30 秒内的重复进入不重新请求（列表 ↔ 详情来回切不闪 loading）
 * - retry 只对 5xx 重试：401/403/400 这类业务错误重试没有意义
 * - refetchOnWindowFocus 关闭：后台系统切窗口回来不希望表格突然转圈
 */
export default function Providers({ children }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            retry: (failureCount, error) => error?.statusCode >= 500 && failureCount < 2,
            refetchOnWindowFocus: false,
          },
        },
      }),
  )

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
