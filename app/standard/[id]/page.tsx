"use client" // <--- สำคัญมาก: ใส่บรรทัดนี้เพื่อเปิดใช้ลูกเล่นคลิกดูรูป

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useParams } from 'next/navigation'

export default function StandardDetail() {
  const params = useParams()
  // แปลง id ให้เป็น string ให้ชัวร์ (บางทีอาจมาเป็น array)
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id

  // --- State เก็บข้อมูล ---
  const [standard, setStandard] = useState<any>(null)
  const [indicators, setIndicators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // --- State สำหรับ หุบ/กาง อัลบั้ม ---
  const [expandedAlbums, setExpandedAlbums] = useState<Record<number, boolean>>({})

  // ดึงข้อมูลเมื่อหน้าเว็บโหลด
  useEffect(() => {
    if (!id) return

    const fetchData = async () => {
      setLoading(true)
      try {
        // 1. ดึงชื่อมาตรฐาน
        const { data: std, error: stdErr } = await supabase
          .from('standards')
          .select('*')
          .eq('id', id)
          .single()
        
        if (stdErr) throw stdErr
        setStandard(std)

        // 2. ดึงตัวบ่งชี้ + กิจกรรม + เอกสาร
        const { data: inds, error: indErr } = await supabase
          .from('indicators')
          .select(`
            *,
            activities (
              *,
              documents (*)
            ),
            documents (*)
          `)
          .eq('standard_id', id)
          .order('code', { ascending: true })
        
        if (indErr) throw indErr

        // จัดเรียงข้อมูล
        const sorted = inds?.map((ind: any) => ({
            ...ind,
            activities: ind.activities?.sort((a:any, b:any) => a.id - b.id), 
            documents: ind.documents?.filter((d:any) => !d.activity_id) 
        }))
        setIndicators(sorted || [])

      } catch (err: any) {
        setErrorMsg(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id])

  // ฟังก์ชันสลับการแสดงผลอัลบั้ม
  const toggleAlbum = (docId: number) => {
    setExpandedAlbums(prev => ({ ...prev, [docId]: !prev[docId] }))
  }

  // --- ส่วนแสดงผล ---
  if (loading) return <div className="p-10 text-center text-gray-500">⏳ กำลังโหลดข้อมูล...</div>
  if (errorMsg || !standard) return (
    <div className="p-10 text-center text-red-500">
      <h2 className="text-xl font-bold">ไม่พบข้อมูล</h2>
      <p className="text-sm mt-2">{errorMsg}</p>
      <Link href="/" className="mt-4 inline-block text-blue-600 hover:underline">กลับหน้าหลัก</Link>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4 md:px-8 font-sans">
      <div className="max-w-5xl mx-auto">
        
        {/* Header */}
        <Link href="/" className="inline-block mb-6 text-blue-600 hover:underline text-sm font-medium">&larr; กลับหน้าหลัก</Link>
        
        <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200 mb-8 border-l-4 border-l-blue-600">
          <h1 className="text-2xl md:text-3xl font-bold text-blue-900 mb-2">{standard.name}</h1>
          <p className="text-gray-600">รายละเอียดตัวบ่งชี้และร่องรอยหลักฐาน</p>
        </div>

        {/* Loop Indicators */}
        <div className="space-y-8">
          {indicators.map((ind) => (
            <div key={ind.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-4 border-b border-gray-100 flex items-start gap-3">
                <span className="bg-blue-600 text-white px-3 py-1 rounded-md font-bold text-sm mt-0.5 shadow-sm min-w-fit">
                  {ind.code}
                </span>
                <h2 className="text-lg font-bold text-gray-800 leading-relaxed">{ind.name}</h2>
              </div>

              <div className="p-6">
                {/* --- ส่วนแสดงหลักฐาน/ร่องรอย --- */}
                {ind.activities && ind.activities.length > 0 ? (
                    <div className="grid gap-6">
                        {ind.activities.map((act: any) => (
                            <div key={act.id} className="bg-white p-5 rounded-lg border border-gray-200 shadow-sm hover:shadow-md transition duration-200">
                                <h3 className="text-lg font-bold text-gray-900 mb-2 border-b pb-2 flex items-center gap-2">
                                    📂 {act.title}
                                </h3>
                                {act.description && <p className="text-gray-600 text-sm mb-4 leading-relaxed">{act.description}</p>}

                                {/* รายการเอกสารในกิจกรรม */}
                                <div className="space-y-3">
                                    {act.documents?.map((doc: any) => (
                                        <div key={doc.id}>
                                            {/* กรณี Link หรือ PDF (แสดงแบบเดิม) */}
                                            {doc.doc_type !== 'album' && (
                                                <a 
                                                    href={doc.file_url} 
                                                    target="_blank"
                                                    className="flex items-center gap-3 p-3 rounded-md bg-gray-50 border border-gray-100 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition group"
                                                >
                                                    <span className="text-xl">{doc.doc_type === 'link' ? '🔗' : '📄'}</span>
                                                    <div className="flex-1 font-medium text-gray-800 group-hover:text-blue-700">{doc.title}</div>
                                                    <span className="text-gray-400 text-sm group-hover:text-blue-500">เปิด &rarr;</span>
                                                </a>
                                            )}

                                            {/* กรณี Album (แบบใหม่: คลิกเพื่อกาง) */}
                                            {doc.doc_type === 'album' && (
                                                <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                                                    <button 
                                                        onClick={() => toggleAlbum(doc.id)}
                                                        className="w-full flex justify-between items-center p-3 bg-gray-50 hover:bg-blue-50 transition"
                                                    >
                                                        <div className="flex items-center gap-2 font-medium text-gray-800">
                                                            <span>🖼️ {doc.title}</span>
                                                            <span className="text-xs text-gray-500 bg-gray-200 px-2 py-0.5 rounded-full">
                                                                {doc.gallery?.length || 0} รูป
                                                            </span>
                                                        </div>
                                                        <span className="text-xs font-bold text-blue-600 bg-white border border-blue-200 px-2 py-1 rounded">
                                                            {expandedAlbums[doc.id] ? '🔼 ซ่อนรูปภาพ' : '🔽 ดูรูปภาพ'}
                                                        </span>
                                                    </button>
                                                    
                                                    {/* ส่วนแสดงรูป (จะโผล่มาเมื่อ expandedAlbums เป็น true) */}
                                                    {expandedAlbums[doc.id] && doc.gallery && (
                                                        <div className="p-3 border-t border-gray-200 bg-white animate-fade-in">
                                                            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-2">
                                                                {doc.gallery.map((url: string, idx: number) => (
                                                                    <a key={idx} href={url} target="_blank" className="aspect-square relative block overflow-hidden rounded border hover:opacity-90">
                                                                        <img src={url} className="w-full h-full object-cover" loading="lazy" />
                                                                    </a>
                                                                ))}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                    {(!act.documents || act.documents.length === 0) && <div className="text-gray-400 text-sm italic pl-2">- กำลังดำเนินการรวบรวมเอกสาร -</div>}
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    ind.documents.length === 0 && <div className="text-center text-gray-400 py-6 italic border-2 border-dashed rounded-lg bg-gray-50">ยังไม่มีข้อมูลหลักฐาน/ร่องรอย</div>
                )}

                {/* เอกสารนอกกลุ่ม (ถ้ามี) */}
                {ind.documents && ind.documents.length > 0 && (
                    <div className="mt-8 pt-6 border-t border-gray-200">
                        <h4 className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">เอกสารประกอบอื่นๆ</h4>
                        <div className="grid md:grid-cols-2 gap-3">
                            {ind.documents.map((doc: any) => (
                                <a key={doc.id} href={doc.file_url} target="_blank" className="flex items-center gap-2 text-sm text-gray-600 bg-white border p-3 rounded hover:bg-gray-50 hover:text-blue-600 transition">
                                    <span className="text-lg">{doc.doc_type === 'link' ? '🔗' : '📄'}</span>
                                    <span className="truncate font-medium">{doc.title}</span>
                                </a>
                            ))}
                        </div>
                    </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}