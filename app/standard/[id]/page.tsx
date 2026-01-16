"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useParams } from 'next/navigation'
import Link from 'next/link'

export default function StandardPage() {
  const params = useParams()
  const currentId = Number(params.id)

  const [standardsList, setStandardsList] = useState<any[]>([])
  const [currentStandard, setCurrentStandard] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  // --- ข้อมูลเปรียบเทียบ 3 ปี (ลอกมาจากตารางในรูปภาพ) ---
  const comparisonData = [
    {
      id: 1,
      name: "ด้านร่างกาย",
      y2565: { target: 82, result: 83.74 },
      y2566: { target: 82, result: 92.42 },
      y2567: { target: 89, result: 98.25 },
    },
    {
      id: 2,
      name: "ด้านสติปัญญา",
      y2565: { target: 78, result: 76.42 },
      y2566: { target: 80, result: 91.67 },
      y2567: { target: 98, result: 97.37 },
    },
    {
      id: 3,
      name: "ด้านภาษาและการสื่อสาร",
      y2565: { target: 80, result: 82.93 },
      y2566: { target: 89, result: 89.39 },
      y2567: { target: 95, result: 90.35 },
    },
    {
      id: 4,
      name: "ด้านอารมณ์ จิตใจ",
      y2565: { target: 85, result: 86.99 },
      y2566: { target: 85, result: 93.94 },
      y2567: { target: 98, result: 97.39 },
    },
    {
      id: 5,
      name: "ด้านสังคมและคุณธรรม",
      y2565: { target: 90, result: 84.55 },
      y2566: { target: 87, result: 93.94 },
      y2567: { target: 95, result: 97.37 },
    },
  ]

  // --- Fetch Data ---
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: listData } = await supabase.from('standards').select('id, name, code').order('id')
        setStandardsList(listData || [])

        if (currentId) {
            const { data: stdData, error: stdError } = await supabase
              .from('standards')
              .select(`*, indicators (*, topics (*, activities (*, documents (*))))`)
              .eq('id', currentId)
              .single()

            if (stdError) throw stdError

            if (stdData) {
              stdData.indicators.sort((a: any, b: any) => a.code.localeCompare(b.code, undefined, { numeric: true }))
              stdData.indicators.forEach((ind: any) => {
                ind.topics?.sort((a: any, b: any) => (a.order_index || 0) - (b.order_index || 0))
                ind.topics?.forEach((topic: any) => {
                  topic.activities?.sort((a: any, b: any) => {
                    const orderDiff = (a.order_index || 0) - (b.order_index || 0)
                    if (orderDiff !== 0) return orderDiff
                    return a.id - b.id
                  })
                })
              })
            }
            setCurrentStandard(stdData)
        }
      } catch (err) { console.error(err) } 
      finally { setLoading(false) }
    }
    fetchData()
  }, [currentId])

  // --- Render ---
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* SIDEBAR */}
      <aside className="w-full md:w-72 bg-white border-r border-gray-200 flex-shrink-0 md:min-h-screen">
        <div className="p-6 border-b border-gray-100">
          <h2 className="font-bold text-gray-800 text-lg">📁 รายการมาตรฐาน</h2>
        </div>
        <nav className="p-4 space-y-2">
          {standardsList.map((std) => (
            <Link 
              key={std.id} 
              href={`/standard/${std.id}`}
              className={`block px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                std.id === currentId 
                  ? 'bg-blue-50 text-blue-700 border border-blue-200 shadow-sm' 
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              {std.name}
            </Link>
          ))}
          <Link href="/" className="block mt-6 px-4 py-2 text-center text-sm text-gray-500 hover:text-blue-600 border border-dashed border-gray-300 rounded-lg hover:border-blue-300">
            ← กลับหน้าแรก
          </Link>
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-8 lg:p-10 w-full max-w-7xl">
        {loading ? (
          <div className="py-20 pl-10"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div><p className="text-gray-500 text-sm">กำลังโหลดข้อมูล...</p></div>
        ) : !currentStandard ? (
          <div className="py-20 pl-10 bg-white rounded-xl shadow-sm border border-gray-200"><p className="text-lg text-gray-400">เลือกมาตรฐานจากเมนูด้านซ้าย</p></div>
        ) : (
          <div className="animate-fade-in">
            {/* Header มาตรฐาน */}
            <div className="mb-8 border-b-4 border-blue-600 pb-4">
              <span className="text-blue-600 font-bold uppercase tracking-wider text-xs">Standard {currentStandard.id}</span>
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mt-1">{currentStandard.name}</h1>
            </div>

            {/* --- ✨ ตารางเปรียบเทียบ (แสดงเฉพาะมาตรฐานที่ 1) ✨ --- */}
            {currentStandard.id === 1 && (
              <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-6 mb-10">
                
                <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                  📊 ผลลัพธ์คุณภาพของเด็กปฐมวัย <span className="text-sm font-normal text-gray-500">(เปรียบเทียบเป้าหมาย vs ผลการประเมิน)</span>
                </h2>

                <div className="overflow-x-auto rounded-lg border border-gray-200">
                  <table className="w-full text-sm text-left">
                    <thead>
                      {/* แถวปี พ.ศ. */}
                      <tr className="bg-blue-600 text-white">
                        <th className="px-4 py-3 border-r border-blue-500 text-left font-bold min-w-[200px]">พัฒนาการเด็ก</th>
                        <th colSpan={2} className="px-4 py-2 border-r border-blue-500 text-center font-bold">ปี 2565</th>
                        <th colSpan={2} className="px-4 py-2 border-r border-blue-500 text-center font-bold">ปี 2566</th>
                        <th colSpan={2} className="px-4 py-2 text-center font-bold">ปี 2567</th>
                      </tr>
                      {/* แถวหัวข้อย่อย */}
                      <tr className="bg-blue-50 text-blue-900 border-b border-gray-200">
                        <th className="px-4 py-2 border-r border-gray-200"></th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 bg-gray-50">เป้าหมาย</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-blue-700 border-r border-gray-200 bg-blue-100">ผลประเมิน</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 bg-gray-50">เป้าหมาย</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-blue-700 border-r border-gray-200 bg-blue-100">ผลประเมิน</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-500 border-r border-gray-200 bg-gray-50">เป้าหมาย</th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-blue-700 bg-blue-100">ผลประเมิน</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {comparisonData.map((row, index) => (
                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 font-semibold text-gray-800 border-r border-gray-100">
                            {index + 1}. {row.name}
                          </td>
                          
                          {/* ปี 2565 */}
                          <td className="px-2 py-3 text-center border-r border-gray-100 text-gray-500">{row.y2565.target}</td>
                          <td className={`px-2 py-3 text-center border-r border-gray-100 font-bold ${row.y2565.result >= row.y2565.target ? 'text-green-600' : 'text-red-500'}`}>
                            {row.y2565.result}
                          </td>

                          {/* ปี 2566 */}
                          <td className="px-2 py-3 text-center border-r border-gray-100 text-gray-500">{row.y2566.target}</td>
                          <td className={`px-2 py-3 text-center border-r border-gray-100 font-bold ${row.y2566.result >= row.y2566.target ? 'text-green-600' : 'text-red-500'}`}>
                            {row.y2566.result}
                          </td>

                          {/* ปี 2567 */}
                          <td className="px-2 py-3 text-center border-r border-gray-100 text-gray-500">{row.y2567.target}</td>
                          <td className={`px-2 py-3 text-center font-bold ${row.y2567.result >= row.y2567.target ? 'text-green-600' : 'text-red-500'}`}>
                            {row.y2567.result}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex gap-4 text-xs text-gray-500 justify-end">
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-gray-500 rounded-full"></div> ค่าเป้าหมาย</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-600 rounded-full"></div> ผ่านเกณฑ์</div>
                    <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500 rounded-full"></div> ต่ำกว่าเกณฑ์</div>
                </div>
              </div>
            )}
            {/* --- END TABLE --- */}

            <div className="space-y-10">
              {currentStandard.indicators.map((ind: any) => (
                <section key={ind.id} className="scroll-mt-20">
                  <div className="flex items-start gap-3 mb-5">
                    <div className="bg-blue-600 text-white font-bold text-sm px-2.5 py-1 rounded shadow-sm shrink-0 mt-1">{ind.code}</div>
                    <h2 className="text-lg md:text-xl font-bold text-gray-800 leading-tight py-0.5">{ind.name}</h2>
                  </div>
                  <div className="space-y-6 ml-0 md:ml-12">
                    {ind.topics && ind.topics.length > 0 ? (
                      ind.topics.map((topic: any) => (
                        <div key={topic.id} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                          <div className="bg-gray-50 px-5 py-3 border-b border-gray-100">
                            <h3 className="text-base font-bold text-gray-800 flex items-center gap-2">📌 {topic.title}</h3>
                            {topic.description && <p className="text-gray-500 text-xs mt-1 ml-6">{topic.description}</p>}
                          </div>
                          <div className="divide-y divide-gray-100">
                            {topic.activities && topic.activities.length > 0 ? (
                              topic.activities.map((act: any) => (
                                <div key={act.id} className="p-5 hover:bg-blue-50/30 transition-colors">
                                  <div className="mb-3">
                                    <h4 className="text-sm font-bold text-blue-900 mb-1 flex items-start gap-2"><span className="text-blue-400">🔹</span>{act.title}</h4>
                                    {act.description && <p className="text-gray-600 text-xs ml-6">{act.description}</p>}
                                  </div>
                                  <div className="ml-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                                    {act.documents?.map((doc: any) => (
                                      <div key={doc.id} className="col-span-1">
                                        {doc.doc_type !== 'album' ? (
                                          <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="group flex items-center gap-3 p-2.5 rounded-lg border border-gray-200 bg-white hover:border-blue-400 hover:shadow-md transition-all h-full">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${doc.doc_type === 'pdf' ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-blue-500'}`}>
                                              {doc.doc_type === 'pdf' ? <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 2H7a2 2 0 00-2 2v15a2 2 0 002 2z" /></svg> : <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>}
                                            </div>
                                            <div className="min-w-0"><p className="text-sm font-medium text-gray-700 group-hover:text-blue-700 truncate">{doc.title}</p></div>
                                          </a>
                                        ) : (
                                          <div className="bg-white rounded-lg border border-gray-200 p-2.5 h-full">
                                            <div className="flex items-center gap-2 mb-2"><span className="text-base">📸</span><span className="text-xs font-bold text-gray-800 truncate">{doc.title}</span></div>
                                            {doc.gallery && doc.gallery.length > 0 && (
                                              <div className="grid grid-cols-4 gap-1 mb-2">
                                                {doc.gallery.slice(0, 4).map((img: string, i: number) => (
                                                  <div key={i} className="aspect-square rounded overflow-hidden bg-gray-100 relative"><img src={img} className="w-full h-full object-cover" />{i === 3 && doc.gallery.length > 4 && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-white text-[10px] font-bold">+{doc.gallery.length - 4}</div>}</div>
                                                ))}
                                              </div>
                                            )}
                                            <a href={doc.gallery?.[0] || '#'} target="_blank" rel="noopener noreferrer" className="block w-full text-center py-1 text-[10px] font-bold text-purple-600 bg-purple-50 rounded hover:bg-purple-100 transition-colors">เปิดอัลบั้ม</a>
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ))
                            ) : <div className="p-4 text-center text-gray-400 italic bg-white text-sm">ยังไม่มีข้อมูล</div>}
                          </div>
                        </div>
                      ))
                    ) : <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg border border-yellow-200 text-sm">กำลังปรับปรุงข้อมูล...</div>}
                  </div>
                </section>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}