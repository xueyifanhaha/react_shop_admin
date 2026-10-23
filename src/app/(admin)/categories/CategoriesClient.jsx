'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Table, Tag } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { PERM } from '@/shared/permissions'
import { usePermission } from '@/hooks/usePermission'
import { api } from '@/lib/api'
import CategoryEditModal from './CategoryEditModal'
import './categories.scss'

/**
 * 分类管理页（对标旧版 pages/categories.vue）：
 * - 列表一个 useQuery（接口不分页，分类数量少），失败整页 Alert + 重试
 * - 新建/编辑弹窗拆为子组件 CategoryEditModal：父组件管开关（open/editing），
 *   子组件管表单与保存；onSaved 回调里父组件失效列表缓存
 * - 删除走 modal.confirm + useMutation（不乐观更新）：删除涉及服务端「商品迁移」，
 *   成功提示里的 moved 数量必须以服务端返回为准
 */
export default function CategoriesClient() {
  const { message, modal } = App.useApp()
  const { role, can } = usePermission()
  const queryClient = useQueryClient()

  /* ---------- 弹窗状态：open 控制开关，editing 区分新建/编辑 ---------- */
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null) // null = 新建，否则是被编辑的分类行

  /* ---------- 数据 ---------- */
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.categories.list })
  const items = categoriesQuery.data?.items ?? []

  /* ---------- 删除：确认后 mutate，成功按 moved 数量提示 ---------- */
  const deleteMutation = useMutation({
    mutationFn: row => api.categories.remove(row.id),
    onSuccess: ({ moved }, row) => {
      message.success(moved > 0 ? `已删除，${moved} 件商品移入「待分类」` : `已删除「${row.name}」`)
      queryClient.invalidateQueries({ queryKey: ['categories'] })
    },
    onError: err => message.error(err.bizMessage),
  })

  function openCreate() {
    setEditing(null)
    setOpen(true)
  }

  function openEdit(row) {
    if (row.system) return
    setEditing(row)
    setOpen(true)
  }

  function onDelete(row) {
    // 有商品也允许删：服务端会把商品移入「待分类」，确认框里提前告知数量
    const warning = row.productCount > 0
      ? `确定删除分类「${row.name}」吗？该分类下有 ${row.productCount} 件商品，删除后这些商品将移入「待分类」。`
      : `确定删除分类「${row.name}」吗？`

    modal.confirm({
      title: '删除确认',
      content: warning,
      okText: '确认删除',
      okButtonProps: { danger: true },
      cancelText: '取消',
      // mutateAsync 抛错时 onError 已经 message 过，这里吞掉避免 unhandled rejection
      onOk: () => deleteMutation.mutateAsync(row).catch(() => {}),
    })
  }

  /* ---------- 表格列定义 ---------- */
  const columns = [
    {
      title: '分类名称',
      minWidth: 220,
      render: (_, row) => (
        <span className="cat-name">
          {row.name}
          {row.system && <Tag className="cat-sys-tag">系统</Tag>}
        </span>
      ),
    },
    {
      title: '描述',
      minWidth: 320,
      render: (_, row) => <span className="cat-desc">{row.description || '—'}</span>,
    },
    {
      title: '关联商品',
      width: 110,
      align: 'center',
      render: (_, row) => (
        <Tag color={row.productCount > 0 ? 'blue' : 'default'}>{row.productCount} 件</Tag>
      ),
    },
    { title: '创建时间', width: 180, dataIndex: 'createdAt' },
    // 无 category:edit 权限整个操作列不出（连表头都没有，同 products 页条件展开写法）
    ...(can(PERM.CATEGORY_EDIT)
      ? [{
          title: '操作',
          width: 130,
          fixed: 'right',
          render: (_, row) => (row.system
            ? <span className="cat-locked">不可操作</span>
            : (
                <span className="space-x-3">
                  <Button type="link" size="small" className="!px-0" onClick={() => openEdit(row)}>编辑</Button>
                  <Button type="link" danger size="small" className="!px-0" onClick={() => onDelete(row)}>删除</Button>
                </span>
              )),
        }]
      : []),
  ]

  /* ---------- 加载失败（对标旧版 error-card + 重试） ---------- */
  if (categoriesQuery.isError) {
    return (
      <section className="cat-card flex items-center justify-between gap-4 p-3.5">
        <Alert
          type="error"
          showIcon
          closable={false}
          className="flex-1"
          title="分类加载失败"
          description={categoriesQuery.error?.bizMessage ?? '请确认登录状态后重试'}
        />
        <Button size="small" className="shrink-0" onClick={() => categoriesQuery.refetch()}>重新加载</Button>
      </section>
    )
  }

  return (
    <div>
      <div className="cat-head">
        <div>
          <h1 className="cat-title">分类管理</h1>
          <p className="cat-sub">
            共 {items.length} 个分类 · 当前身份 {role.level} 级 {role.label}
          </p>
        </div>
        {can(PERM.CATEGORY_EDIT) && (
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>新建分类</Button>
        )}
      </div>

      <section className="cat-card">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={items}
          loading={categoriesQuery.isPending}
          scroll={{ x: 960 }}
          locale={{ emptyText: '还没有分类' }}
        />
        <div className="cat-foot">
          <span className="cat-foot-hint">
            共 {items.length} 条 · 删除分类后，其下商品会自动移入「待分类」
          </span>
        </div>
      </section>

      {/* 对标旧版 <LazyCategoryEditDialog v-if="dialogVisible" v-model :editing @saved />：
          open+onClose 相当于 v-model，editing 是入参，onSaved 相当于 emit('saved') */}
      <CategoryEditModal
        open={open}
        editing={editing}
        onClose={() => setOpen(false)}
        onSaved={() => {
          setOpen(false)
          queryClient.invalidateQueries({ queryKey: ['categories'] })
        }}
      />
    </div>
  )
}
