/** params 为 Promise，商品 id 从中解出；页面内容在阶段 4 迁移 */
export default async function ProductDetailPage({ params }) {
  const { id } = await params
  return <h1>商品详情 / 编辑（id: {id}）</h1>
}
