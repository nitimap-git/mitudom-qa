"use client"

import Image from 'next/image'
import Link from 'next/link'
import AdminButton from './AdminButton'
import { usePathname } from 'next/navigation'

export default function Header() {
  const pathname = usePathname()

  // ถ้าอยู่ในหน้า Login ไม่ต้องโชว์ Header เลย (หน้าจะได้สะอาดๆ)
  if (pathname === '/login') return null

  return (
    <header className="bg-white shadow-sm border-b-4 border-blue-600 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          
          {/* ส่วนที่ 1: โลโก้และชื่อโรงเรียน (ด้านซ้าย) */}
          <Link href="/" className="flex items-center gap-3 group">
            {/* ใส่รูปโลโก้ (ถ้ายังไม่มีรูป มันจะแสดงกรอบเปล่าๆ ไว้ให้ก่อน) */}
            <div className="relative w-12 h-12 flex-shrink-0">
               {/* ⚠️ ถ้าชื่อไฟล์รูปของคุณไม่ใช่ logo.png ให้แก้ตรง src นี้นะคะ */}
               <Image 
                 src="/logo.png" 
                 alt="School Logo" 
                 width={50} 
                 height={50} 
                 className="object-contain w-full h-full group-hover:scale-105 transition-transform"
                 // ถ้ายังไม่มีรูปจริง ให้ใส่บรรทัดนี้เพื่อกัน Error
                 onError={(e) => { e.currentTarget.style.display = 'none' }}
               /> 
               {/* fallback ถ้าไม่มีรูป ให้แสดงเป็นวงกลมสีแทน */}
               <div className="absolute inset-0 bg-blue-100 rounded-full -z-10 flex items-center justify-center text-xs text-blue-300">Logo</div>
            </div>

            <div className="flex flex-col">
              <h1 className="text-lg md:text-xl font-bold text-blue-900 leading-tight group-hover:text-blue-700 transition">
                โรงเรียนอนุบาลมิตรอุดม
              </h1>
              <p className="text-xs md:text-sm text-gray-500">
                ระบบสารสนเทศเพื่อการประกันคุณภาพภายนอก
              </p>
            </div>
          </Link>

          {/* ส่วนที่ 2: ปุ่ม Admin (ด้านขวา) */}
          <AdminButton />
          
        </div>
      </div>
    </header>
  )
}