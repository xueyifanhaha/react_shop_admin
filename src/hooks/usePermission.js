import { ROLE_PRESETS } from '@/shared/permissions'
import { useAuthStore } from '@/stores/auth'

/**
 * 当前页面能做什么。
 *
 * 权限来自 useAuthStore（服务端布局注入）；role 只做展示（级别 + 名称文案），
 * 直接读 ROLE_PRESETS——权限管理页只改 permissions，角色的 label 是静态的。
 */
export function usePermission() {
  const user = useAuthStore(s => s.user)
  const permissions = useAuthStore(s => s.permissions)
  const can = useAuthStore(s => s.can)
  const canAny = useAuthStore(s => s.canAny)

  const roleLevel = user?.roleLevel ?? 0
  const role = ROLE_PRESETS.find(r => r.level === roleLevel) ?? ROLE_PRESETS[0]

  return { role, permissions, can, canAny }
}
