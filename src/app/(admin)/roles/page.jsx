'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Alert, App, Button, Checkbox, Tag } from 'antd'
import { ReloadOutlined } from '@ant-design/icons'
import { PERMISSION_GROUPS, ROLE_PRESETS } from '@/shared/permissions'
import { api } from '@/lib/api'
import './roles.scss'

/**
 * 权限管理页（对标旧版 pages/roles.vue）：
 * - 权限矩阵：行是权限点（按分组展示），列是 1/2/3 级角色；1 级锁定全选
 * - draft（草稿）与 savedRoles（服务端数据）分离：dirty = 两者不一致的级别
 * - 保存逐级 PUT（草稿里改了几级就提交几级），全部成功后失效 ['roles']；
 *   部分成功时已落库的级别保留，失败级别留在草稿里可直接重试
 * - 与旧版差异：Vue 用 computed 对比 draft/saved；这里 dirty 在每次渲染时
 *   直接算出来（React 没有响应式依赖，渲染即最新），不用额外维护
 */

/** 矩阵列：1 级锁定全选，2/3 级可编辑 */
const LEVELS = [
  { level: 1, label: '1 级 · 管理员', locked: true },
  { level: 2, label: '2 级 · 运营', locked: false },
  { level: 3, label: '3 级 · 只读', locked: false },
]

export default function RolesPage() {
  const { message } = App.useApp()
  const queryClient = useQueryClient()

  const rolesQuery = useQuery({ queryKey: ['roles'], queryFn: api.roles.list })
  const savedRoles = rolesQuery.data?.items ?? []

  /* ---------- 草稿：{ 1: [...], 2: [...], 3: [...] }，数据到达后初始化一次 ---------- */
  const [draft, setDraft] = useState(null)
  useEffect(() => {
    if (!rolesQuery.data) return
    // 函数式更新 + ?? ：已初始化过就不覆盖（保存后 refetch 也不会冲掉未保存的草稿）
    setDraft(prev => prev ?? Object.fromEntries(
      (rolesQuery.data.items ?? []).map(r => [r.level, [...r.permissions]]),
    ))
  }, [rolesQuery.data])

  function isChecked(level, perm) {
    return draft?.[level]?.includes(perm) ?? false
  }

  function toggle(level, perm) {
    setDraft(prev => ({
      ...prev,
      [level]: prev[level].includes(perm)
        ? prev[level].filter(p => p !== perm)
        : [...prev[level], perm],
    }))
  }

  /* ---------- dirty：与已保存版本不一致的角色级别（渲染时直接算，对标旧版 computed） ---------- */
  const changedLevels = savedRoles
    .filter((r) => {
      const d = draft?.[r.level] ?? []
      return r.permissions.length !== d.length || r.permissions.some(p => !d.includes(p))
    })
    .map(r => r.level)
  const dirty = draft !== null && changedLevels.length > 0

  /** 规则：2/3 级至少保留「查看商品」，否则整级变空白后台（黄色提示，不阻止保存） */
  const emptyRisk = draft !== null
    && LEVELS.some(({ level, locked }) => !locked && !isChecked(level, 'product:view'))

  /* ---------- 保存：逐级 PUT，成功后失效缓存让 savedRoles 与服务端对账 ---------- */
  const saveMutation = useMutation({
    mutationFn: async (levels) => {
      // 顺序提交，中途失败时前面已落库的级别保留在服务端
      for (const level of levels) {
        await api.roles.update(level, draft[level])
      }
    },
    onSuccess: () => {
      message.success('权限已保存：相关角色用户的下一次请求即按新权限校验，在线用户重新登录后界面同步')
      queryClient.invalidateQueries({ queryKey: ['roles'] })
    },
    onError: (err) => {
      // 部分成功也失效一次：已落库的级别让 savedRoles 追上来，失败级别留在草稿里可重试
      queryClient.invalidateQueries({ queryKey: ['roles'] })
      message.error(err.bizMessage)
    },
  })

  /** 放弃未保存的修改，回到已保存状态 */
  function discard() {
    setDraft(Object.fromEntries(savedRoles.map(r => [r.level, [...r.permissions]])))
  }

  /** 恢复种子角色预设（只是草稿操作，要点保存才会落库） */
  function resetToPreset() {
    setDraft(Object.fromEntries(
      structuredClone(ROLE_PRESETS).map(r => [r.level, [...r.permissions]]),
    ))
  }

  if (rolesQuery.isError) {
    return (
      <section className="role-card flex items-center justify-between gap-4 p-3.5">
        <Alert
          type="error"
          showIcon
          closable={false}
          className="flex-1"
          title="角色数据加载失败"
          description={rolesQuery.error?.bizMessage ?? '该页面需要「权限管理」权限'}
        />
        <Button size="small" className="shrink-0" onClick={() => rolesQuery.refetch()}>重新加载</Button>
      </section>
    )
  }

  return (
    <div>
      <div className="role-head">
        <div>
          <h1 className="role-title">权限管理</h1>
          <p className="role-sub">
            勾选每个角色拥有的权限点，保存后相关角色用户的下一次请求即按新权限校验 ·
            1 级管理员固定全量权限，不可修改
          </p>
        </div>
        <div className="role-actions">
          <Button icon={<ReloadOutlined />} disabled={!dirty} onClick={resetToPreset}>恢复默认</Button>
          <Button disabled={!dirty} onClick={discard}>放弃修改</Button>
          <Button
            type="primary"
            loading={saveMutation.isPending}
            disabled={!dirty}
            onClick={() => saveMutation.mutate(changedLevels)}
          >
            保存修改
          </Button>
        </div>
      </div>

      {emptyRisk && (
        <Alert
          className="role-notice"
          type="warning"
          closable={false}
          showIcon
          title="有角色将失去「查看商品」权限"
          description="取消后该级别登录将看不到任何菜单和商品数据，成为空白后台。可以保存，但请确认这是你想要的。"
        />
      )}

      <section className="role-card role-matrix">
        <div className="role-mhead">
          <span className="role-perm-name role-perm-name--strong">权限点</span>
          <span />
          <div className="role-cells">
            {LEVELS.map(col => (
              <div key={col.level} className="role-col">
                <b>{col.label}</b>
                {col.locked && <Tag>锁定</Tag>}
              </div>
            ))}
          </div>
        </div>

        {draft !== null && PERMISSION_GROUPS.map(group => (
          <div key={group.group} className="role-group">
            <h2>{group.group}</h2>
            {group.items.map(item => (
              <div key={item.perm} className="role-row">
                <span className="role-perm-name">{item.label}</span>
                <code className="role-perm-key">{item.perm}</code>
                <div className="role-cells">
                  {LEVELS.map(col => (
                    <div key={col.level} className="role-cell">
                      <Checkbox
                        checked={isChecked(col.level, item.perm)}
                        disabled={col.locked}
                        onChange={() => toggle(col.level, item.perm)}
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ))}
      </section>

      <p className="role-foot-hint">
        权限模型：角色 → 权限点。导航按权限过滤、页面由路由守卫拦截、按钮按权限渲染、接口由服务端校验——
        保存后服务端立即按新矩阵校验；在线用户界面上的导航与按钮来自登录时下发的权限快照，重新登录后同步。
      </p>
    </div>
  )
}
