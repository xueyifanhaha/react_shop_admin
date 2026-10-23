import { Card, Skeleton } from 'antd'

/**
 * logs 页专属 loading：演示「就近原则」——
 * 同一个路由段里，页面目录下的 loading.jsx 优先于 (admin)/loading.jsx。
 * 导航到 /logs 时显示这份（布局贴近 logs 页），导航到其他页面走段级骨架。
 *
 * data-loading 标记仅用于自动化验证脚本区分两层骨架。
 */
export default function LogsLoading() {
  return (
    <div data-loading="logs-page">
      {/* 页头 */}
      <Skeleton active title={{ width: 140 }} paragraph={{ rows: 1, width: 300 }} />

      {/* 筛选条卡片（logs 页特有的一行矮卡片） */}
      <Card className="mt-6">
        <Skeleton active title={false} paragraph={{ rows: 1, width: '45%' }} />
      </Card>

      {/* 表格卡片 */}
      <Card className="mt-5">
        <Skeleton active title={false} paragraph={{ rows: 8 }} />
      </Card>
    </div>
  )
}
