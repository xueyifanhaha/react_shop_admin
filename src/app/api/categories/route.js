import { NextResponse } from 'next/server'
import { PERM } from '@/shared/permissions'
import { db } from '@/server/utils/db'
import { requirePerm } from '@/server/utils/permission'
import { assertUniqueName, normalizeCategoryBody } from '@/server/utils/category'
import { writeLog } from '@/server/utils/audit'
import { handler } from '@/server/utils/http'

/**
 * GET /api/categories
 * 分类数量很少，不做分页；productCount 由服务端统计（前端不再自己数商品）。
 * 系统分类「待分类」排最后。
 */
export const GET = handler(async () => {
  await requirePerm(PERM.CATEGORY_VIEW)

  const items = db
    .listCategories()
    .map(category => ({
      ...category,
      productCount: db.countProductsInCategory(category.id),
    }))
    .sort((a, b) => Number(Boolean(a.system)) - Number(Boolean(b.system)) || a.id - b.id)

  return NextResponse.json({ items })
})

/** POST /api/categories —— 新建分类（category:edit） */
export const POST = handler(async (request) => {
  const user = await requirePerm(PERM.CATEGORY_EDIT)
  const body = await request.json().catch(() => null)

  const { name, description } = normalizeCategoryBody(body)
  assertUniqueName(name)

  const category = db.createCategory({ name, description })

  writeLog(user, {
    action: 'category:create',
    targetType: '分类',
    targetId: category.id,
    targetName: category.name,
    detail: '新建分类',
  })

  // 201 表示「已创建」，与 PUT 的 200 区分开
  return NextResponse.json({ item: { ...category, productCount: 0 } }, { status: 201 })
})
