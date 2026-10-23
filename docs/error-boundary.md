# Error Boundary：Next 的 error.jsx / global-error.jsx 实战笔记

> 练习②的一半（error.jsx 部分），对应文件：`src/app/(admin)/error.jsx`、`src/app/global-error.jsx`、临时验证页 `(admin)/crash/page.jsx`。

## Error Boundary 是什么

React 的类组件机制：子树渲染期抛异常时，边界组件捕获异常、渲染兜底 UI，**避免整棵树白屏**。函数组件写不了它（没有等价 Hook），所以 Next 把它做成了**约定文件**——`error.jsx` 就是一个自动包进 React ErrorBoundary 的客户端组件，你只写兜底 UI。

## 两层边界，各管一段

| | `(admin)/error.jsx` | `app/global-error.jsx` |
|---|---|---|
| 兜住范围 | 本段**页面**及子段的渲染异常 | 根 layout 自身、以及其他边界都没接住的异常 |
| 渲染位置 | 在 AdminShell **内部**——侧栏/顶栏保留，只有内容区被替换 | **替换整个根 layout** |
| 硬性要求 | `'use client'`，接收 `{ error, reset }` | 同左，**且必须自己渲染 `<html>` 和 `<body>`** |
| 可用资源 | antd、全局 CSS 都还在（layout 没死） | 根 layout 里的 ConfigProvider/全局 CSS 全没了——global-error 里刻意不用 antd，全内联样式 |

## 兜不住的异常（最容易误解的点）

Error Boundary **只捕获渲染期异常**：

- ✅ render 函数里的 throw、`useMemo` 计算、子组件挂载失败、Server Component 抛错
- ❌ 事件回调（`onClick` 里 throw）——边界管不到，用 try/catch
- ❌ `useEffect` 里的异步异常——用 catch + 错误提示
- ❌ Server Actions / API 调用失败——那是数据问题，走页面级 Alert（现有 useQuery 错误处理）

心智模型：**Boundary 管「React 没法渲染出 UI」的情况；数据失败有 UI 可渲染，不归它管。**

## `reset()` 的语义

重试 = 让边界**重新渲染出错的子树**（不是刷新页面）：

- 异常是偶发的（网络抖动、时序问题）→ reset 恢复正常
- 异常是确定性的（代码 bug，每次渲染都炸）→ reset 会再次炸回错误页

所以 error.jsx 里要**永远配一个逃生出口**（我们的「返回商品列表」Link）——如果 reset 救不回来，用户还能离开这页。注意 `reset` 不会重置页码之外的客户端状态——出错的子树整体卸载重建，子树内的 state 天然归零。

## 验证记录（生产模式，puppeteer 4/4）

临时页 `(admin)/crash`：点击按钮 → 下一次渲染 `throw` → 断言：

1. 渲染异常被 error.jsx 兜住（显示「页面出错了」）
2. **侧栏与顶栏保留**——只有内容区被替换（error.jsx 渲染在 layout 内部的证据）
3. 点「重试」→ 子树重建，页面恢复
4. 验证页可访问、按钮正常

## 踩坑记录

1. **dev 模式验证不了边界**：Next dev 用自己的错误覆盖层（Dev Overlay）替代 error.jsx，SSR 阶段 curl 只能看到 dev 错误页（500 + `next-error-*` 标记）。**必须 `npm run build && next start` 走生产模式验证**
2. **生产 SSR 返回的 HTML 里没有边界 UI**（空 body + 500）——生产模式下服务端渲染出错时边界 UI 也在 hydration 后才出现，所以 curl/HTML 检查一律无效，只能真浏览器
3. **antd 两字按钮自动加空格**：「重试」渲染成「重 试」，脚本按 `textContent.includes('重试')` 匹配失败——匹配时先 `.replace(/\s/g, '')`
4. **Chrome 报 "computer has run out of resources"**：系统桌面资源临时耗尽，Chrome/Edge 全起不来；过一会自动恢复，属环境噪声不是代码问题

## 与 React 类组件的对照（了解即可）

```jsx
class ErrorBoundary extends React.Component {
  state = { error: null }
  static getDerivedStateFromError(error) { return { error } }   // 捕获 → 渲染兜底 UI
  componentDidCatch(error, info) { console.error(error, info) } // 副作用：上报日志
  render() { return this.state.error ? <Fallback/> : this.props.children }
}
```

`error.jsx` 的 `useEffect(() => console.error(error))` ≈ `componentDidCatch`；`reset()` ≈ `setState({ error: null })`。日常用约定文件就够，类组件写法只在「想在非路由位置精细包裹某棵子树」时才需要。
