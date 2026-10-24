# Intercepting Routes 拦截路由（商品快看实战）

> 练习日期：2026-10-23。目标：在商品列表页点商品名 → 弹窗快看；刷新/直开 → 完整编辑页。同一 URL，两种呈现。

## 一、解决的问题

纯 SPA 的弹窗没有 URL：刷新就丢、不能分享给同事。拦截路由给弹窗一个**真实 URL**——软导航时弹窗呈现，硬导航时完整页呈现，链接语义完整。

## 二、目录结构（本项目的实现）

```text
src/app/(admin)/products/
├── layout.jsx                  ← 渲染 {children}{modal}，两个 slot 都不能漏
├── @modal/                     ← Parallel Route slot（@ 名字不进 URL）
│   ├── default.js              ← 【必须】没拦截命中时渲染 null，
│   │                             缺了它：直接访问任何 /products 页面整页 404
│   └── (.)[id]/page.jsx        ← 拦截段：(.) = 拦截同级 /products/:id
│                                 Server Component，直接 db.findProduct 取数
├── QuickViewModal.jsx          ← 'use client'，antd Modal + router.back() 关闭
├── page.jsx                    ← 列表页（SSR 外壳，children slot）
└── [id]/page.jsx               ← 完整编辑页（children slot）
```

`(.)` 拦截同级、`( teh..)` 拦截上一级、`(...)` 拦截根。本项目列表和详情同级，用 `(.)`。

## 三、行为矩阵（全部精髓）

| 进入方式 | URL | children slot | @modal slot |
| --- | --- | --- | --- |
| 列表点商品名（router.push/Link 软导航） | /products/101 | 完整编辑页（藏在弹窗遮罩后） | **弹窗（拦截生效）** |
| 刷新 / 直输地址 / `<a>` 整页跳转 | /products/101 | **完整编辑页** | null（default.js） |

要点：
1. **拦截只对应用内导航生效**。软导航时 children 也会渲染 [id] 页（弹窗遮罩后面），关闭用 `router.back()` 一并退回列表，URL 同步还原。
2. **逃生通道：`<a>` 整页跳转永远绕过拦截**。本项目「编辑」按钮必须直达编辑页，所以用 `<a href>` 而不是 Link/router.push——这是两种导航语义的官方分界线。
3. `/products/new` 也匹配 `(.)[id]`（id='new'），拦截段对非数字 id 返回 null，children 照常渲染新建页——天然降级。

## 四、踩坑清单

1. **`@modal/default.js` 忘写 → 直接访问整页 404**。多 slot 段里任一 slot 匹配不上当前 URL 又没有 default 兜底，整页匹配失败。这是 Parallel Routes 最著名的坑。
2. **antd v6 Modal 的 DOM 变了**：v5 的 `.ant-modal-content` 已不存在，现在是 `.ant-modal-root > .ant-modal-mask + .ant-modal-wrap > .ant-modal > .ant-modal-container`。写测试/样式选择器前先 dump 真实 DOM。
3. **hydration 报错（曾误判为 antd Wave 的锅，实为权限注入时序）**：练习当天 /products 首屏控制台就报错，当时的判断是「antd v6 Button 带 icon + Wave 的 SSR/CSR 结构差，预存在问题」——**这个诊断是错的**。2026-10-24 定位到真正链条：
   - 权限位 UI（`can(PRODUCT_EDIT) && <Button>新建商品</Button>`、表格「操作」列）消费 zustand，而 store 靠 `AdminShell` 的 `useEffect` 注入 → **服务端渲染时 permissions 恒为 `[]`**，SSR HTML 里根本没有这个按钮；客户端首帧却已有 → mismatch，React 丢弃服务端 HTML 整树重渲，报错栈里显示成 `<Wave>` 包裹的 `<button>`「客户端多出来一个」，于是被误读成 antd 的锅。
   - 第二处：`CategoryEditModal` 的 `forceRender` 让 antd 在客户端首帧就渲染 Modal portal，而服务端 portal 需要 document、只能输出空 → 同类 mismatch。
   - 修法：权限改由 `(admin)/AuthProvider`（context，服务端 props 直传）提供，SSR 与首帧同源；Modal 去掉 `forceRender`，首次打开才挂载。修完 dev 全页 console 干净。
   - 教训：**报错栈指向的组件通常只是「差异被发现的位置」，不是原因**。先问「这个 DOM 为什么服务端没有」，再看组件实现。
4. 弹窗关闭必须 `router.back()`，不是 setOpen(false)——弹窗本质是「导航到了新 URL」，关窗即回退。
5. 弹窗数据在服务端拦截段里取（db.findProduct），QuickViewModal 只管呈现——保持「Server 外壳 + Client 实现」全项目统一模式。

## 五、验证（生产模式 9/9）

脚本 `D:/0328/verify-tools/verify-intercepting-routes.mjs`：
软导航出弹窗且含数据 / URL 变 /products/101 / 列表仍在 / 关闭回列表 / 编辑 `<a>` 直达完整页无弹窗 / 直开与 /products/new 均无弹窗。

## 六、什么时候该用 / 不该用

- **该用**：纯查看型详情（快看、灯箱、Feed 展开）且需要「可分享的弹窗链接」。
- **不该用**：详情页承担复杂交互（本项目编辑页就是），弹窗版要做第二套交互；或团队还没踩过 Parallel Routes 的边界坑——它是 App Router 公认最晦涩的机制，为一个快看引入要掂量。
