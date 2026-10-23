import CategoriesClient from './CategoriesClient'

/** metadata 必须从 Server Component 导出（'use client' 页面不行），故拆外壳。
 * title 是短名，根 layout 的 template 会拼成「分类管理 · 商城后台」 */
export const metadata = { title: '分类管理' }

export default function CategoriesPage() {
  return <CategoriesClient />
}
