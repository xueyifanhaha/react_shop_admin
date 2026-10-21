import { NextResponse } from 'next/server'
import { PERM } from '@/shared/permissions'
import { db } from '@/server/utils/db'
import { requirePerm } from '@/server/utils/permission'
import { writeLog } from '@/server/utils/audit'
import { normalizeProductBody, readProductQuery } from '@/server/utils/product'
import { handler } from '@/server/utils/http'

/**
 * GET /api/products
 * 分页 + 筛选（q 关键词 / categoryId / status），返回 total 供前端分页器使用。
 * 排序由 db 固定为 id 升序。
 */
export const GET = handler(async (request) => {
  await requirePerm(PERM.PRODUCT_VIEW)

  const { searchParams } = new URL(request.url)
  const { q, categoryId, status, page, pageSize } = readProductQuery(searchParams)
  const { items, total } = db.listProducts({ q, categoryId, status, page, pageSize })

  return NextResponse.json({ items, total, page, pageSize })
})

/**
 * POST /api/products —— 新建商品（product:edit）
 *
 * 与 PUT 共用 normalizeProductBody，校验规则只有一份。
 * 请求体里即使带了 sku / status / id 也会被忽略：这三个由服务端决定，
 * 其中 status 固定从「下架」起步 —— 新建即上架容易把没填完的商品直接暴露出去。
 */
export const POST = handler(async (request) => {
  const user = await requirePerm(PERM.PRODUCT_EDIT)

  const body = await request.json().catch(() => null)
  const fields = normalizeProductBody(body)

  const product = db.createProduct({ ...fields, updatedBy: user.username })

  writeLog(user, {
    action: 'product:create',
    targetType: '商品',
    targetId: product.id,
    targetName: product.name,
    detail: `新建商品 ${product.sku}，初始状态：下架`,
  })

  // 201 表示「已创建」，与 PUT 的 200 区分开
  return NextResponse.json({ item: product }, { status: 201 })
})
