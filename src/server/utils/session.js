import { createHmac, timingSafeEqual } from 'node:crypto'
import { cookies } from 'next/headers'
import { db } from './db'

/**
 * 会话：自实现的签名 cookie（HMAC-SHA256），逻辑与 Nuxt 版一致。
 * 框架层差异：h3 的 getCookie/setCookie 换成 Next 的 next/headers cookies()，
 * 在 Route Handler 里 cookies() 可读可写（Server Actions / Route Handlers 专属能力）。
 */

const COOKIE_NAME = 'admin_session'
const MAX_AGE = 60 * 60 * 24 * 7 // 7 天
const SECRET = process.env.SESSION_SECRET ?? 'next-admin-dev-secret-change-me'

function base64url(input) {
  return Buffer.from(input).toString('base64url')
}

function sign(data) {
  return createHmac('sha256', SECRET).update(data).digest('base64url')
}

export function createSessionToken(user) {
  const payload = { uid: user.id, exp: Date.now() + MAX_AGE * 1000 }
  const body = base64url(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

function verifySessionToken(token) {
  const [body, sig] = token.split('.')
  if (!body || !sig) return null

  const expected = sign(body)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null

  try {
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString())
    if (!payload?.uid || payload.exp < Date.now()) return null
    return payload
  }
  catch {
    return null
  }
}

export async function setSessionCookie(user) {
  const store = await cookies()
  store.set(COOKIE_NAME, createSessionToken(user), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: MAX_AGE,
    // 本地练习走 http；部署到 HTTPS 后改为 true
    secure: false,
  })
}

export async function clearSessionCookie() {
  const store = await cookies()
  store.delete(COOKIE_NAME)
}

/** 从请求里还原当前用户；cookie 缺失 / 签名无效 / 用户已不存在 都返回 null */
export async function getSessionUser() {
  const store = await cookies()
  const token = store.get(COOKIE_NAME)?.value
  if (!token) return null

  const payload = verifySessionToken(token)
  if (!payload) return null

  const user = db.findUserById(payload.uid)
  if (!user) return null

  return { id: user.id, username: user.username, name: user.name, roleLevel: user.roleLevel }
}

/** 前端展示用的角色文案（写日志时用） */
export function roleLabel(level) {
  return db.getRole(level)?.label ?? `${level} 级`
}
