import { NextResponse } from 'next/server'
import { ALL_PERMISSIONS, PERM } from '@/shared/permissions'
import { db } from '@/server/utils/db'
import { requirePerm } from '@/server/utils/permission'
import { writeLog } from '@/server/utils/audit'
import { ApiError, handler, parseId } from '@/server/utils/http'

/**
 * PUT /api/roles/:level —— 修改某一级角色的权限点（role:manage）。
 *
 * 【范式对照】练习④后页面已改走 Server Action（roles/actions.js），
 * 本端点保留作 Route Handler 版参考：同一个业务在两条路线下的写法对比，
 * 见 docs/server-actions.md。页面代码不再调用 api.roles.update。
 *
 * 1 级锁定不可改（服务端也拦，不只靠页面禁用勾选框）；
 * permissions 做白名单过滤：只保留 ALL_PERMISSIONS 里定义过的权限点并去重，
 * 伪造的字符串直接丢弃，而不是报错——客户端传脏数据不该让整次保存失败。
 */
export const PUT = handler(async (request, { params }) => {
  const user = await requirePerm(PERM.ROLE_MANAGE)

  const { level: rawLevel } = await params
  const level = parseId(rawLevel)
  const role = Number.isInteger(level) ? db.getRole(level) : null
  if (!role) {
    throw new ApiError(404, '角色不存在')
  }
  if (level === 1) {
    throw new ApiError(400, '1 级管理员权限已锁定，不可修改')
  }

  const body = await request.json().catch(() => null)
  const permissions = [...new Set(
    (Array.isArray(body?.permissions) ? body.permissions : [])
      .filter(p => ALL_PERMISSIONS.includes(p)),
  )]

  // 与保存前对比，日志只记真正的增量
  const added = permissions.filter(p => !role.permissions.includes(p))
  const removed = role.permissions.filter(p => !permissions.includes(p))
  const changes = []
  if (added.length > 0) changes.push(`新增 ${added.join('、')}`)
  if (removed.length > 0) changes.push(`移除 ${removed.join('、')}`)

  db.updateRolePermissions(level, permissions)

  if (changes.length > 0) {
    writeLog(user, {
      action: 'role:update',
      targetType: '角色',
      targetId: level,
      targetName: role.label,
      detail: changes.join('；'),
    })
  }

  return NextResponse.json({ item: db.getRole(level) })
})
