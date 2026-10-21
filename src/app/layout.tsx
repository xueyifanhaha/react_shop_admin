import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "商城后台管理系统",
  description: "Shop admin dashboard",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
