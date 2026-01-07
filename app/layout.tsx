import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
// import AdminButton from "./components/AdminButton"; <--- ลบบรรทัดนี้ทิ้ง หรือ Comment ไว้
import Header from "./components/Header"; // <--- 1. Import Header มาแทน

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
    <html lang="th"> {/* เปลี่ยนเป็น th ก็ดีนะคะ ถ้าเว็บเป็นภาษาไทย */}
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gray-50`}
      >
        {/* 2. ใส่ Header ไว้บนสุด (มันจะมีปุ่ม Admin อยู่ข้างในแล้ว) */}
        <Header />
        
        {/* เนื้อหาเว็บ */}
        {children}
      </body>
    </html>
  );
}