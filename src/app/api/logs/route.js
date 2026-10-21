import { NextResponse } from 'next/server'
import { PERM } from '@/shared/permissions'
import { db } from '@/server/utils/db'
import { requirePerm } from '@/server/utils/permission'
import { handler } from '@/server/utils/http'

/**
 * GET /api/logs —— 操作日志列表（log:view）
 * 这一步先提供只读列表，用于验证写操作确实落库；日志页的完整改造在下一步。
 */
export const GET = handler(async (request) => {
  await requirePerm(PERM.LOG_VIEW)

  const { searchParams } = new URL(request.url)
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize')) || 20))
  const action = String(searchParams.get('action') ?? '').trim()
  const keyword = String(searchParams.get('q') ?? '').trim().toLowerCase()

  const matched = db.listLogs().filter((log) => {
    if (action && log.action !== action) return false
    if (keyword && !`${log.actorName} ${log.targetName} ${log.detail}`.toLowerCase().includes(keyword)) {
      return false
    }
    return true
  })

  const total = matched.length
  const start = (page - 1) * pageSize

  return NextResponse.json({
    items: matched.slice(start, start + pageSize),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  })
})
