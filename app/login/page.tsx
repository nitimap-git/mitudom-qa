"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link' // <--- เพิ่มบรรทัดนี้ครับ

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = (e: any) => {
    e.preventDefault()

    // 🔑 ตั้งรหัสผ่านตรงนี้ครับ
    if (password === '1914moo1') { 
      sessionStorage.setItem('isLoggedIn', 'true')
      router.push('/admin') 
    } else {
      setError('รหัสผ่านไม่ถูกต้อง')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-lg shadow-md w-full max-w-sm border border-gray-200">
        <h1 className="text-xl font-bold text-center text-blue-900 mb-6">🔒 เข้าสู่ระบบผู้ดูแล</h1>
        
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">รหัสผ่าน</label>
            <input 
              type="password" 
              className="w-full p-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none text-gray-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="กรอกรหัสผ่าน..."
              autoFocus
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition font-bold"
          >
            ยืนยัน
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-blue-600">← กลับหน้าหลัก</Link>
        </div>
      </div>
    </div>
  )
}