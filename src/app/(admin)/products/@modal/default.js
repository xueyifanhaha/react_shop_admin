/**
 * @modal slot 的兜底：没有拦截命中时渲染 null（无弹窗）。
 *
 * 这个文件是 Parallel Routes 的硬性要求：多 slot 段里任一 slot
 * 对当前 URL 匹配不上又没有 default 兜底，整个页面直接 404。
 * 直接访问 /products 或 /products/101（硬导航）时，@modal 靠它渲染空。
 */
export default function Default() {
  return null
}
