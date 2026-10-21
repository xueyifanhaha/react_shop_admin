import { db } from './db'
import { getSessionUser } from './session'
import { ApiError } from './http'

/**
 * 接口层的权限关卡：所有写接口的第一行。
 * 401 = 未登录；403 = 登录了但没有这个权限点。
 * 前端藏按钮只是体验，这里才是真正的安全边界。
 */

export async function requireUser() {
  const user = await getSessionUser()
  if (!user) {
    throw new ApiError(401, '登录已过期，请重新登录')
  }
  return user
}

export async function requirePerm(perm) {
  const user = await requireUser()
  const role = db.getRole(user.roleLevel)

  if (!role || !role.permissions.includes(perm)) {
    throw new ApiError(403, `没有权限：${perm}`)
  }
  return user
}
