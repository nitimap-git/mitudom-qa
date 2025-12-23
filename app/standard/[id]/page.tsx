"use client"

import { createClient } from '@supabase/supabase-js'
import Link from 'next/link'
import { useEffect, useState, Fragment } from 'react'
import { useParams } from 'next/navigation'

// สร้าง Client สำหรับเชื่อมต่อ Supabase
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function StandardDetail() {
  const params = useParams()
  const id = params?.id as string

  const [standard, setStandard] = useState<any>(null)
  const [indicators, setIndicators] = useState<any[]>([])
  const [expandedAlbums, setExpandedAlbums] = useState<Record<string, boolean>>({})

  // 1. ดึงข้อมูลมาตรฐานและตัวบ่งชี้
  useEffect(() => {
    async function fetchData() {
      const { data: std } = await supabase.from('standards').select('*').eq('id', id).single()
      setStandard(std)

      const { data: inds } = await supabase.from('indicators')
        .select(`*, documents (*)`)
        .eq('standard_id', id)
        .order('code', { ascending: true })
      setIndicators(inds || [])
    }
    if (id) fetchData()
  }, [id])

  // ฟังก์ชันสลับการกาง/หุบอัลบั้ม
  const toggleAlbum = (docId: string) => {
    setExpandedAlbums(prev => ({ ...prev, [docId]: !prev[docId] }))
  }

  // ฟังก์ชันเลือกปุ่มแสดงผล (PDF / รูป / ลิงก์)
  const renderActionButton = (doc: any) => {
    if (doc.doc_type === 'link') {
      return <a href={doc.file_url} target="_blank" className="bg-purple-100 text-purple-700 px-3 py-1 rounded hover:bg-purple-200 text-xs font-bold transition flex items-center gap-1 w-fit">🔗 เปิดลิงก์</a>
    } else if (doc.doc_type === 'album') {
      const isExpanded = expandedAlbums[doc.id]
      return (
        <button onClick={() => toggleAlbum(doc.id)} className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 w-fit ${isExpanded ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
          {isExpanded ? '🔼 ซ่อนรูป' : '🖼️ ดูรูปภาพ'}
        </button>
      )
    } else {
      return <a href={doc.file_url} target="_blank" className="bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 text-xs font-bold transition flex items-center gap-1 w-fit">📄 เปิด PDF</a>
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto">
        {/* ปุ่มย้อนกลับ */}
        <Link href="/" className="text-gray-500 hover:text-blue-600 mb-4 inline-block">&larr; กลับหน้าหลัก</Link>
        
        {/* ชื่อมาตรฐาน */}
        <h1 className="text-2xl font-bold text-blue-900 mb-6 border-b pb-4">{standard?.name}</h1>

        <div className="space-y-8">
          {indicators.map((indicator) => (
            <div key={indicator.id} className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-start gap-2">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm whitespace-nowrap">ตัวบ่งชี้ {indicator.code}</span>
                {indicator.name}
              </h3>

              {indicator.documents && indicator.documents.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm text-left">
                    <thead className="text-gray-500 bg-gray-50 border-b">
                      <tr>
                        <th className="px-4 py-2 w-10"></th>
                        <th className="px-4 py-2">รายการหลักฐาน</th>
                        <th className="px-4 py-2 w-32">วันที่</th>
                        <th className="px-4 py-2 w-32">เปิดดู</th>
                      </tr>
                    </thead>
                    <tbody>
                      {indicator.documents.map((doc: any) => (
                        <Fragment key={doc.id}>
                          <tr className="border-b last:border-0 hover:bg-blue-50">
                            <td className="px-4 py-3 text-center text-lg">{doc.doc_type === 'link' ? '🔗' : doc.doc_type === 'album' ? '🖼️' : '📄'}</td>
                            <td className="px-4 py-3 font-medium text-gray-700">
                              {doc.title}
                              {doc.doc_type === 'album' && doc.gallery && <span className="ml-2 text-xs text-gray-400">({doc.gallery.length} รูป)</span>}
                            </td>
                            <td className="px-4 py-3 text-gray-500">{new Date(doc.uploaded_at).toLocaleDateString('th-TH')}</td>
                            <td className="px-4 py-3">{renderActionButton(doc)}</td>
                          </tr>
                          
                          {/* ส่วนแสดงรูปภาพ (Gallery Grid) */}
                          {doc.doc_type === 'album' && expandedAlbums[doc.id] && doc.gallery && (
                            <tr className="bg-gray-50">
                              <td colSpan={4} className="p-4">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                  {doc.gallery.map((imgUrl: string, idx: number) => (
                                    <a 
                                      key={idx} 
                                      href={imgUrl} 
                                      target="_blank" 
                                      className="block group relative aspect-video bg-gray-200 rounded overflow-hidden border border-gray-300 shadow-sm hover:shadow-md transition"
                                    >
                                      <img src={imgUrl} alt={`รูปที่ ${idx+1}`} className="w-full h-full object-cover" />
                                      {/* แก้ไข Overlay ให้ใสและแสดงปุ่มขยายเมื่อเอาเมาส์ชี้ */}
                                      <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition duration-300 flex items-center justify-center">
                                        <span className="text-white font-bold border border-white px-3 py-1 rounded-full text-sm hover:bg-white hover:text-black transition">
                                          🔍 ขยายดูภาพ
                                        </span>
                                      </div>
                                    </a>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : <div className="text-gray-400 text-sm italic bg-gray-50 p-3 rounded border border-dashed text-center">ยังไม่มีเอกสาร</div>}
            </div>
          ))}
        </div>

        {/* 👇👇👇 เพิ่มปุ่มทางเข้า Admin ตรงนี้ครับ 👇👇👇 */}
        <div className="mt-12 pt-6 border-t text-center">
          <Link href="/login" className="text-gray-400 text-sm hover:text-blue-600 transition flex items-center justify-center gap-1 font-medium">
            🔒 สำหรับผู้ดูแลระบบ
          </Link>
        </div>

      </div>
    </div>
  )
}