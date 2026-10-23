# metadata API / generateMetadata（练习清单收尾项笔记）

> 2026-10-23 完成。对标 Nuxt 的 `useHead()`：把 `<title>` / `<meta>` 从「手动操作 DOM」变成「渲染函数的返回值」。

## 一、解决什么问题

SPA 时代标题靠 `document.title = ...` 手动设，散落在各组件里，且 CSR 的 `<head>` 对爬虫不可见。App Router 把 head 纳入服务端渲染：页面/布局**导出 metadata**，Next 自动生成标签——标题和页面数据同一套来源、同一时机渲染。

## 二、三条路径与选择规则

| 路径 | 适用 | 本项目落点 |
| --- | --- | --- |
| `export const metadata`（静态） | 标题渲染前已知 | logs/roles/categories/products 外壳页 |
| `generateMetadata({ params })`（动态） | 标题依赖路由数据 | `products/[id]`——直接用商品名做标题 |
| React 19 `<title>` hoisting | client 组件内渲染 | 未采用（保持全项目一种模式） |

**硬规则：`'use client'` 组件不能导出 metadata**（编译报错）。所以 client 页面只有两条路：拆 Server 外壳（本项目选择，复用练习③模式）或组件内渲染 React 19 `<title>`（能跑，但与 metadata 体系的 template/default 不互通，混用会出两个 `<title>`）。

## 三、template 拼接（本次的关键设计）

根 layout 只写一次：

```ts
title: {
  default: '商城后台管理系统',     // 子段没给 title 时的兜底（登录页/403）
  template: '%s · 商城后台',       // 子段给的短名自动拼成「xxx · 商城后台」
}
```

子段只写短名：`export const metadata = { title: '操作日志' }` → 浏览器标签显示「操作日志 · 商城后台」。**子段不要再手写全名**，否则 template 再拼一次出现「… · 商城后台 · 商城后台」。

## 四、generateMetadata 动态标题（products/[id]）

```jsx
export async function generateMetadata({ params }) {
  const { id } = await params                     // Next 15+ params 是 Promise
  if (id === 'new') return { title: '新建商品' }
  const product = db.findProduct(Number(id))      // 服务端直查 db
  return product ? { title: product.name } : {}   // 查不到退回 default
}
```

- 标题跟数据走：「iPhone 15 Pro 256G · 商城后台」——收藏夹/多标签页一眼可辨
- 返回 `{}` 时优雅退回根 layout default
- params 必须 await（Next 15+ 起为 Promise，与页面组件同一约定）

## 五、踩坑

1. **client 页面忘了拆外壳**：`'use client'` 文件里 export metadata 直接构建失败。
2. **template 重复拼接**：子段写全名 + 根 layout 有 template = 双后缀。
3. **`/products/1` 标题是 default 不是 bug**：种子商品 id 从 101 起，不存在的 id 走 `{}` 兜底——这正是设计行为（验证脚本里有专门用例）。
4. title 变化对浏览器是即时的（客户端导航时 Next 只更新 head），不用刷新。

## 六、验证

`D:/0328/verify-tools/verify-metadata.mjs`（8/8）：7 个页面的 SSR `<title>` 逐页断言，含动态（商品名）、新建、非法 id 兜底、default 兜底四类路径。
