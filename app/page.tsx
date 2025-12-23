import { supabase } from '@/lib/supabase'
import Link from 'next/link'

export default async function Home() {
  // 1. สั่งให้ไปดึงข้อมูลจากตาราง standards (มาตรฐาน)
  const { data: standards, error } = await supabase
    .from('standards')
    .select('*')
    .order('id', { ascending: true })

  // 2. ถ้ามี error ให้บอกเราหน่อย
  if (error) {
    return <div className="p-10 text-red-500">เกิดข้อผิดพลาด: {error.message}</div>
  }

  // 3. ส่วนแสดงผลหน้าจอ (HTML)
  return (
    <div className="min-h-screen bg-gray-50 p-10">
      <div className="max-w-4xl mx-auto">
        
        {/* --- เพิ่มส่วนนี้: ปุ่ม Login Admin มุมขวาบน --- */}
        <div className="flex justify-end mb-4">
          <Link 
            href="/login" 
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 hover:text-blue-600 transition-colors shadow-sm"
          >
            🔒 เข้าสู่ระบบ Admin
          </Link>
        </div>
        {/* ------------------------------------------- */}

        <h1 className="text-3xl font-bold text-blue-800 mb-2">
          ระบบสารสนเทศเพื่อการประกันคุณภาพ
        </h1>
        <p className="text-gray-600 mb-8">โรงเรียนอนุบาลมิตรอุดม (การประเมินรูปแบบ Virtual Visit)</p>

        <div className="grid gap-4">
          {/* วนลูปเอาข้อมูลมาตรฐานมาสร้างเป็นกล่องๆ */}
          {standards?.map((std) => (
            <div key={std.id} className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">
                {std.name}
              </h2>
              <Link href={`/standard/${std.id}`} className="text-blue-600 hover:underline text-sm font-medium">
                ดูตัวบ่งชี้และเอกสาร &rarr;
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}