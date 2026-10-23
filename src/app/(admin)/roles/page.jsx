import RolesClient from './RolesClient'

/** metadata 必须从 Server Component 导出（'use client' 页面不行），故拆外壳。
 * title 是短名，根 layout 的 template 会拼成「权限管理 · 商城后台」 */
export const metadata = { title: '权限管理' }

export default function RolesPage() {
  return <RolesClient />
}
