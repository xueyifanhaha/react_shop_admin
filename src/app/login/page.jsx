'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { App, Button, Checkbox, Form, Input } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/auth'

const demoAccounts = [
  { username: 'admin', role: '1 级 · 管理员' },
  { username: 'editor', role: '2 级 · 运营' },
  { username: 'viewer', role: '3 级 · 只读' },
]

export default function LoginPage() {
  const router = useRouter()
  const { message } = App.useApp()
  const login = useAuthStore(s => s.login)
  const [loading, setLoading] = useState(false)
  const [form] = Form.useForm()

  // 静态阶段先预填一个账号，方便直接看到校验效果
  const initialValues = { username: 'admin', password: 'demo-123456', remember: true }

  async function onFinish(values) {
    setLoading(true)
    try {
      const user = await login(values.username, values.password)
      message.success(`欢迎回来，${user.name}`)
      router.push('/products')
    }
    catch (error) {
      message.error(error?.bizMessage ?? '登录失败，请稍后重试')
    }
    finally {
      setLoading(false)
    }
  }

  function fill(username) {
    form.setFieldsValue({ username, password: 'demo-123456' })
    form.clearValidation?.()
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-[440px] bg-white rounded-[20px] border border-gray-200 shadow-[0_24px_60px_-32px_rgba(15,23,42,0.4)] overflow-hidden">
        <div className="flex flex-col px-10 pt-11 pb-9">
          <div className="text-center">
            <div className="grid place-items-center w-10 h-10 mx-auto rounded-xl bg-[#2563eb] text-white font-bold shadow-[0_6px_16px_-6px_rgba(37,99,235,0.9)]">商</div>
            <h2 className="mt-4 text-[22px] font-medium tracking-tight">商品运营后台</h2>
            <p className="mt-1.5 text-[13.5px] text-gray-400">登录后按角色展示可用的功能与按钮</p>
          </div>

          <Form
            form={form}
            initialValues={initialValues}
            onFinish={onFinish}
            size="large"
            className="mt-6 [&_.ant-form-item]:mb-4"
          >
            <Form.Item
              name="username"
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 3, message: '用户名至少 3 个字符' },
              ]}
            >
              <Input prefix={<UserOutlined />} placeholder="用户名" autoComplete="username" />
            </Form.Item>

            <Form.Item
              name="password"
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少 6 位' },
              ]}
            >
              <Input.Password prefix={<LockOutlined />} placeholder="密码" autoComplete="current-password" />
            </Form.Item>

            <div className="flex items-center justify-between -mt-1 mb-5">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
              <span className="text-[12.5px] text-gray-400">忘记密码请联系管理员</span>
            </div>

            <Button type="primary" htmlType="submit" block loading={loading} className="!h-11 !text-[15px] tracking-[0.1em]">
              登 录
            </Button>
          </Form>

          <div className="mt-7 pt-5 border-t border-dashed border-gray-200">
            <span className="text-xs text-gray-400">一键填入演示账号</span>
            <div className="mt-2.5 grid grid-cols-3 gap-2">
              {demoAccounts.map(account => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => fill(account.username)}
                  className="flex flex-col gap-0.5 px-2.5 py-2 text-left rounded-[10px] border border-gray-200 bg-[#fbfcfe] cursor-pointer transition-colors hover:border-[#2563eb] hover:bg-[#f5f8ff]"
                >
                  <b className="text-[12.5px] font-medium text-gray-700">{account.role}</b>
                  <span className="text-[11.5px] text-gray-400 font-mono">{account.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
