import { NextResponse } from 'next/server'
import { PERM } from '@/shared/permissions'
import { db } from '@/server/utils/db'
import { requirePerm } from '@/server/utils/permission'
import { handler } from '@/server/utils/http'

/** GET /api/roles —— 角色与权限点列表（role:manage） */
export const GET = handler(async () => {
  await requirePerm(PERM.ROLE_MANAGE)
  return NextResponse.json({ items: db.listRoles() })
})
