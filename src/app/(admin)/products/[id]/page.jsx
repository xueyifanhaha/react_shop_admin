'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Form, Input, InputNumber, Select, Spin, Tag } from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { PERM } from '@/shared/permissions'
import { usePermission } from '@/hooks/usePermission'
import { api } from '@/lib/api'
import './edit.scss'

/**
 * 商品详情 / 编辑页（新建与编辑共用）：
 * - /products/new 和 /products/101 都命中这个动态路由，id === 'new' 即新建模式
 *   （商品 id 永远是数字，'new' 不会与任何商品撞车）
 * - 详情用 useQuery(['product', id])；保存用 useMutation，成功后失效相关缓存
 * - viewer 等无 product:edit 权限的角色：展示警告 + 只读表单（对标旧版兜底 Alert）
 */

/** 新建时价格与库存留空（undefined）而不是 0：0 能过 required 校验，会把「没填价格」当成「卖 0 元」提交 */
const NEW_FORM = { name: '', categoryId: undefined, price: undefined, stock: undefined, description: '' }

/** 把服务端对象映射成表单字段；显式白名单，避免把 sku/status/时间戳一起塞进提交 body */
function toForm(source) {
  return {
    name: source?.name ?? '',
    categoryId: source?.categoryId,
    price: source?.price,
    stock: source?.stock,
    description: source?.description ?? '',
  }
}

