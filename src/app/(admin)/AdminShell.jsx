'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { App, Avatar, Button, Layout, Menu } from 'antd'
import {
  LogoutOutlined,
  ProfileOutlined,
  SafetyCertificateOutlined,
  ShoppingOutlined,
  TagsOutlined,
} from '@ant-design/icons'
import { ADMIN_NAV, PERM } from '@/shared/permissions'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/hooks/usePermission'

const iconMap = {
  goods: <ShoppingOutlined />,
  tag: <TagsOutlined />,
  log: <ProfileOutlined />,
  shield: <SafetyCertificateOutlined />,
}

/**
 * 路由 → 所需权限点（对标旧版 auth.global.js 的 requiredPerm）。
 * 与旧版差异：旧版把 /products/[id] 详情页划给 product:edit，
 * 新项目详情页明确支持 viewer 只读查看，故 /products 全段统一按 product:view。
 */
function requiredPerm(pathname) {
  if (pathname.startsWith('/products')) return PERM.PRODUCT_VIEW
  if (pathname.startsWith('/categories')) return PERM.CATEGORY_VIEW
  if (pathname.startsWith('/logs')) return PERM.LOG_VIEW
  if (pathname.startsWith('/roles')) return PERM.ROLE_MANAGE
  return null
}

/** 侧边栏菜单按权限过滤：2/3 级自动看不到操作日志与权限管理 */
function useMenus(can) {
  return ADMIN_NAV.filter(item => can(item.permission)).map(item => ({
    key: item.to,
    icon: iconMap[item.icon],
    label: <Link href={item.to}>{item.label}</Link>,
  }))
}

export default function AdminShell({ user, permissions, children }) {
  const pathname = usePathname()
  const router = useRouter()
  const { message } = App.useApp()
  const logout = useAuthStore(s => s.logout)
  // 权限已由外层 AuthProvider 提供（服务端 props 直传，首帧即有值），这里不再写 store
  const { role, can } = usePermission()

  /* ---------- 页面级权限守卫（对标旧版全局中间件的 /403 分支） ----------
   * 服务端布局只拦「未登录」；「已登录但权限不足」在这里 replace 到 /403。
   * 判断读服务端直传的 permissions prop 而非 store：store 由 effect 注入，
   * 刷新后的首帧还是空的，用它会把管理员也误踢出去。 */
  const need = requiredPerm(pathname)
  const allowed = !need || permissions.includes(need)
  useEffect(() => {
    if (!allowed) router.replace('/403')
  }, [allowed, router])

  const menus = useMenus(can)
  const currentLabel
    = ADMIN_NAV.find(item => pathname.startsWith(item.to))?.label ?? '后台'
  const avatarText = (user?.name ?? '?').charAt(0).toUpperCase()

  async function onLogout() {
    await logout()
    message.success('已退出登录')
    router.push('/login')
  }

  return (
    <Layout className="min-h-screen">
      <Layout.Sider
        width={232}
        theme="light"
        className="border-r border-gray-200"
        // antd 给 .ant-layout-sider 内置 position:relative（无层级样式，压过 Tailwind
        // @layer 里的 sticky 工具类），固定侧栏只能用内联样式
        style={{ position: 'sticky', top: 0, height: '100vh' }}
      >
        <div className="admin-brand">
          <span className="admin-brand-mark">商</span>
          <span className="text-[13.5px] font-medium">商品运营后台</span>
        </div>

        <Menu mode="inline" items={menus} selectedKeys={[pathname]} className="border-0 px-2 pt-3" />

        <div className="admin-side-foot">
          <div className="flex items-center gap-2.5">
            <Avatar
              size={32}
              style={{ backgroundColor: '#eef3fe', color: '#2563eb', fontSize: 13, fontWeight: 500 }}
            >
              {avatarText}
            </Avatar>
            <div className="admin-user-meta">
              <b>{user?.name ?? role.label}</b>
              <span>{role.level} 级 · {role.label}</span>
            </div>
          </div>
        </div>
      </Layout.Sider>

      <Layout className="min-w-0">
        <Layout.Header className="admin-topbar">
          <div className="admin-crumb">
            后台管理 <span className="divider">/</span> <b>{currentLabel}</b>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="admin-whoami">{user?.username}</span>
            <Button type="text" icon={<LogoutOutlined />} onClick={onLogout}>
              退出
            </Button>
          </div>
        </Layout.Header>

        <Layout.Content className="admin-content">
          {allowed ? children : null}
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
