import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import Link ไม่ต้องใช้หน้านี้แล้ว เพราะย้ายไปอยู่ใน AdminButton แล้ว
import AdminButton from "./components/AdminButton"; // <--- 1. นำเข้าปุ่มที่เราเพิ่งสร้าง

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ระบบประกันคุณภาพ - อนุบาลมิตรอุดม",
  description: "ระบบสารสนเทศเพื่อการประกันคุณภาพภายใน",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* --- 2. เรียกใช้ปุ่มแบบฉลาด (มันจะซ่อนตัวเองถ้าเป็นหน้า Admin) --- */}
        <AdminButton />
        
        {children}
      </body>
    </html>
  );
}