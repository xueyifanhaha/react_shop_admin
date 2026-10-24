'use client'

import { createContext, useContext, useEffect, useMemo } from 'react'
import { useAuthStore } from '@/stores/auth'

/**
 * 会话上下文：`(admin)/layout` 在服务端确认会话后，把 user / permissions
 * 作为 props 传进来，首帧（SSR + hydration）就带着权限渲染。
 *
 * 为什么不能只靠 zustand：store 是客户端模块单例，服务端渲染时永远是初始值
 * （user=null、permissions=[]），靠 useEffect 注入只发生在客户端提交之后。
 * 结果是「权限位控制的按钮/表格列」SSR 里不存在、客户端首帧却已有 →
 * hydration 不一致，React 报 mismatch 并把整棵子树在客户端重渲。
 * 之前的 /products 报错正是 `can(PRODUCT_EDIT) && <Button>新建商品</Button>`
 * 这一处：服务端 HTML 里没有这个按钮。
 */
const AuthContext = createContext(null)

export function AuthProvider({ user, permissions, children }) {
  const setSession = useAuthStore(s => s.setSession)

  // 仍往 store 同步一份：login / logout 这类动作定义在 store 上，保持两处一致，
  // 非组件代码（如 api 拦截器）也能读到当前会话
  useEffect(() => {
    setSession(user, permissions)
  }, [user, permissions, setSession])

  const value = useMemo(() => ({ user, permissions }), [user, permissions])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth 必须在 (admin) 段的 AuthProvider 内使用')
  }
  return ctx
}
