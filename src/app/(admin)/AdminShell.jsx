'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { App, Button, Layout, Menu } from 'antd'
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
      <Layout.Sider width={232} theme="light" className="border-r border-gray-200 sticky top-0 h-screen">
        <div className="flex items-center gap-2.5 h-[60px] px-4.5 border-b border-gray-200">
          <span className="grid place-items-center w-6.5 h-6.5 rounded-lg bg-[#2563eb] text-white text-xs font-bold">商</span>
          <span className="text-[13.5px] font-medium">商品运营后台</span>
        </div>

        <Menu mode="inline" items={menus} selectedKeys={[pathname]} className="border-inline-end-0 px-2 pt-3" />

        <div className="absolute bottom-0 inset-x-0 border-t border-gray-200 p-3.5">
          <div className="flex items-center gap-2.5">
            <span className="grid place-items-center w-8 h-8 rounded-full bg-[#eef3fe] text-[#2563eb] text-[13px] font-medium">
              {avatarText}
            </span>
            <div className="min-w-0">
              <div className="text-[13px] font-medium leading-tight">{user?.name ?? role.label}</div>
              <div className="text-[11.5px] text-gray-400 leading-tight">{role.level} 级 · {role.label}</div>
            </div>
          </div>
        </div>
      </Layout.Sider>

      <Layout className="min-w-0">
        <Layout.Header className="bg-white border-b border-gray-200 flex items-center justify-between px-6 !h-[60px] sticky top-0 z-10">
          <div className="text-[13px] text-gray-400">
            后台管理 <span className="mx-1.5 text-gray-300">/</span>{' '}
            <span className="text-gray-800 font-medium">{currentLabel}</span>
          </div>
          <div className="flex items-center gap-2.5">
            <span className="text-[12.5px] text-gray-500 font-mono">{user?.username}</span>
            <Button type="text" icon={<LogoutOutlined />} onClick={onLogout}>
              退出
            </Button>
          </div>
        </Layout.Header>

        <Layout.Content className="w-full max-w-[1320px] mx-auto px-7 pt-6 pb-10">
          {children}
        </Layout.Content>
      </Layout>
    </Layout>
  )
}
