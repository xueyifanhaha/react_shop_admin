/**
 * Next.js 版的接口错误约定（替代 Nuxt/h3 的 createError）。
 * 业务代码只管 throw new ApiError(statusCode, message)，
 * 由 handler() 统一捕获并转成 JSON 响应，路由文件里不再写 try/catch。
 */

export class ApiError extends Error {
  constructor(statusCode, message) {
    super(message)
    this.statusCode = statusCode
  }
}

/**
 * 包一层 route handler：
 * - ApiError 按状态码返回 { statusCode, message }
 * - 未知错误按 500 返回并打印日志，不向前端暴露堆栈
 */
export function handler(fn) {
  return async (...args) => {
    try {
      return await fn(...args)
    }
    catch (err) {
      if (err instanceof ApiError) {
        return Response.json(
          { statusCode: err.statusCode, message: err.message },
          { status: err.statusCode },
        )
      }
      console.error('[api] unhandled error:', err)
      return Response.json(
        { statusCode: 500, message: '服务器内部错误' },
        { status: 500 },
      )
    }
  }
}

/** 解析路由参数里的 id / level；非法值返回 NaN，交给调用方统一按 404 处理 */
export function parseId(value) {
  const id = Number(value)
  return Number.isInteger(id) ? id : NaN
}
