'use client'

import { useDeferredValue, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { App, Alert, Button, Input, Select, Switch, Table, Tag } from 'antd'
import { PlusOutlined, ReloadOutlined, SearchOutlined } from '@ant-design/icons'
import { useRouter } from 'next/navigation'
import { PERM } from '@/shared/permissions'
import { usePermission } from '@/hooks/usePermission'
import { api } from '@/lib/api'
import { cn } from '@/lib/cn'
import './products.scss'

/**
 * 商品列表页的客户端实现（React Query）。
 * 练习③拆分：外壳 page.jsx 是 Server Component，负责服务端 prefetch +
 * dehydrate；本组件在 HydrationBoundary 内 useQuery 命中缓存，首屏直出数据。
 * 本文件内容与拆分前完全一致：
 * - 列表与分类各一个 useQuery，queryKey 携带筛选+分页参数，条件变化自动重新请求
 * - 上下架走 useMutation 乐观更新：开关先翻、缓存先改，失败回滚，settled 后统一失效重取
 * - 删除后按需回退页码，再失效 ['products'] 让当前筛选组合重新拉取
 */

function money(value) {
  return value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export default function ProductsClient() {
  const router = useRouter()
  const { message, modal } = App.useApp()
  const { role, can } = usePermission()
  const queryClient = useQueryClient()

  /* ---------- 筛选条件与分页 ---------- */
  const [filters, setFilters] = useState({ categoryId: undefined, status: undefined, keyword: '' })
  const [pager, setPager] = useState({ page: 1, pageSize: 8 })

  /** 控件绑 filters（跟手），查询参数用 deferredFilters（React 空闲时才更新）——
   * 连续输入的中间态被并发渲染跳过，不再需要「搜索」按钮和双层 state */
  const deferredFilters = useDeferredValue(filters)

  /** 查询条件：分页与筛选合并；空值取 undefined（api 层会丢掉），keyword 映射为接口参数 q。
   * queryKey 每次渲染都是新对象没关系，React Query 按结构化内容哈希，值没变不重取 */
  const query = {
    page: pager.page,
    pageSize: pager.pageSize,
    categoryId: deferredFilters.categoryId,
    status: deferredFilters.status,
    q: deferredFilters.keyword.trim() || undefined,
  }

  /* ---------- 数据 ---------- */
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.categories.list })
  const productsQuery = useQuery({
    queryKey: ['products', query],
    queryFn: () => api.products.list(query),
  })

  const items = productsQuery.data?.items ?? []
  const total = productsQuery.data?.total ?? 0

  /** 条件一变就回第一页，否则会停在新结果里不存在的页码上 */
  function resetPage(p) {
    return p.page === 1 ? p : { ...p, page: 1 }
  }

  function resetFilters() {
    setFilters({ categoryId: undefined, status: undefined, keyword: '' })
    setPager({ page: 1, pageSize: 8 })
  }

  /* ---------- 上下架：乐观更新（对标旧版 patchItem 的体验） ---------- */
  const statusMutation = useMutation({
    mutationFn: ({ row, value }) => api.products.updateStatus(row.id, value),
    // onMutate 先改缓存：所有 ['products'] 前缀的列表里这一行立刻变，开关零延迟
    onMutate: async ({ row, value }) => {
      await queryClient.cancelQueries({ queryKey: ['products'] })
      const previous = queryClient.getQueriesData({ queryKey: ['products'] })
      queryClient.setQueriesData({ queryKey: ['products'] }, old =>
        old ? { ...old, items: old.items.map(item => (item.id === row.id ? { ...item, status: value } : item)) } : old,
      )
      return { previous }
    },
    onError: (err, _vars, ctx) => {
      // 失败回滚快照，再提示
      ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
      message.error(err.bizMessage)
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
    onSuccess: (data, { row, value }) => message.success(`「${row.name}」已${value === 'on' ? '上架' : '下架'}`),
  })

  // TODO-API 删除：换成 useMutation 与上下架同构（当前用回调写法，行为一致）
  function onDelete(row) {
    modal.confirm({
      title: '删除确认',
      content: `确定删除商品「${row.name}」吗？删除后不可恢复。`,
      okText: '删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      async onOk() {
        try {
          await api.products.remove(row.id)
          message.success(`已删除「${row.name}」`)
          // 删掉当前页最后一条时回退一页，否则会停在空页上（页码变化会触发新 queryKey 重新请求）
          if (total === 1 && pager.page > 1) setPager(p => ({ ...p, page: p.page - 1 }))
          else queryClient.invalidateQueries({ queryKey: ['products'] })
        }
        catch (err) {
          message.error(err.bizMessage)
        }
      },
    })
  }

  /* ---------- 表格列定义（结构对标旧版 el-table-column） ---------- */

  const categories = categoriesQuery.data?.items ?? []

  const columns = [
    {
      title: '商品',
      minWidth: 280,
      // 商品名 = 快看入口：应用内导航到 /products/:id 被 @modal/(.)[id] 拦截 → 弹窗
      render: (_, row) => (
        <div className="prod-meta">
          <b>
            <Button type="link" size="small" className="!px-0" onClick={() => router.push(`/products/${row.id}`)}>
              {row.name}
            </Button>
          </b>
          <span>{row.sku}</span>
        </div>
      ),
    },
    {
      title: '分类',
      width: 110,
      render: (_, row) => (
        <Tag>{categories.find(c => c.id === row.categoryId)?.name ?? '—'}</Tag>
      ),
    },
    {
      title: '单价',
      width: 130,
      align: 'right',
      render: (_, row) => `¥${money(row.price)}`,
    },
    {
      title: '库存',
      width: 100,
      align: 'right',
      render: (_, row) => (
        <span className={cn(row.stock < 20 && 'prod-stock-low')}>{row.stock}</span>
      ),
    },
    {
      title: '状态',
      width: 110,
      // 有 product:status 权限：列表内直接切换；否则只读标签
      render: (_, row) => (can(PERM.PRODUCT_STATUS)
        ? (
            <Switch
              checked={row.status === 'on'}
              checkedChildren="上架"
              unCheckedChildren="下架"
              loading={statusMutation.isPending && statusMutation.variables?.row.id === row.id}
              onChange={value => statusMutation.mutate({ row, value: value ? 'on' : 'off' })}
            />
          )
        : (
            <Tag color={row.status === 'on' ? 'success' : 'default'}>
              {row.status === 'on' ? '已上架' : '已下架'}
            </Tag>
          )),
    },
    // 更新时间用 minWidth 做第二弹性列：宽屏下和「商品」分摊剩余空间，避免单列独撑
    { title: '更新时间', minWidth: 180, dataIndex: 'updatedAt' },
    // 无 product:edit 权限整个操作列不出现在 columns 里（连表头都没有，对标旧版 v-if 列）
    ...(can(PERM.PRODUCT_EDIT)
      ? [{
          title: '操作',
          width: 130,
          fixed: 'right',
          render: (_, row) => (
            <span className="space-x-3">
              {/* <a> 整页跳转绕过拦截路由——应用内导航（Link/router.push）都会被
                  @modal/(.)[id] 拦成弹窗，编辑必须直达完整页，故用逃生通道 */}
              <Button type="link" size="small" className="!px-0">
                <a href={`/products/${row.id}`}>编辑</a>
              </Button>
              <Button type="link" danger size="small" className="!px-0" onClick={() => onDelete(row)}>删除</Button>
            </span>
          ),
        }]
      : []),
  ]

  /* ---------- 加载失败（对标旧版 error-card + 重试） ---------- */
  if (productsQuery.isError) {
    return (
      <section className="prod-card flex items-center justify-between gap-4 p-3.5">
        <Alert
          type="error"
          showIcon
          closable={false}
          className="flex-1"
          title="商品加载失败"
          description={productsQuery.error?.bizMessage ?? '请确认登录状态后重试'}
        />
        <Button size="small" className="shrink-0" onClick={() => productsQuery.refetch()}>重新加载</Button>
      </section>
    )
  }

  return (
    <div>
      <div className="prod-head">
        <div>
          <h1 className="prod-title">商品管理</h1>
          <p className="prod-sub">
            共 {total} 件商品 · 当前身份 {role.level} 级 {role.label}
          </p>
        </div>
        {can(PERM.PRODUCT_EDIT) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={() => router.push('/products/new')}>
            新建商品
          </Button>
        )}
      </div>

      <section className="prod-card prod-filter">
        <div className="prod-filter-group">
          {categoriesQuery.isError
            ? (
                <span className="prod-cat-error">
                  分类加载失败
                  <Button type="link" size="small" className="!px-0" onClick={() => categoriesQuery.refetch()}>重试</Button>
                </span>
              )
            : (
                <Select
                  value={filters.categoryId}
                  onChange={value => {
                    setFilters(f => ({ ...f, categoryId: value }))
                    setPager(resetPage)
                  }}
                  placeholder="全部分类"
                  allowClear
                  loading={categoriesQuery.isLoading}
                  style={{ width: 150 }}
                  options={categories.map(c => ({ label: c.name, value: c.id }))}
                />
              )}
          <Select
            value={filters.status}
            onChange={value => {
              setFilters(f => ({ ...f, status: value }))
              setPager(resetPage)
            }}
            placeholder="全部状态"
            allowClear
            style={{ width: 130 }}
            options={[
              { label: '已上架', value: 'on' },
              { label: '已下架', value: 'off' },
            ]}
          />
          <Input
            value={filters.keyword}
            onChange={e => {
              setFilters(f => ({ ...f, keyword: e.target.value }))
              setPager(resetPage)
            }}
            placeholder="搜索名称或 SKU"
            prefix={<SearchOutlined />}
            allowClear
            style={{ width: 200 }}
          />
        </div>
        <div className="prod-filter-group">
          <Button icon={<ReloadOutlined />} onClick={resetFilters}>重置</Button>
        </div>
      </section>

      <section className="prod-card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={productsQuery.isPending}
          scroll={{ x: 1050 }}
          locale={{ emptyText: '没有匹配的商品' }}
          pagination={{
            current: pager.page,
            pageSize: pager.pageSize,
            total,
            pageSizeOptions: [5, 8, 12],
            showTotal: t => <span className="prod-foot-hint">共 {t} 条</span>,
            onChange: (page, pageSize) => setPager({ page, pageSize }),
            showSizeChanger: true,
          }}
        />
      </section>
    </div>
  )
}
