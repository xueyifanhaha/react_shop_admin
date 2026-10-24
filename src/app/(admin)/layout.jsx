import { redirect } from 'next/navigation'
import { getSessionUser } from '@/server/utils/session'
import { db } from '@/server/utils/db'
import { AuthProvider } from './AuthProvider'
import AdminShell from './AdminShell'
import './admin.scss'

/**
 * 后台路由组守卫（对标 nuxt_demo 的 middleware/auth.global.js）：
 * 服务端直接读签名 cookie 还原会话，未登录一律 redirect 到 /login。
 *
 * 会话有效时把 user / permissions 交给 AuthProvider（context，首帧即有值），
 * AdminShell 与各页面通过 usePermission() 读取——服务端与客户端首帧同源，
 * 权限位控制的 UI 不会 hydration 不一致。
 */
export default async function AdminLayout({ children }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const permissions = db.getRole(user.roleLevel)?.permissions ?? []

  return (
    <AuthProvider user={user} permissions={permissions}>
      <AdminShell user={user} permissions={permissions}>
        {children}
      </AdminShell>
    </AuthProvider>
  )
}
