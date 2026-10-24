'use client'

import { useRouter } from 'next/navigation'
import { Button, Descriptions, Modal, Tag } from 'antd'

/**
 * 商品快看弹窗（Intercepting Routes 的弹窗化身）。
 *
 * 由服务端拦截段 @modal/(.)[id]/page.jsx 渲染并传入数据——本组件只管呈现。
 * 两个关键交互：
 * - 关闭 = router.back()：弹窗本质是「导航到了新 URL」，退回去 URL 与列表状态同步还原
 * - 「打开完整编辑页」用 <a> 而不是 Link/router.push：整页加载会绕过拦截，
 *   这是拦截路由的官方逃生通道——应用内导航永远被拦，<a> 硬导航永远直达
 */
export default function QuickViewModal({ product }) {
  const router = useRouter()
  const close = () => router.back()

  return (
    <Modal
      open
      title={<span>快看 · {product.name}</span>}
      onCancel={close}
      width={480}
      footer={[
        <a key="edit" href={`/products/${product.id}`}>打开完整编辑页</a>,
        <Button key="close" type="primary" onClick={close}>关闭</Button>,
      ]}
    >
      <Descriptions column={1} size="small" className="!mt-4">
        <Descriptions.Item label="SKU">{product.sku}</Descriptions.Item>
        <Descriptions.Item label="分类">{product.categoryName}</Descriptions.Item>
        <Descriptions.Item label="单价">
          ¥{product.price.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </Descriptions.Item>
        <Descriptions.Item label="库存">
          {product.stock}
          {product.stock < 20 && <Tag color="warning" className="ml-2">库存偏低</Tag>}
        </Descriptions.Item>
        <Descriptions.Item label="状态">
          <Tag color={product.status === 'on' ? 'success' : 'default'}>
            {product.status === 'on' ? '已上架' : '已下架'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="更新时间">{product.updatedAt}</Descriptions.Item>
      </Descriptions>
    </Modal>
  )
}
