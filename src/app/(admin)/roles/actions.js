'use server'

import { ALL_PERMISSIONS, PERM } from '@/shared/permissions'
import { db } from '@/server/utils/db'
import { ApiError } from '@/server/utils/http'
import { requirePerm } from '@/server/utils/permission'
import { writeLog } from '@/server/utils/audit'

/**
 * 保存某级角色的权限点——Server Action 版（练习④）。
 * 对照实现：src/app/api/roles/[level]/route.js（PUT 端点版，保留作两条范式对比）。
 *
 * 与 route.js 版的对应关系：
 * - 不再有 URL / HTTP 方法 / request.json()：参数就是普通函数参数，
 *   框架自动序列化传输（底层仍是一次 POST，由 React 接线）
 * - 权限关卡完全复用 requirePerm（服务端校验是唯一安全边界，与端点版同一道门）
 * - 错误约定：直接 throw ApiError，客户端 catch 到的 err.message 就是给用户看的文案
 *   （端点版的 ApiError 由 handler() 转成 { statusCode, message } JSON；
 *   Action 版由 React 把 message 原样 reject 给调用方）
 *
 * 约束：'use server' 文件里的每个导出都必须是 async 函数；
 * 本函数只能在事件回调 / 表单动作等非渲染期调用。
 */

export async function saveRolePermissions(level, permissions) {
  const user = await requirePerm(PERM.ROLE_MANAGE)

  const numLevel = Number(level)
  const role = Number.isInteger(numLevel) ? db.getRole(numLevel) : null
  if (!role) {
    throw new ApiError(404, '角色不存在')
  }
  if (numLevel === 1) {
    throw new ApiError(400, '1 级管理员权限已锁定，不可修改')
  }

  // 白名单过滤 + 去重：伪造的权限点直接丢弃而不是报错（与端点版一致）
  const clean = [...new Set(
    (Array.isArray(permissions) ? permissions : [])
      .filter(p => ALL_PERMISSIONS.includes(p)),
  )]

  // 与保存前对比，日志只记真正的增量
  const added = clean.filter(p => !role.permissions.includes(p))
  const removed = role.permissions.filter(p => !clean.includes(p))
  const changes = []
  if (added.length > 0) changes.push(`新增 ${added.join('、')}`)
  if (removed.length > 0) changes.push(`移除 ${removed.join('、')}`)

  db.updateRolePermissions(numLevel, clean)

  if (changes.length > 0) {
    writeLog(user, {
      action: 'role:update',
      targetType: '角色',
      targetId: numLevel,
      targetName: role.label,
      detail: changes.join('；'),
    })
  }

  return db.getRole(numLevel)
}
