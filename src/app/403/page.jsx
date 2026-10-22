import Link from 'next/link'
import './403.scss'

/**
 * 403 无权限页（对标旧版 pages/403.vue）：
 * 独立公开路由，不在 (admin) 路由组内 —— 无侧栏顶栏的整屏提示页。
 * 触发方：AdminShell 的页面级权限守卫（已登录但权限不足时 replace 过来）。
 */
export const metadata = { title: '无权限访问 · 商品运营后台' }

export default function ForbiddenPage() {
  return (
    <div className="fbd-page">
      <div className="fbd-card">
        <p className="fbd-code">403</p>
        <h1>没有权限访问这个页面</h1>
        <p className="fbd-desc">
          当前账号的角色没有该页面的访问权限，如需开通请联系管理员。
        </p>
        <Link href="/login" className="fbd-btn">返回登录</Link>
      </div>
    </div>
  )
}
