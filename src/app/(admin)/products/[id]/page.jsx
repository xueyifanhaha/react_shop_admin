import { db } from '@/server/utils/db'
import ProductDetailClient from './DetailClient'

/**
 * 商品编辑/新建页外壳：generateMetadata 演示「标题依赖数据」的动态生成。
 *
 * 与静态 metadata 的差异：静态导出是渲染前已知的对象；generateMetadata 是
 * 每次请求执行的 async 函数，能拿路由参数查库——标题跟着数据走。
 * params 在 Next 15+ 是 Promise，必须 await。
 *
 * 三种返回：
 * - /products/new → 「新建商品」
 * - id 命中商品 → 直接用商品名做标题（标签页/收藏夹/分享卡一眼可辨）
 * - id 非法或商品已删 → 返回空对象，退回根 layout 的 default 标题
 */
export async function generateMetadata({ params }) {
  const { id } = await params

  if (id === 'new') {
    return { title: '新建商品' }
  }

  const productId = Number(id)
  const product = Number.isInteger(productId) ? db.findProduct(productId) : null
  if (product) {
    return { title: product.name }
  }

  return {}
}

export default function ProductEditPage() {
  return <ProductDetailClient />
}
