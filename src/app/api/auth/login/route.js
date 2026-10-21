import { NextResponse } from 'next/server'
import { db, verifyPassword } from '@/server/utils/db'
import { roleLabel, setSessionCookie } from '@/server/utils/session'
import { ApiError, handler } from '@/server/utils/http'

/** POST /api/auth/login —— 登录 */
export const POST = handler(async (request) => {
  const body = await request.json().catch(() => null)
  const username = String(body?.username ?? '').trim().toLowerCase()
  const password = String(body?.password ?? '')

  if (!username || !password) {
    throw new ApiError(400, '请输入用户名和密码')
  }

  const user = db.findUserByUsername(username)
  // 用户不存在和密码错误返回同一句提示，不暴露账号是否存在
  if (!user || !verifyPassword(user, password)) {
    throw new ApiError(401, '用户名或密码错误')
  }

  await setSessionCookie(user)

  db.appendLog({
    actorId: user.id,
    actorName: user.name,
    actorRole: `${user.roleLevel} 级 · ${roleLabel(user.roleLevel)}`,
    action: 'login',
    targetType: '系统',
    targetId: user.id,
    targetName: user.username,
    detail: '登录成功',
  })

  return NextResponse.json({
    user: { id: user.id, username: user.username, name: user.name, roleLevel: user.roleLevel },
    permissions: db.getRole(user.roleLevel)?.permissions ?? [],
  })
})
