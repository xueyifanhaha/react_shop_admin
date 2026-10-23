'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button, Result, Typography } from 'antd'

/**
 * (admin) 段级错误边界（Next 的 error.jsx 就是 React ErrorBoundary 的封装）
 *
 * 职责边界：
 * - 兜住「本段页面渲染期抛出的异常」：组件 render、useMemo 计算、子组件挂载
 * - 兜不住：事件回调（onClick 里 throw）、useEffect 里的异步异常、
 *   以及同段 layout.jsx 自身的错误（那层没有边界包着，落到 global-error.jsx）
 *
 * 位置：渲染在 AdminShell 内部，所以侧栏/顶栏还在，只有内容区被替换——
 * 用户体验是「这页坏了」，而不是「整个后台崩了」。
 */
export default function AdminError({ error, reset }) {
  // 生产环境 error.message 会被脱敏，只剩 digest；开发环境控制台能看到完整堆栈
  useEffect(() => {
    console.error('[admin] 页面渲染异常:', error)
  }, [error])

  return (
    <div style={{ padding: '48px 24px' }}>
      <Result
        status="error"
        title="页面出错了"
        subTitle="这一页在渲染时抛出了异常，其他页面不受影响。可以重试，或返回商品列表继续操作。"
        extra={[
          <Button key="retry" type="primary" onClick={() => reset()}>
            重试
          </Button>,
          <Button key="back">
            <Link href="/products">返回商品列表</Link>
          </Button>,
        ]}
      >
        {error?.digest && (
          <Typography.Paragraph type="secondary" style={{ fontSize: 12 }}>
            错误编号（排查时提供给开发）：<code>{error.digest}</code>
          </Typography.Paragraph>
        )}
      </Result>
    </div>
  )
}
