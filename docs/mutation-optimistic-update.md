# useMutation 乐观更新：逐行注释精讲

> 对应代码：`src/app/(admin)/products/page.jsx` 的 `statusMutation`（上下架开关）。
> 看不懂的主要障碍通常是三个：`onMutate` 的 `async` 和 `await` 在等谁、`ctx` 是什么、
> `previous` 为什么是个数组。下面按执行顺序逐行拆开。

---

## 一、先建立全局图景：这次 mutation 的完整生命周期

乐观更新的目标是：**开关先翻（不等服务器），服务器确认后对账，失败就撤回**。

```
用户点击 Switch
      │
      ▼
statusMutation.mutate({ row, value })          ← 触发，传入本次调用的参数
      │
      ├─ ① onMutate(vars)      请求发出【前】   → 改本地缓存 + 拍快照
      ├─ ② mutationFn(vars)    真正发 HTTP 请求
      │
      ├─── 成功 ──► ③ onSuccess(data, vars, ctx)  → 提示成功
      │              ④ onSettled(...)             → invalidate 让缓存重新对账
      │
      └─── 失败 ──► ③' onError(err, vars, ctx)    → 用快照回滚 + 提示失败
                     ④' onSettled(...)            → 同样 invalidate
```

两个钩子的先后永远是：`onMutate → (onSuccess | onError) → onSettled`。
`ctx`（context）只有一个来源：**`onMutate` 的返回值**，React Query 原样传给后续钩子，
专门用来在失败时"把出发前的现场带回来"。

---

## 二、逐行注释

```js
const statusMutation = useMutation({
```
`useMutation` 不会自动执行，只是**注册**这套逻辑并返回控制器。
真正的触发是 JSX 里的 `statusMutation.mutate({ row, value })`。
`row` 是被点的商品行，`value` 是 `'on' | 'off'`。

```js
  mutationFn: ({ row, value }) => api.products.updateStatus(row.id, value),
```
**唯一的必填项**：真正干活（发请求）的函数。
- 入参就是 `mutate(...)` 传的对象，原封不动解构出来。
- 必须返回 Promise。这个 Promise resolve → 走 `onSuccess`；reject → 走 `onError`。
- 只有一个钩子能发请求，就是它。写操作永远不进缓存、不自动重发。

```js
  // onMutate 先改缓存：所有 ['products'] 前缀的列表里这一行立刻变，开关零延迟
  onMutate: async ({ row, value }) => {
```
请求还没发出就先跑的钩子，干两件事：**先改缓存（乐观），再拍快照（留后路）**。
标 `async` 是因为里面有一个必须等完的 `await`（下一行），不是装饰。

```js
    await queryClient.cancelQueries({ queryKey: ['products'] })
```
**取消所有在途的商品列表请求，并等它们真正停下。**

为什么需要这行？想象一个竞态场景：
1. 你刚切了筛选条件，React Query 正在请求"新条件下的列表"（在途）
2. 这时你点了某个商品的上下架开关，`onMutate` 把缓存里这一行改成了 `on`
3. 1 秒后在途请求返回，React Query 把**整个列表缓存覆盖**成服务端快照
4. 结果：你刚乐观改的状态被旧响应冲掉了，开关又弹回去

`cancelQueries` 把在途请求作废，杜绝第 3 步。`await` 是要等"取消"这个动作
本身完成——如果请求取消得慢，后面紧跟着的 `setQueriesData` 也可能被
响应回写覆盖，所以要排好队再动手。

```js
    const previous = queryClient.getQueriesData({ queryKey: ['products'] })
```
**拍快照：把所有 key 以 `['products']` 开头的缓存条目原样抄一份。**

`getQueriesData` 是**前缀匹配**，返回的是数组，每项是 `[key, data]` 二元组：

```js
// 假设你翻过页、切过筛选，缓存里可能有多个列表版本：
previous = [
  [['products', { page:1, pageSize:8, ... }], { items:[...], total:12 }],  // 当前筛选组合
  [['products', { page:2, pageSize:8, ... }], { items:[...], total:12 }],  // 之前浏览过的组合
]
```

为什么快照所有匹配项而不只当前页？因为下一行的修改是**批量的**——改的
是所有缓存里的同一行商品。对称地，回滚时也必须整批还原，漏一份就有一处
显示错状态。这个数组就是后面 `onError` 里 `ctx.previous` 的本体。

```js
    queryClient.setQueriesData({ queryKey: ['products'] }, old =>
      old ? { ...old, items: old.items.map(item => (item.id === row.id ? { ...item, status: value } : item)) } : old,
    )
```
**乐观写入：把所有缓存列表里的这一行，状态直接改成目标值。**

拆开看这个 updater：
- `setQueriesData` 前缀匹配所有 `['products', ...]` 缓存，对每一条执行回调
- `old` 是该条缓存当前的数据（`{ items, total }` 形状），`null/undefined` 时原样返回
- `{ ...old, items: ... }` 不可变更新：外层对象换新，`items` 数组逐条 map
- map 内三目：id 匹配的那一行返回 `{ ...item, status: value }`（只改 status 的
  新对象），其余行原样返回

执行完的瞬间，**UI 已经变了**——Switch 是受控组件，读的就是缓存里的
`row.status`。用户感知：零延迟。此刻请求还在路上。

