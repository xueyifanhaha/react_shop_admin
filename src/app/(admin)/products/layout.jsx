/**
 * 练习：Parallel Routes + Intercepting Routes。
 *
 * products/ 段现在有两个并行 slot：
 * - children：主内容区（列表页 page.jsx / 完整编辑页 [id]/page.jsx）
 * - modal：@modal/ slot（快看弹窗），软导航到 /products/:id 时由
 *   拦截段 @modal/(.)[id]/page.jsx 填充；直接访问/刷新时走 default.js（null）
 *
 * 两个 slot 必须都渲染，漏掉任何一个该 slot 的内容就永远不显示。
 */
export default function ProductsLayout({ children, modal }) {
  return (
    <>
      {children}
      {modal}
    </>
  )
}
