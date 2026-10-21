import { NextResponse } from 'next/server'
import { PERM } from '@/shared/permissions'
import { db, formatNow } from '@/server/utils/db'
import { requirePerm } from '@/server/utils/permission'
import { writeLog } from '@/server/utils/audit'
import {
  describeProductChanges,
  normalizeProductBody,
  requireProduct,
} from '@/server/utils/product'
import { ApiError, handler, parseId } from '@/server/utils/http'

/** GET /api/products/:id —— 商品详情（product:view） */
export const GET = handler(async (request, { params }) => {
  await requirePerm(PERM.PRODUCT_VIEW)

  const { id: rawId } = await params
  const id = parseId(rawId)
  const product = requireProduct(id)

  return NextResponse.json({ item: product })
})

/** PUT /api/products/:id —— 编辑商品（product:edit），全量更新 */
export const PUT = handler(async (request, { params }) => {
  const user = await requirePerm(PERM.PRODUCT_EDIT)

  const { id: rawId } = await params
  const id = parseId(rawId)
  const before = requireProduct(id)

  const body = await request.json().catch(() => null)
  const next = normalizeProductBody(body)

  // 先算差异再写库，日志里才有「改前 → 改后」
  const changes = describeProductChanges(before, next)

  const product = db.updateProduct(id, {
    ...next,
    updatedAt: formatNow(),
    updatedBy: user.username,
  })

  if (changes.length > 0) {
    writeLog(user, {
      action: 'product:update',
      targetType: '商品',
      targetId: id,
      targetName: product.name,
      detail: changes.join('；'),
    })
  }

  return NextResponse.json({ item: product })
})

/**
 * DELETE /api/products/:id —— 删除商品（product:edit）
 * 商品删除是硬删除（内存库），删除后不可恢复；日志保留。
 */
export const DELETE = handler(async (request, { params }) => {
  const user = await requirePerm(PERM.PRODUCT_EDIT)

  const { id: rawId } = await params
  const id = parseId(rawId)
  const product = requireProduct(id)

  db.deleteProduct(id)

  writeLog(user, {
    action: 'product:delete',
    targetType: '商品',
    targetId: id,
    targetName: product.name,
    detail: '删除商品',
  })

  return NextResponse.json({ ok: true, id })
})
