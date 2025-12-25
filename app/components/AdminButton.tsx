"use client" // <--- บรรทัดนี้สำคัญมาก บอกให้รู้ว่าเป็นส่วนที่เช็ค URL ได้

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AdminButton() {
  const pathname = usePathname()

  // เช็คว่า: ถ้า URL ปัจจุบันคือหน้า Login หรือ ขึ้นต้นด้วย /admin
  // ให้ return null (คือไม่ต้องแสดงผลอะไรเลย)
  if (pathname === '/login' || pathname?.startsWith('/admin')) {
    return null
  }

  // ถ้าเป็นหน้าอื่นๆ ให้แสดงปุ่มตามปกติ
  return (
    <div className="absolute top-4 right-4 z-50">
      <Link 
        href="/login" 
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white/80 backdrop-blur-md border border-gray-200 rounded-full hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all shadow-sm"
      >
        🔒 Admin
      </Link>
    </div>
  )
}