export default function ProductEditPage() {
  const { id } = useParams()
  const router = useRouter()
  const { message } = App.useApp()
  const { can } = usePermission()
  const queryClient = useQueryClient()
  const [form] = Form.useForm()

  const isNew = id === 'new'
  const canEdit = can(PERM.PRODUCT_EDIT)

  /* ---------- 数据：分类下拉 + 商品详情 ---------- */
  const categoriesQuery = useQuery({ queryKey: ['categories'], queryFn: api.categories.list })
  const categories = categoriesQuery.data?.items ?? []

  const productQuery = useQuery({
    queryKey: ['product', id],
    queryFn: () => api.products.detail(id),
    enabled: !isNew, // 新建模式没有详情可查
  })
  const product = productQuery.data?.item ?? null

  /** 详情到达后填进表单（每个商品只填一次；保存后的表单同步在 onSuccess 里做，避免覆盖用户正在编辑的草稿） */
  const [filledId, setFilledId] = useState(null)
  useEffect(() => {
    if (!isNew && product && filledId !== product.id) {
      form.setFieldsValue(toForm(product))
      setFilledId(product.id)
    }
  }, [isNew, product, filledId, form])

  /* ---------- 保存 ---------- */
  const saveMutation = useMutation({
    // 只提交白名单字段；POST 时 id/sku/status/时间戳全由服务端生成
    mutationFn: values => (isNew ? api.products.create(values) : api.products.update(id, values)),
    onSuccess: ({ item }) => {
      if (isNew) {
        message.success(`商品已创建（${item.sku}）`)
        // replace 而不是 push：创建完地址栏直接是详情页，不能让「后退」回到那张已提交的空表单
        router.replace(`/products/${item.id}`)
        return
      }
      // 同步表单为服务端返回的最新值，并刷新列表页缓存
      form.setFieldsValue(toForm(item))
      setFilledId(item.id)
      message.success('商品已保存')
      queryClient.invalidateQueries({ queryKey: ['product', String(item.id)] })
      queryClient.invalidateQueries({ queryKey: ['products'] })
    },
    onError: err => message.error(err.bizMessage),
  })
  const saving = saveMutation.isPending

  /** 保存：先过校验，全过才发请求（validateFields reject 即有错，catch 掉即可） */
  function handleSave() {
    form.validateFields()
      .then(values => saveMutation.mutate(values))
      .catch(() => {})
  }

  /** 取消：直接回列表。列表数据在 30s staleTime 内命中缓存，返回即恢复，无需 back 判断 */
  function handleCancel() {
    router.push('/products')
  }

  const categoryName = useMemo(
    () => (product ? categories.find(c => c.id === product.categoryId)?.name ?? '—' : undefined),
    [product, categories],
  )

  /* ---------- 加载失败（含 404：商品不存在） ---------- */
  if (productQuery.isError) {
    const status = productQuery.error?.statusCode
    return (
      <section className="pedit-card pedit-error">
        <Alert
          type="error"
          showIcon
          className="flex-1"
          message={status === 404 ? '商品不存在' : '商品加载失败'}
          description={productQuery.error?.bizMessage ?? '请确认商品 ID 是否正确'}
        />
        <Button className="shrink-0" onClick={() => productQuery.refetch()}>重新加载</Button>
      </section>
    )
  }

  /* ---------- 详情加载中 ---------- */
  if (!isNew && productQuery.isPending) {
    return (
      <div className="pedit-loading">
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      <div className="pedit-head">
        <div>
          <Link href="/products" className="pedit-back">
            <ArrowLeftOutlined />
            返回列表
          </Link>
          <h1 className="pedit-title">
            {form.getFieldValue('name') || (isNew ? '新建商品' : '商品编辑')}
          </h1>
          {product
            ? (
                <p className="pedit-meta">
                  <span>{product.sku}</span>
                  <i>/</i>
                  <span>{categoryName}</span>
                  <i>/</i>
                  <Tag color={product.status === 'on' ? 'success' : 'default'}>
                    {product.status === 'on' ? '已上架' : '已下架'}
                  </Tag>
                </p>
              )
            : (
                <p className="pedit-meta">
                  <span>保存后自动生成 SKU，初始状态为「下架」</span>
                </p>
              )}
        </div>

        {canEdit && (
          <div className="pedit-actions">
            <Button onClick={handleCancel}>返回</Button>
            <Button type="primary" loading={saving} onClick={handleSave}>
              {isNew ? '创建商品' : '保存修改'}
            </Button>
          </div>
        )}
      </div>

      {!canEdit && (
        <Alert
          type="warning"
          showIcon
          closable={false}
          className="pedit-notice"
          message="当前账号没有编辑权限"
          description="商品编辑页需要 product:edit 权限，表单已置为只读。"
        />
      )}

      <Form
        form={form}
        initialValues={isNew ? NEW_FORM : toForm(product)}
        layout="vertical"
        disabled={!canEdit}
        className="pedit-form"
        onFinish={handleSave}
      >
        <div className="pedit-layout">
          <div className="pedit-col">
            <section className="pedit-card">
              <h2>基本信息</h2>
              <Form.Item label="商品名称" name="name" rules={[
                { required: true, message: '请输入商品名称' },
                { min: 2, max: 40, message: '长度在 2 到 40 个字符' },
              ]}>
                <Input placeholder="请输入商品名称" maxLength={40} showCount />
              </Form.Item>
              <Form.Item label="商品分类" name="categoryId" rules={[
                { required: true, message: '请选择商品分类' },
              ]}>
                <Select
                  placeholder="请选择分类"
                  loading={categoriesQuery.isLoading}
                  options={categories.map(c => ({ label: c.name, value: c.id }))}
                />
              </Form.Item>
            </section>

            <section className="pedit-card">
              <h2>商品描述</h2>
              <Form.Item name="description">
                <Input.TextArea
                  rows={6}
                  maxLength={500}
                  showCount
                  placeholder="商品卖点、规格参数、售后说明等"
                />
              </Form.Item>
            </section>
          </div>

          <div className="pedit-col pedit-side">
            <section className="pedit-card">
              <h2>价格与库存</h2>
              <Form.Item label="单价（元）" name="price" rules={[
                { required: true, message: '请填写单价' },
              ]}>
                <InputNumber min={0} max={9999999} precision={2} step={1} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item label="库存（件）" name="stock" rules={[
                { required: true, message: '请填写库存' },
              ]}>
                <InputNumber min={0} max={999999} precision={0} step={1} style={{ width: '100%' }} />
              </Form.Item>
              <StockHint />
            </section>

            {product && (
              <section className="pedit-card">
                <h2>其他信息</h2>
                <MetaRow label="SKU" value={product.sku} />
                <MetaRow label="创建时间" value={product.createdAt} />
                <MetaRow label="最近更新" value={product.updatedAt} />
                <MetaRow label="最近操作人" value={product.updatedBy} />
              </section>
            )}
          </div>
        </div>
      </Form>
    </div>
  )
}

/** 库存提示：Form.useWatch 订阅表单 store 的实时值，输入即更新 */
function StockHint() {
  const stock = Form.useWatch('stock')
  return (
    <p className={stock < 20 ? 'pedit-hint pedit-hint-warn' : 'pedit-hint'}>
      {stock < 20 ? '库存低于 20，列表页会标红提醒' : '库存充足'}
    </p>
  )
}

function MetaRow({ label, value }) {
  return (
    <div className="pedit-meta-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}
