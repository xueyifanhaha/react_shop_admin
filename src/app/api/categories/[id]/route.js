import { NextResponse } from 'next/server'
import { PERM } from '@/shared/permissions'
import { db } from '@/server/utils/db'
import { requirePerm } from '@/server/utils/permission'
import { assertUniqueName, normalizeCategoryBody } from '@/server/utils/category'
import { writeLog } from '@/server/utils/audit'
import { ApiError, handler, parseId } from '@/server/utils/http'

/** PUT /api/categories/:id —— 编辑分类（category:edit） */
export const PUT = handler(async (request, { params }) => {
  const user = await requirePerm(PERM.CATEGORY_EDIT)
  const { id: rawId } = await params
  const id = parseId(rawId)

  const category = db.findCategory(id)
  if (!category) {
    throw new ApiError(404, '分类不存在')
  }
  if (category.system) {
    throw new ApiError(400, '系统分类不可修改')
  }

  const body = await request.json().catch(() => null)
  const { name, description } = normalizeCategoryBody(body)
  assertUniqueName(name, id)

  // 只把真正变化的字段写进日志
  const changes = []
  if (category.name !== name) changes.push(`名称 ${category.name} → ${name}`)
  if ((category.description ?? '') !== description) {
    changes.push(description ? '描述已更新' : '描述已清空')
  }

  db.updateCategory(id, { name, description })

  if (changes.length > 0) {
    writeLog(user, {
      action: 'category:update',
      targetType: '分类',
      targetId: id,
      targetName: name,
      detail: changes.join('；'),
    })
  }

  return NextResponse.json({ item: { ...category, productCount: db.countProductsInCategory(id) } })
})

/**
 * DELETE /api/categories/:id —— 删除分类（category:edit）
 * 分类下还有商品也允许删除：这些商品先移到系统分类「待分类」，再删分类。
 * 前端会在确认框里提示将迁移的商品数量。
 */
export const DELETE = handler(async (request, { params }) => {
  const user = await requirePerm(PERM.CATEGORY_EDIT)
  const { id: rawId } = await params
  const id = parseId(rawId)

  const category = db.findCategory(id)
  if (!category) {
    throw new ApiError(404, '分类不存在')
  }
  if (category.system) {
    throw new ApiError(400, '系统分类不可删除')
  }

  const { removed, moved } = db.deleteCategory(id)

  writeLog(user, {
    action: 'category:delete',
    targetType: '分类',
    targetId: id,
    targetName: removed.name,
    detail: moved > 0 ? `删除分类，${moved} 件商品移入「待分类」` : '删除分类（无关联商品）',
  })

  return NextResponse.json({ ok: true, moved })
})
