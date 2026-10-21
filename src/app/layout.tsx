import type { Metadata } from "next";
import { ConfigProvider, App as AntdApp } from "antd";
import zhCN from "antd/locale/zh_CN";
import { AntdRegistry } from "@ant-design/nextjs-registry";
import "./globals.css";

/** 后台所有页面都依赖会话（cookies），antd 也含运行时样式，整体走动态渲染 */
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "商城后台管理系统",
  description: "Shop admin dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>
        <AntdRegistry>
          <ConfigProvider
            locale={zhCN}
            theme={{ token: { colorPrimary: "#2563eb" } }}
          >
            <AntdApp>{children}</AntdApp>
          </ConfigProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
