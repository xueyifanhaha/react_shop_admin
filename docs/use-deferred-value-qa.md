# Q&A：useDeferredValue 包装后的值用在哪、原始值用在哪？

> 问题：使用 useDeferredValue 进行包装，包装后的值在最终使用的时候用，页面中还是用原始值，是这意思吧？

**一句话回答：对。原始值管「看得见的」（输入框跟手），deferred 值管「算得慢的」（发请求、重渲染）。**

## 双值流转图

```
                    ┌── 立即 ──→ 原始值 keyword ──→ 输入框显示（跟手，零延迟）
用户敲键盘 ──┤
                    └── React 空闲时才更新 ──→ deferred 值 ──→ queryKey / 重活（发请求、重渲染）
```

- 原始值：高优先级，立刻渲染
- deferred 值：低优先级、可被打断，React 挑渲染空闲时才"追上"最新值

## 对照项目代码（logs 页）

```jsx
const [keyword, setKeyword] = useState('')
const deferredKeyword = useDeferredValue(keyword)

// 原始值 → 输入框（要跟手的地方）
<Input value={keyword} onChange={e => setKeyword(e.target.value)} />

// deferred 值 → 查询条件（要发请求的重活）
const query = { ..., q: deferredKeyword || undefined }
```

## 两个拧紧的细节

**1. "最终使用的时候用" 的准确含义**

deferred 值不是"最后才存在"——它每时每刻都在，只是比原始值**慢半拍**（React 空闲时才追上来）。所以是"快慢之分"，不是"有先后顺序的两步提交"。这也是它和旧方案（drafts/filters 双层 state）的本质区别：

| 旧方案 | useDeferredValue |
|---|---|
| 人**手动决定**"点了搜索才提交" | React **自动**在背后追赶 |
| 同一个值存两份 state | 同一个 state，两个优先级 |

**2. 包装什么有讲究**

只包装"会引起昂贵计算/请求"的那部分：

- logs 页只 defer 了 `keyword`——逐键输入是**连续变化**，defer 有意义；Select 的 action 没包装——离散单击没有中间态，defer 它没意义还多一拍延迟
- products 页因为 keyword/categoryId/status 在一个对象里，才整体 defer（命名为 `deferredFilters`，名副其实）

## 自检口诀

> **绑在 DOM 属性上的用原值，喂给昂贵计算的用 deferred 值。**

接反了会怎样：`Input value={deferredXxx}` → 打字跟不上手、光标回跳（products 页练习时踩过的坑）。
