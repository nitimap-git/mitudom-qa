"use client"

import { usePathname } from 'next/navigation'
import Link from 'next/link'

export default function AdminButton() {
  const pathname = usePathname()

  // ซ่อนปุ่มถ้าเป็นหน้า Login หรือหน้า Admin
  if (pathname === '/login' || pathname?.startsWith('/admin')) {
    return null
  }

  return (
    // ลบ absolute ออก เหลือแค่ div ธรรมดา
    <div>
      <Link 
        href="/login" 
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-full hover:bg-blue-600 hover:text-white transition-all shadow-sm"
      >
        🔒 Admin
      </Link>
    </div>
  )
}