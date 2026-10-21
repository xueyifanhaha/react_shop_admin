import { NextResponse } from 'next/server'
import { db } from '@/server/utils/db'
import { requireUser } from '@/server/utils/permission'
import { handler } from '@/server/utils/http'

/** GET /api/auth/me —— 当前登录用户 + 权限点 */
export const GET = handler(async () => {
  const user = await requireUser()
  return NextResponse.json({
    user,
    permissions: db.getRole(user.roleLevel)?.permissions ?? [],
  })
})
