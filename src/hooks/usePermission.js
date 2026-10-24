import { useCallback } from 'react'
import { ROLE_PRESETS } from '@/shared/permissions'
import { useAuth } from '@/app/(admin)/AuthProvider'

/**
 * 当前页面能做什么。
 *
 * 权限来自 AuthProvider（服务端布局注入的 props），不是 zustand + useEffect 注入——
 * 后者服务端渲染时 permissions 永远是空数组，权限位控制的 UI（新建按钮、操作列）
 * SSR 里不存在、客户端首帧却有，必然 hydration mismatch。
 * role 只做展示（级别 + 名称文案），直接读 ROLE_PRESETS——权限管理页只改
 * permissions，角色的 label 是静态的。
 */
export function usePermission() {
  const { user, permissions } = useAuth()

  const can = useCallback(perm => permissions.includes(perm), [permissions])
  const canAny = useCallback((...perms) => perms.some(p => permissions.includes(p)), [permissions])

  const roleLevel = user?.roleLevel ?? 0
  const role = ROLE_PRESETS.find(r => r.level === roleLevel) ?? ROLE_PRESETS[0]

  return { role, permissions, can, canAny }
}
