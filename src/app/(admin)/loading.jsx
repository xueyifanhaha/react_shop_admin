import { Card, Skeleton } from 'antd'

/**
 * (admin) 段级 loading：约定文件，Next 会自动把它包进段级 <Suspense>。
 *
 * 什么时候显示（客户端导航时）：
 * - 目标页面段正在服务端渲染 / RSC payload 拉取中，且目标页面目录**没有**自己的 loading.jsx
 *   —— 就近原则：最近的 loading.jsx 生效
 *
 * 什么时候「几乎看不到」：
 * - 生产模式下 <Link> 会预取目标页的 RSC payload，命中缓存则直接切换
 * - 页面是纯 client 组件（本项目全部列表页如此）时，SSR 直出不挂起，
 *   真正的等待发生在 React Query 拉数据阶段——那是页面里 Table 的 loading，
 *   两层 loading 分工见 docs/loading-suspense.md
 *
 * 只替换内容区：侧栏 / 顶栏在 (admin)/layout.jsx 里，不受影响（与 error.jsx 同层级）。
 */
export default function AdminLoading() {
  return (
    <div data-loading="admin-segment">
      {/* 页头：标题 + 副标题 */}
      <Skeleton active title={{ width: 160 }} paragraph={{ rows: 1, width: 260 }} />

      {/* 主体卡片：一行筛选骨架 + 表格骨架 */}
      <Card className="mt-6">
        <Skeleton active title={false} paragraph={{ rows: 1, width: '35%' }} />
        <Skeleton active title={false} paragraph={{ rows: 9 }} className="mt-8" />
      </Card>
    </div>
  )
}
