'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { App, Button, Checkbox, Form, Input } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useAuthStore } from '@/stores/auth'
import './login.scss'

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
    <div className="login-page">
      <div className="login-card">
        <div className="login-panel">
         

          <Form form={form} initialValues={initialValues} onFinish={onFinish} size="large" className="login-form">
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

            <div className="login-row">
              <Form.Item name="remember" valuePropName="checked" noStyle>
                <Checkbox>记住我</Checkbox>
              </Form.Item>
              <span className="login-hint">忘记密码请联系管理员</span>
            </div>

            <Button type="primary" htmlType="submit" block loading={loading} className="login-submit">
              登 录
            </Button>
          </Form>

          <div className="login-demo">
            <span className="login-demo-label">一键填入演示账号</span>
            <div className="login-demo-list">
              {demoAccounts.map(account => (
                <button
                  key={account.username}
                  type="button"
                  onClick={() => fill(account.username)}
                  className="login-demo-item"
                >
                  <b>{account.role}</b>
                  <span>{account.username}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
