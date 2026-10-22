# useDeferredValue：让「输入即搜」不再手写防抖

> 本文对应 `src/app/(admin)/logs/page.jsx` 的重构：删掉 drafts/filters 双层 state 和「搜索」按钮，换成 React 18+ 的 `useDeferredValue`。

## 重构前的问题

旧方案（products/logs 列表页同款）：

```jsx
const [drafts, setDrafts] = useState({ keyword: '' })   // 输入框草稿，跟手
const [filters, setFilters] = useState({ keyword: '' }) // 提交值，进 queryKey
// useQuery 的 queryKey 用 filters —— 值变了才发请求

function applySearch() {
  setFilters({ ...drafts })       // 点「搜索」或回车才提交
  setPager(p => ({ ...p, page: 1 }))
}
```

手动维护两份 state + 一个提交动作，本质是**人肉防抖**：防「逐键发请求」，代价是用户必须多点一次按钮。

## 重构后

```jsx
import { useDeferredValue, useState } from 'react'

const [keyword, setKeyword] = useState('')
const [pager, setPager] = useState({ page: 1, pageSize: 8 })

// 输入框绑 keyword（高优先级，跟手）；
// 查询参数用 deferredKeyword（低优先级，React 挑渲染空闲时才"追上"最新值）
const deferredKeyword = useDeferredValue(keyword)

const query = {
  page: pager.page,
  pageSize: pager.pageSize,
  action,
  q: deferredKeyword.trim() || undefined,
}

// queryKey 每次渲染都是新对象？没关系：
// React Query 对 queryKey 做结构化内容哈希，值没变就不重取
const logsQuery = useQuery({ queryKey: ['logs', query], queryFn: () => api.logs.list(query) })
```

输入框 `onChange` 里只多一件事——条件变了回第一页：

```jsx
<Input
  value={keyword}
  onChange={e => {
    setKeyword(e.target.value)
    setPager(resetPage)   // resetPage: page===1 ? p : {...p, page:1}
  }}
/>
```

**「搜索」按钮没有了。** 用户敲字，列表自动跟上。

## 它是怎么防住逐键请求的

关键不是「延迟」，是**优先级调度**：

1. 每次敲键 → `keyword` 变 → React 先用**旧的** `deferredKeyword` 渲染一版（输入框立刻更新，界面不卡）
2. React 空下来后，再用新 keyword 的 deferred 值渲染一版 → `query` 变 → useQuery 重取
3. 如果在你空下来之前又敲了下一个键，**中间那版渲染直接被丢弃**——只有「稳定下来」的值会真正触发请求

对比两种防抖：

| | debounce（定时器） | useDeferredValue |
|---|---|---|
| 原理 | 固定延迟，停手 N ms 后执行 | 并发调度，渲染赶得上就零延迟 |
| 快速输入 | 每 N ms 必发一次 | 中间态全部跳过，只发最后一次 |
| 输入框状态 | 要么受控于草稿 state，要么非受控 | **同一个 state，两个优先级** |

## 三个注意点

1. **deferred 值不保证"最新"**：渲染时它可能是上一拍的旧值。适合查询参数、过滤计算，不适合显示在输入框里（输入框必须绑原值，否则打字会卡顿回跳）
2. **「条件变回第一页」要手动做**：按钮方案里它在 applySearch 里；现在挪到 onChange 里。写在 onChange（高优先级）而不是监听 deferredKeyword 的 effect 里——后者又会被 react-hooks 新规拦（effect 里同步 setState）
3. **和 useTransition 的分工**：`useTransition` 是「我主动说这段更新不重要」（`startTransition(() => setX(...))`）；`useDeferredValue` 是「这个值你看着办」。值由多方更新时用 deferred 更省心；要同时标记多个更新时用 transition。

## 速记版

```
useDeferredValue(值) → 返回一个"慢半拍"的副本
  - 输入控件绑原值，重活绑副本
  - 副本默认=原值；值变了先拿旧副本渲染，空闲后再换新副本渲染
  - 连续变更 → 中间渲染被跳过 → 只对最终值生效
  - 搭配 useQuery：queryKey 结构化哈希，值没变不重取，天然配合
```

## 留给 products 页的作业

products 列表页还是旧的双层 state 方案（它多一个分类 Select 和状态列）。试着按本文模式重构它，验证脚本在 `workspace/verify-products.mjs`（若与 logs 流程一致可直接复用断言思路）。
