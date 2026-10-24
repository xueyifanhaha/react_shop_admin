import { db } from '@/server/utils/db'
import QuickViewModal from '../../QuickViewModal'

/**
 * 拦截段：(.)[id] 拦截「products 段内部的应用内导航」到 /products/:id。
 *
 * 行为矩阵（这是 Intercepting Routes 的全部精髓）：
 * - 软导航（列表页 router.push / Link 点击）→ 本段命中，弹窗渲染在 @modal slot，
 *   URL 变为 /products/:id，但列表页不被替换
 * - 硬导航（刷新 / 直输地址 / <a> 整页跳转）→ 拦截不生效，
 *   children slot 渲染完整编辑页 [id]/page.jsx，@modal 渲染 default.js（null）
 *
 * 同时 children slot 在软导航时也会渲染 [id]/page.jsx（在弹窗遮罩后面），
 * 关闭弹窗用 router.back() 一并退回列表。
 */
export default async function ProductQuickView({ params }) {
  const { id } = await params

  // 'new'（新建页）等非数字 id 不做快看，children 的真实编辑页照常渲染
  const productId = Number(id)
  const product = Number.isInteger(productId) ? db.findProduct(productId) : null
  if (!product) return null

  const category = db.findCategory(product.categoryId)

  return (
    <QuickViewModal
      product={{
        ...product,
        categoryName: category?.name ?? '—',
      }}
    />
  )
}
