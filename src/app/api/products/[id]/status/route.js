import { NextResponse } from 'next/server'
import { PERM } from '@/shared/permissions'
import { db, formatNow } from '@/server/utils/db'
import { requirePerm } from '@/server/utils/permission'
import { writeLog } from '@/server/utils/audit'
import {
  normalizeStatus,
  requireProduct,
  statusText,
} from '@/server/utils/product'
import { handler, parseId } from '@/server/utils/http'

/**
 * PUT /api/products/:id/status —— 上下架（product:status）
 * 单独一个权限点：2 级可以上下架，但不代表能改价格库存。
 */
export const PUT = handler(async (request, { params }) => {
  const user = await requirePerm(PERM.PRODUCT_STATUS)

  const { id: rawId } = await params
  const id = parseId(rawId)
  const before = requireProduct(id)

  const body = await request.json().catch(() => null)
  const status = normalizeStatus(body?.status)

  // 状态没变就不写库也不写日志，避免日志被重复点击刷屏
  if (status === before.status) {
    return NextResponse.json({ item: before })
  }

  // 先记下旧状态：db.updateProduct 是原地改对象，更新后 before.status 会跟着变
  const fromStatus = before.status

  const product = db.updateProduct(id, {
    status,
    updatedAt: formatNow(),
    updatedBy: user.username,
  })

  writeLog(user, {
    action: 'product:status',
    targetType: '商品',
    targetId: id,
    targetName: product.name,
    detail: `${statusText(fromStatus)} → ${statusText(status)}`,
  })

  return NextResponse.json({ item: product })
})
