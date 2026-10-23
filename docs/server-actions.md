# Server Actions（练习④笔记）

> 2026-10-23 完成。落点：`roles/actions.js` 保存权限改走 Server Action，`route.js` 端点版保留作对照。

## 一、它是什么

`'use server'` 标记的 async 函数：**客户端像调普通函数一样调用，实际在服务端执行**。底层由 React 自动接线成 POST 请求 + 参数序列化，不需要 URL、路由文件、fetch 封装。

```js
// src/app/(admin)/roles/actions.js —— 服务端
'use server'
export async function saveRolePermissions(level, permissions) {
  const user = await requirePerm(PERM.ROLE_MANAGE)  // 摸 cookie、db 都可以
  db.updateRolePermissions(level, permissions)
}

// roles/page.jsx —— 客户端组件里直接调用
await saveRolePermissions(level, draftOf(level))    // 看着是本地函数，实际跑在服务端
```

## 二、解决什么问题

REST 写操作的固定四层样板：**设计 URL/方法 → 写 route.js → 写 fetch 封装 → JSON 序列化往返**。Server Actions 把四层压成一层「函数调用」。Nuxt 里写 `server/api` + `$fetch` 是同一套样板，Server Actions 是 App Router 独有的替代路线。

对比本项目同一业务的两份实现（都在仓库里）：

| | Route Handler 版（route.js） | Server Action 版（actions.js） |
| --- | --- | --- |
| 端点定义 | 文件路径即 URL（PUT /api/roles/:level） | 导出的函数名即端点 |
| 接参 | `await params` + `request.json()` | 普通函数参数 |
| 权限校验 | `requirePerm()`（相同） | `requirePerm()`（相同，复用） |
| 错误约定 | `throw ApiError` → `handler()` 转 JSON `{statusCode,message}` → api 层附成 `err.bizMessage` | `throw ApiError` → React 把 `err.message` 原样 reject 给调用方 |
| 客户端调用 | `fetch PUT` + JSON body | `await fn(args)` |
| 返回值 | `NextResponse.json(...)` | 直接 return 普通对象（可序列化） |

## 三、怎么选

- **Server Actions**：页面表单/按钮直接触发的写操作（本项目绝大多数写场景），少一层样板。
- **Route Handler 保留**：要被第三方/脚本/curl 调用；需要精确 HTTP 语义（状态码、缓存头、Webhook 回调）。`api/roles` 端点保留正是这个原因——它同时是两种范式的活教材。

## 四、约束与踩坑

1. **`'use server'` 文件里所有导出必须都是 async 函数**——放个常量导出直接构建报错。工具函数要放别的文件。
2. **不能在渲染期调用**：只能在事件回调、表单 `action={}`、useMutation 的 mutationFn 等「意图明确的时机」调用。渲染期调用 = 一次隐式写操作，框架直接拒绝。
3. **函数体永不进客户端 bundle**：可以放心 import db/session 等纯服务端模块；但客户端组件 import 这个文件时拿到的只是「调用桩」。
4. **返回值必须可序列化**（普通对象/数组/字符串），不能返回类实例、函数。
5. **错误语义变化**：端点版页面代码习惯拿 `err.bizMessage`；Action 版直接 `err.message`。本次 roles 页 onError 已随之修改。
6. **安全不变**：Server Action 也是公开的 HTTP POST 端点（URL 是当前页面路径 + Next-Action 头），任何人可以构造请求——所以 `requirePerm` 一行都不能少，服务端校验永远是唯一安全边界，参数照做白名单过滤。

## 五、与 React Query 的配合（本项目的写法）

Server Actions 只替代了「请求层」（api.js 那层 fetch），**缓存层照旧**：

```js
useMutation({
  mutationFn: () => saveRolePermissions(level, perms),  // Action 当 mutationFn
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ['roles'] }),
})
```

RQ 的缓存失效/乐观更新/重试机制完整保留。这也是「Action 替代 fetch，不替代 React Query」的判断依据——练习①②讨论过的 useOptimistic 更适合无 RQ 的纯 Server Action 项目。

## 六、验证

`D:/0328/verify-tools/verify-server-actions.mjs`（生产模式 3100）：
1. admin 登录 → /roles → 勾选切换 2 级「上下架」权限 → 保存成功提示
2. GET /api/roles 断言变更已落库 → 断言日志页出现「权限变更 · 上下架」记录
3. 切回还原 → 断言还原（脚本幂等可重跑）
