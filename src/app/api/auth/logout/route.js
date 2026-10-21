import { NextResponse } from 'next/server'
import { clearSessionCookie } from '@/server/utils/session'
import { handler } from '@/server/utils/http'

/** POST /api/auth/logout —— 退出登录 */
export const POST = handler(async () => {
  await clearSessionCookie()
  return NextResponse.json({ ok: true })
})
