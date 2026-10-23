'use client'

import { useDeferredValue, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Alert, Button, Input, Select, Table, Tag } from 'antd'
import { ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import './logs.scss'

/**
 * 操作日志页的客户端实现（外壳 page.jsx 在 Server 端提供 metadata）：
 * 内容与拆分前完全一致。原注释：（对标旧版 pages/logs.vue）：
 * - 纯只读数据：整页只有一个 useQuery，没有任何 useMutation——
 *   「读用 query、写用 mutation」的分界在这页最纯粹
 * - 关键词用 useDeferredValue：输入框跟手更新，查询参数用派生的低优先级值，
 *   React 并发渲染自动跳过连续输入的中间态，只对「稳定下来」的值发请求——
 *   旧版双层 state（drafts/filters）+「搜索」按钮的手动防抖被这个 Hook 取代
 * - 日志只增不减，不存在「删到空页」的页码回退问题，比商品列表少一个边界
 */

/** 动作类型 → 展示文案与标签色（与服务端 writeLog 的 action 字符串一一对应） */
const ACTION_META = {
  login: { label: '登录', color: 'default' },
  'product:create': { label: '新建商品', color: 'success' },
  'product:update': { label: '编辑商品', color: 'processing' },
  'product:status': { label: '上下架', color: 'warning' },
  'product:delete': { label: '删除商品', color: 'error' },
  'category:create': { label: '新建分类', color: 'success' },
  'category:update': { label: '编辑分类', color: 'processing' },
  'category:delete': { label: '删除分类', color: 'error' },
  'role:update': { label: '权限变更', color: 'error' },
}

const ACTION_OPTIONS = Object.entries(ACTION_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}))

function actionMeta(action) {
  return ACTION_META[action] ?? { label: action, color: 'default' }
}

export default function LogsClient() {
  const [keyword, setKeyword] = useState('')
  const [action, setAction] = useState(undefined)
  const [pager, setPager] = useState({ page: 1, pageSize: 8 })

  /** 输入框用 keyword（跟手），查询参数用 deferredKeyword（React 空闲时才更新）——
   * 连续输入时中间态被并发渲染跳过，逐键请求天然不发生 */
  const deferredKeyword = useDeferredValue(keyword)

  /** 查询条件：分页与筛选合并；keyword 映射为接口参数 q。
   * queryKey 每次渲染都是新对象没关系，React Query 按结构化内容哈希，值没变不重取 */
  const query = {
    page: pager.page,
    pageSize: pager.pageSize,
    action,
    q: deferredKeyword.trim() || undefined,
  }

  const logsQuery = useQuery({ queryKey: ['logs', query], queryFn: () => api.logs.list(query) })
  const items = logsQuery.data?.items ?? []
  const total = logsQuery.data?.total ?? 0

  /** 条件一变就回第一页，否则会停在新结果里不存在的页码上 */
  function resetPage(p) {
    return p.page === 1 ? p : { ...p, page: 1 }
  }

  function resetFilters() {
    setKeyword('')
    setAction(undefined)
    setPager({ page: 1, pageSize: 8 })
  }

  /* ---------- 表格列定义 ---------- */
  const columns = [
    { title: '时间', width: 170, dataIndex: 'at' },
    {
      title: '操作人',
      width: 200,
      render: (_, row) => (
        <div className="log-actor">
          <span className="log-avatar">{row.actorName.slice(0, 1).toUpperCase()}</span>
          <span className="log-actor-meta">
            <b>{row.actorName}</b>
            <span>{row.actorRole}</span>
          </span>
        </div>
      ),
    },
    {
      title: '动作',
      width: 110,
      render: (_, row) => (
        <Tag color={actionMeta(row.action).color}>{actionMeta(row.action).label}</Tag>
      ),
    },
    {
      title: '对象',
      width: 240,
      render: (_, row) => (
        <span className="log-target">
          <Tag>{row.targetType}</Tag>
          <b>{row.targetName}</b>
        </span>
      ),
    },
    {
      // 详情不给宽度：作为唯一弹性列吸收剩余空间，宽屏下不再出现大片空白
      title: '详情',
      minWidth: 200,
      render: (_, row) => <span className="log-detail">{row.detail}</span>,
    },
  ]

  /* ---------- 加载失败（对标旧版 error-card + 重试） ---------- */
  if (logsQuery.isError) {
    return (
      <section className="log-card flex items-center justify-between gap-4 p-3.5">
        <Alert
          type="error"
          showIcon
          closable={false}
          className="flex-1"
          title="日志加载失败"
          description={logsQuery.error?.bizMessage ?? '该页面需要「查看操作日志」权限'}
        />
        <Button size="small" className="shrink-0" onClick={() => logsQuery.refetch()}>重新加载</Button>
      </section>
    )
  }

  return (
    <div>
      <div className="log-head">
        <div>
          <h1 className="log-title">操作日志</h1>
          <p className="log-sub">共 {total} 条记录 · 记录所有写操作，不可修改和删除</p>
        </div>
      </div>

      <section className="log-card log-filter">
        <div className="log-filter-group">
          <Select
            value={action}
            onChange={value => {
              setAction(value ?? undefined)
              setPager(resetPage)
            }}
            placeholder="全部动作"
            allowClear
            style={{ width: 150 }}
            options={ACTION_OPTIONS}
          />
          <Input
            value={keyword}
            onChange={e => {
              setKeyword(e.target.value)
              setPager(resetPage)
            }}
            placeholder="搜索操作人 / 对象 / 详情（输入即搜）"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 240 }}
          />
        </div>
        <div className="log-filter-group">
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>重置</Button>
        </div>
      </section>

      <section className="log-card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={logsQuery.isPending}
          scroll={{ x: 920 }}
          locale={{ emptyText: '没有匹配的日志' }}
          pagination={{
            current: pager.page,
            pageSize: pager.pageSize,
            total,
            pageSizeOptions: [8, 15, 30],
            showTotal: t => <span className={cn('log-foot-hint')}>共 {t} 条</span>,
            onChange: (page, pageSize) => setPager({ page, pageSize }),
            showSizeChanger: true,
          }}
        />
      </section>
    </div>
  )
}
