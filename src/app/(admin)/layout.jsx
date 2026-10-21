import { redirect } from 'next/navigation'
import { getSessionUser } from '@/server/utils/session'
import { db } from '@/server/utils/db'
import AdminShell from './AdminShell'

/**
 * 后台路由组守卫（对标 nuxt_demo 的 middleware/auth.global.js）：
 * 服务端直接读签名 cookie 还原会话，未登录一律 redirect 到 /login。
 * 会话有效时把用户与权限点注入客户端 store，供菜单与页面做权限渲染。
 */
export default async function AdminLayout({ children }) {
  const user = await getSessionUser()
  if (!user) {
    redirect('/login')
  }

  const permissions = db.getRole(user.roleLevel)?.permissions ?? []

  return (
    <AdminShell user={user} permissions={permissions}>
      {children}
    </AdminShell>
  )
}
