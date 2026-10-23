'use client'

/**
 * 根级错误边界：只在「根 layout 自身出错」或「没有被更近的 error.jsx 兜住」时触发。
 *
 * 两个特殊之处（Next 的硬性要求）：
 * 1. 它**替换整个根 layout**，所以必须自己渲染 <html> 和 <body>
 * 2. 根 layout 里的 ConfigProvider / AntdApp / 全局 CSS 都不在了——
 *    这里刻意不用 antd 组件、不引外部样式，全部内联，保证任何情况下都能显示
 */
export default function GlobalError({ error, reset }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif', background: '#f8fafc' }}>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <div style={{ maxWidth: 480, textAlign: 'center' }}>
            <div style={{ fontSize: 44, fontWeight: 500, color: '#dc2626', lineHeight: 1.2 }}>500</div>
            <h1 style={{ fontSize: 18, fontWeight: 500, margin: '16px 0 8px' }}>应用启动失败</h1>
            <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.7, margin: '0 0 24px' }}>
              页面在最外层就抛出了异常，通常意味着根布局或全局配置出了问题。
              可以先重试，仍不行请把下方错误编号反馈给开发。
            </p>
            {error?.digest && (
              <p style={{ fontSize: 12, color: '#94a3b8', margin: '0 0 24px' }}>
                错误编号：<code>{error.digest}</code>
              </p>
            )}
            <button
              onClick={() => reset()}
              style={{
                fontSize: 13,
                padding: '7px 20px',
                borderRadius: 6,
                border: '1px solid #2563eb',
                background: '#2563eb',
                color: '#fff',
                cursor: 'pointer',
              }}
            >
              重试
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}
