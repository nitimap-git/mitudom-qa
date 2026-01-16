"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function Login() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  
  // State สำหรับสลับการมองเห็นรหัสผ่าน
  const [showPassword, setShowPassword] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    // หน่วงเวลาเล็กน้อยให้ดูเหมือนกำลังตรวจสอบ (เพื่อความเนียน)
    await new Promise(resolve => setTimeout(resolve, 500))

    // 🔐 ตรวจสอบรหัสผ่าน (Hardcoded)
    if (password === '1914moo1') {
      // รหัสถูก -> บันทึก Session และไปหน้า Admin
      sessionStorage.setItem('isLoggedIn', 'true')
      router.push('/admin')
    } else {
      // รหัสผิด -> แจ้งเตือน
      setErrorMsg('รหัสผ่านไม่ถูกต้อง')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="bg-white p-8 rounded-lg shadow-lg w-full max-w-sm border border-gray-200">
        
        <div className="text-center mb-8">
          <div className="bg-blue-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">🔐</span>
          </div>
          <h1 className="text-2xl font-bold text-blue-900">Admin Login</h1>
          <p className="text-gray-500 text-sm mt-1">กรุณากรอกรหัสผ่านเพื่อเข้าถึง</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          
          {/* Password Input Only */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">รหัสผ่าน</label>
            <div className="relative">
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition pr-10 text-center tracking-widest text-lg"
                placeholder="••••••••"
                required 
                autoFocus
              />
              
              {/* ปุ่มกดดูรหัสผ่าน */}
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                {showPassword ? (
                  // Eye Off
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                  </svg>
                ) : (
                  // Eye On
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-50 text-red-600 text-sm p-3 rounded border border-red-200 text-center animate-pulse font-semibold">
              ⚠️ {errorMsg}
            </div>
          )}

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition shadow-lg disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-[1.02]"
          >
            {loading ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <div className="mt-8 text-center border-t pt-4">
          <Link href="/" className="text-sm text-gray-400 hover:text-blue-600 transition flex items-center justify-center gap-1">
            <span>←</span> กลับหน้าหลัก
          </Link>
        </div>

      </div>
    </div>
  )
}