```js
    return { previous }
```
**把快照放进 context。** 这是 `onMutate` 返回值的唯一用途：React Query 会把它
作为第三个参数传给 `onError` / `onSuccess` / `onSettled`。命名随意（叫 `ctx`、
`snapshot` 都行），惯例是返回一个对象把要用回的东西打包。

```js
  },
  onError: (err, _vars, ctx) => {
```
`mutationFn` 的 Promise reject（接口报错/网络断）时进这里。
参数固定顺序：`(错误, 当时的入参, onMutate 的返回值)`。
`_vars` 下划线开头表示"这个参数我不用"的命名惯例。

```js
    ctx?.previous.forEach(([key, data]) => queryClient.setQueryData(key, data))
```
**回滚：把快照逐条写回缓存。**

- `ctx?.`：可选链。极少数情况下（组件卸载等）ctx 可能是 undefined，防炸
- `previous` 是 `[[key, data], ...]` 数组，`forEach` 解构出每个二元组
- `setQueryData(key, data)`：**精确写某一个 key** 的缓存（注意和 `setQueriesData`
  前缀批量写的区别），把出发前的原样数据还原回去

执行完，UI 立刻弹回点击前的状态。

```js
    message.error(err.bizMessage)
```
提示用户。`err.bizMessage` 是 `api.js` 统一收敛过的业务错误文案
（服务端返回的 `message` 字段），而不是原始异常对象。

```js
  },
  onSettled: () => queryClient.invalidateQueries({ queryKey: ['products'] }),
```
**无论成功失败都执行：把所有商品缓存标记为脏，向服务器重新拉取对账。**

放在 `onSettled`（成功失败都会跑）而不是 `onSuccess` 的原因：
- 失败路径也想要它——回滚只是恢复本地显示，但"服务器上到底什么状态"
  应该重新问一次，避免快照本身就过期的边缘情况
- 成功路径也想要它——乐观写入终究是"猜"的，最终以服务器返回为准

这是乐观更新的标准收尾：**先猜（onMutate），错了撤（onError），最后对账（onSettled）**。

```js
  onSuccess: (data, { row, value }) => message.success(`「${row.name}」已${value === 'on' ? '上架' : '下架'}`),
```
请求成功才跑。参数：`(响应数据, 当时的入参, ctx)`。
解构入参拿到行和目标值，拼成功提示。
注意：此时 invalidate 已在队列里（onSuccess 先于 onSettled），缓存很快会被
服务器数据覆盖，提示先弹出来，体验上就是"秒成功"。

```js
})
```

---

## 三、JSX 里的两行配套代码

```jsx
loading={statusMutation.isPending && statusMutation.variables?.row.id === row.id}
```
Switch 的转圈条件 = "有 mutation 在途" **且** "在途的正是这一行"。
- `statusMutation.isPending`：只要在途就 true，不加第二个条件会让**所有行**一起转圈
- `statusMutation.variables`：最近一次 `mutate()` 的入参，就是当初传的 `{ row, value }`
- `?.`：还没点过时 variables 是 undefined，直接取 `.row.id` 会报错

```jsx
onChange={value => statusMutation.mutate({ row, value: value ? 'on' : 'off' })}
```
Switch 的 `value` 是布尔，接口要 `'on' | 'off'`，这里做转换并触发 mutation。
注意 Switch 是**受控**的：`checked` 读缓存，不读这个回调的参数——
所以乐观更新改缓存后 UI 自然跟着变，这里只需要发请求。

---

## 四、走一遍时间线（以"把 101 号商品下架"为例）

| 时刻 | 发生什么 | 缓存里 101 的 status | UI 开关 |
|---|---|---|---|
| t0 用户点击 | `mutate({row, value:'off'})` | `on` | 上架 |
| t1 onMutate | 取消在途请求 → 拍快照 → 改缓存 | **`off`** | **下架**（零延迟） |
| t2 | HTTP 请求在途 | `off` | 下架（转圈） |
| t3a 请求成功 | onSuccess 提示 → onSettled invalidate → 重新拉取 | `off`（服务器确认） | 下架 |
| t3b 请求失败 | onError 用快照回滚 → 提示失败 → onSettled invalidate | **`on`**（弹回） | 上架 |

---

## 五、常见疑问

**Q：为什么不直接等接口回来再改状态（非乐观）？**
可以，代码简单一半。代价是每次点击开关都有几百毫秒延迟，列表操作频繁时
很钝。旧 Nuxt 版的 `patchItem` 就是乐观更新，这里是对标还原。

**Q：既然 onSettled 一定会 invalidate，onMutate 改缓存是不是白改？**
不白改。invalidate 的重新拉取是**后台**进行的（isPending 不变，isFetching 变），
旧缓存会一直显示到新数据到达。onMutate 的修改让用户**立即**看到结果，
这就是"乐观"的全部意义。

**Q：`getQueriesData` 拍快照和 `cancelQueries` 的顺序能换吗？**
建议保持"先取消、再拍快照"。反过来理论上也行（快照是同步读，不涉及在途），
但先取消能保证拍快照和改缓存之间没有任何请求回调插进来，三个操作原子化。

**Q：如果组件在请求途中卸载了会怎样？**
React Query 会照常走完 onError/onSettled（缓存是全局的，不依赖组件存活），
回滚依然生效，不会内存泄漏。ctx 理论上可 undefined，所以回滚那行有 `?.`。
