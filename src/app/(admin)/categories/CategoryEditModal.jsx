'use client'

import { useEffect } from 'react'
import { useMutation } from '@tanstack/react-query'
import { App, Form, Input, Modal } from 'antd'
import { api } from '@/lib/api'

/**
 * 分类新建/编辑弹窗（对标旧版 CategoryEditDialog.vue，从 page.jsx 拆出的子组件）。
 *
 * 父子分工（Vue → React 对照）：
 * - v-model="visible"      → open（父传入）+ onClose（子回调）两个 props
 * - :editing="editing"     → editing prop，null 表示新建
 * - emit('saved')          → onSaved 回调，保存成功后父组件去失效列表缓存
 *
 * 子组件只负责：预填、校验、调保存接口、toast；
 * 列表数据的失效归父组件管（query 在谁手里，失效就在谁手里）。
 */
export default function CategoryEditModal({ open, editing, onClose, onSaved }) {
  const { message } = App.useApp()
  const [form] = Form.useForm()

  // 弹窗每次打开时按「新建/编辑」预填（对标旧版 watch(visible, ..., immediate)）
  useEffect(() => {
    if (!open) return
    if (editing) form.setFieldsValue({ name: editing.name, description: editing.description ?? '' })
    else form.resetFields()
  }, [open, editing, form])

  /* ---------- 保存：editing 在则 PUT，否则 POST ---------- */
  const saveMutation = useMutation({
    mutationFn: values => (editing ? api.categories.update(editing.id, values) : api.categories.create(values)),
    onSuccess: (_data, values) => {
      message.success(`已${editing ? '保存' : '创建'}分类「${values.name}」`)
      onSaved()
    },
    // 重名 409、长度 400 等服务端文案直接透出，弹窗保持打开让用户改
    onError: err => message.error(err.bizMessage),
  })

  function submit() {
    // validateFields 校验失败会 reject，antd 自动标红错误项，这里只需吞掉
    form.validateFields()
      .then(values => saveMutation.mutate({
        name: values.name.trim(),
        description: (values.description ?? '').trim(),
      }))
      .catch(() => {})
  }

  return (
    <Modal
      title={editing ? `编辑分类 · ${editing.name}` : '新建分类'}
      width={440}
      open={open}
      onCancel={onClose}
      onOk={submit}
      okText="保存"
      cancelText="取消"
      confirmLoading={saveMutation.isPending}
      forceRender
    >
      <Form form={form} layout="vertical" initialValues={{ name: '', description: '' }}>
        <Form.Item
          label="分类名称"
          name="name"
          rules={[
            { required: true, message: '请输入分类名称' },
            { min: 2, max: 20, message: '长度 2 - 20 个字符' },
          ]}
        >
          <Input placeholder="如：手机数码" maxLength={20} showCount />
        </Form.Item>
        <Form.Item
          label="描述"
          name="description"
          rules={[{ max: 100, message: '不超过 100 个字符' }]}
        >
          <Input.TextArea rows={3} placeholder="选填，简单说明这个分类放什么" maxLength={100} showCount />
        </Form.Item>
      </Form>
    </Modal>
  )
}
