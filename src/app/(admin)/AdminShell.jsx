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
import { ADMIN_NAV } from '@/shared/permissions'
import { useAuthStore } from '@/stores/auth'
import { usePermission } from '@/hooks/usePermission'

const iconMap = {
  goods: <ShoppingOutlined />,
  tag: <TagsOutlined />,
  log: <ProfileOutlined />,
  shield: <SafetyCertificateOutlined />,
}

/** 侧边栏菜单按权限过滤：2/3 级自动看不到操作日志与权限管理 */
function useMenus(can) {
  const pathname = usePathname()
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
  const setSession = useAuthStore(s => s.setSession)
  const logout = useAuthStore(s => s.logout)
  const { role, can } = usePermission()

  // 服务端已确认过会话，这里只做一次注入，供页面组件读取
  useEffect(() => {
    setSession(user, permissions)
  }, [user, permissions, setSession])

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
        className="relative sticky top-0 h-screen border-r border-gray-200"
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
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
