/**
 * 业务接口的统一入口 —— 全项目唯一写 URL 字符串的地方。
 * 从 nuxt_demo 的 useApi.js 平移：方法面完全一致，底层从 $fetch 换成原生 fetch。
 *
 * 用法（页面组件里）：
 *   const data = await api.products.list({ page: 1, pageSize: 8 })
 *   // 失败时 catch 到的 err.bizMessage 就是给用户看的文案
 */

/** 服务端错误体的 message 就是业务文案（见 src/server/utils/http.js） */
function pickMessage(data, fallback) {
  return data?.message ?? fallback
}

/** 去掉 undefined / null / ''，避免 ?q=&status= 这类空键。注意待分类 id 是 -1，必须保留 */
function cleanQuery(query) {
  if (!query) return undefined
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== undefined && value !== null && value !== ''),
  )
}

async function call(key, url, { query, body, ...rest } = {}) {
  const search = query ? `?${new URLSearchParams(cleanQuery(query))}` : ''

  let res
  try {
    res = await fetch(url + search, {
      credentials: 'same-origin', // 同源自动带 session cookie
      ...rest,
      ...(body !== undefined
        ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }
        : {}),
    })
  }
  catch {
    const err = new Error(`${key}失败，网络异常，请稍后重试`)
    err.bizMessage = err.message
    throw err
  }

  const data = await res.json().catch(() => null)

  if (!res.ok) {
    const err = new Error(pickMessage(data, `${key}失败，请稍后重试`))
    err.bizMessage = err.message
    err.statusCode = res.status
    throw err
  }

  return data
}

export const api = {
  /** 逃生口：遇到没封装的接口，用 api.raw('/api/xxx', { method: 'POST', body }) 直接用 */
  raw: (url, options = {}) => call('请求', url, options),

  products: {
    list: query => call('查询商品', '/api/products', { query }),
    detail: id => call('查询商品', `/api/products/${id}`),
    create: body => call('新建商品', '/api/products', { method: 'POST', body }),
    update: (id, body) => call('保存商品', `/api/products/${id}`, { method: 'PUT', body }),
    updateStatus: (id, status) => call('上下架', `/api/products/${id}/status`, { method: 'PUT', body: { status } }),
    remove: id => call('删除商品', `/api/products/${id}`, { method: 'DELETE' }),
  },

  categories: {
    list: () => call('查询分类', '/api/categories'),
    create: body => call('新建分类', '/api/categories', { method: 'POST', body }),
    update: (id, body) => call('保存分类', `/api/categories/${id}`, { method: 'PUT', body }),
    remove: id => call('删除分类', `/api/categories/${id}`, { method: 'DELETE' }),
  },

  auth: {
    login: body => call('登录', '/api/auth/login', { method: 'POST', body }),
    logout: () => call('退出登录', '/api/auth/logout', { method: 'POST' }),
    me: () => call('获取当前用户', '/api/auth/me'),
  },

  roles: {
    list: () => call('查询角色', '/api/roles'),
    update: (level, permissions) => call('保存角色权限', `/api/roles/${level}`, { method: 'PUT', body: { permissions } }),
  },

  logs: {
    list: query => call('查询日志', '/api/logs', { query }),
  },
}
