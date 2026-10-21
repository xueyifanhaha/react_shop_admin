import { create } from 'zustand'
import { api } from '@/lib/api'

/**
 * 登录态与当前用户权限的唯一前端数据源。
 * 从 nuxt_demo 的 Pinia store 平移：状态与动作同名同义。
 * 差异：Zustand 没有 computed —— loggedIn / roleLevel 改为在使用处用 selector 派生；
 * 初始值不再靠 SSR payload 还原，而是由 (admin)/layout 服务端确认会话后注入。
 */
export const useAuthStore = create((set, get) => ({
  user: null,
  permissions: [],
  /** 是否已经向服务端确认过一次会话（防止重复请求 /me） */
  loaded: false,

  can: perm => get().permissions.includes(perm),
  canAny: (...perms) => perms.some(p => get().permissions.includes(p)),

  /** 服务端布局确认会话后调用，把用户与权限注入 store */
  setSession: (user, permissions) => set({ user, permissions, loaded: true }),

  async login(username, password) {
    const res = await api.auth.login({ username, password })
    set({ user: res.user, permissions: res.permissions, loaded: true })
    return res.user
  },

  async fetchMe() {
    try {
      const res = await api.auth.me()
      set({ user: res.user, permissions: res.permissions })
    }
    catch {
      // 401 等：视为未登录
      set({ user: null, permissions: [] })
    }
    finally {
      set({ loaded: true })
    }
  },

  async logout() {
    try {
      await api.auth.logout()
    }
    catch {
      // cookie 清理失败也照常本地登出
    }
    set({ user: null, permissions: [] })
  },
}))
