"use client"

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdminDashboard() {
  const router = useRouter()
  
  // --- Auth Check ---
  useEffect(() => {
    if (!sessionStorage.getItem('isLoggedIn')) router.push('/login')
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn')
    router.push('/login')
  }

  // --- Main Data State ---
  const [dataTree, setDataTree] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<number>(0) // <--- ใหม่: เก็บ ID ของมาตรฐานที่เลือกอยู่
  
  // --- Modal States ---
  const [showActivityModal, setShowActivityModal] = useState(false) 
  const [showEditActivityModal, setShowEditActivityModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // --- Selection State ---
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  
  // --- Form Inputs ---
  const [actTitle, setActTitle] = useState('')
  const [actDesc, setActDesc] = useState('')
  const [editingActivityId, setEditingActivityId] = useState<number | null>(null)

  // --- Upload Inputs ---
  const [uploadType, setUploadType] = useState<'pdf' | 'album' | 'link'>('pdf')
  const [docTitle, setDocTitle] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [images, setImages] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [processingOrder, setProcessingOrder] = useState(false)

  // --- Inline Edit & Preview State ---
  const [editingDocId, setEditingDocId] = useState<number | null>(null)
  const [editDocTitle, setEditDocTitle] = useState('')
  const [expandedAlbums, setExpandedAlbums] = useState<Record<number, boolean>>({})

  // --- Helper: Safe Filename ---
  const getSafeFileName = (name: string, prefix: string) => {
    const ext = name.split('.').pop()
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}-${Date.now()}-${random}.${ext}`
  }

  // --- Fetch Data ---
  const fetchData = async () => {
    if (dataTree.length === 0) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('standards')
        .select(`*, indicators (*, activities (*, documents (*)), documents (*))`)
        .order('id')

      if (error) throw error

      const sorted = data?.map((std: any) => ({
        ...std,
        indicators: std.indicators.map((ind: any) => ({
            ...ind,
            activities: ind.activities?.sort((a:any, b:any) => {
                const orderDiff = (a.order_index || 0) - (b.order_index || 0)
                if (orderDiff !== 0) return orderDiff
                return a.id - b.id
            }) || [],
            documents: ind.documents?.filter((d:any) => !d.activity_id) || []
        })).sort((a: any, b: any) => a.code.localeCompare(b.code))
      }))
      
      setDataTree(sorted || [])
      
      // ตั้งค่า Tab แรกอัตโนมัติ (ถ้ายังไม่ได้เลือก)
      if (sorted && sorted.length > 0 && activeTab === 0) {
          setActiveTab(sorted[0].id)
      }

    } catch (err) { console.error(err) } 
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  // --- Feature: Move Up / Down ---
  const handleMoveActivity = async (activity: any, direction: 'up' | 'down', allActivities: any[]) => {
      if (processingOrder) return
      setProcessingOrder(true)
      try {
          const currentIndex = allActivities.findIndex(a => a.id === activity.id)
          if (currentIndex === -1) return

          let targetIndex = -1
          if (direction === 'up' && currentIndex > 0) targetIndex = currentIndex - 1
          if (direction === 'down' && currentIndex < allActivities.length - 1) targetIndex = currentIndex + 1
          
          if (targetIndex === -1) return

          const newOrderList = [...allActivities]
          ;[newOrderList[currentIndex], newOrderList[targetIndex]] = [newOrderList[targetIndex], newOrderList[currentIndex]]

          for (let i = 0; i < newOrderList.length; i++) {
              await supabase.from('activities').update({ order_index: i + 1 }).eq('id', newOrderList[i].id)
          }
          await fetchData()
      } catch (err) { console.error(err); alert('เกิดข้อผิดพลาด') } 
      finally { setProcessingOrder(false) }
  }

  // --- Actions ---
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault(); if (!actTitle) return alert('ใส่ชื่อรายการ')
    setUploading(true)
    try {
      const currentCount = selectedIndicator?.activities?.length || 0
      const { error } = await supabase.from('activities').insert({
        indicator_id: selectedIndicator.id, title: actTitle, description: actDesc, order_index: currentCount + 1
      })
      if (error) throw error; alert('✅ สำเร็จ'); setShowActivityModal(false); setActTitle(''); setActDesc(''); fetchData()
    } catch (err: any) { alert(err.message) } finally { setUploading(false) }
  }

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingActivityId) return; setUploading(true)
    try {
      const { error } = await supabase.from('activities').update({ title: actTitle, description: actDesc }).eq('id', editingActivityId)
      if (error) throw error; alert('✅ แก้ไขแล้ว'); setShowEditActivityModal(false); setActTitle(''); setActDesc(''); setEditingActivityId(null); fetchData()
    } catch (err: any) { alert(err.message) } finally { setUploading(false) }
  }

  const deleteActivity = async (id: number) => { if(!confirm('ลบ?')) return; await supabase.from('activities').delete().eq('id', id); fetchData() }

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault(); if (!docTitle) return alert('ใส่ชื่อเอกสาร'); setUploading(true)
    try {
      let finalFileUrl = '', gallery: string[] = []
      if (uploadType === 'link') finalFileUrl = linkUrl
      else if (uploadType === 'pdf') {
        const name = getSafeFileName(file!.name, 'pdf'); await supabase.storage.from('school_docs').upload(name, file!);
        finalFileUrl = supabase.storage.from('school_docs').getPublicUrl(name).data.publicUrl
      } else if (uploadType === 'album') {
        for (let i = 0; i < images!.length; i++) {
           const name = getSafeFileName(images![i].name, `img-${i}`); await supabase.storage.from('school_docs').upload(name, images![i]);
           gallery.push(supabase.storage.from('school_docs').getPublicUrl(name).data.publicUrl)
        }
        finalFileUrl = gallery[0]
      }
      const payload: any = { title: docTitle, doc_type: uploadType, file_url: finalFileUrl, activity_id: selectedActivity.id, indicator_id: selectedActivity.indicator_id, gallery: gallery.length > 0 ? gallery : null }
      const { error } = await supabase.from('documents').insert(payload); if (error) throw error; alert('✅ เรียบร้อย'); setShowUploadModal(false); setDocTitle(''); setFile(null); setImages(null); setLinkUrl(''); fetchData()
    } catch (err: any) { alert(err.message) } finally { setUploading(false) }
  }

  // Helpers
  const openEditActivity = (act: any) => { setEditingActivityId(act.id); setActTitle(act.title); setActDesc(act.description || ''); setShowEditActivityModal(true) }
  const startEditDoc = (doc: any) => { setEditingDocId(doc.id); setEditDocTitle(doc.title) }
  const saveEditDoc = async (id: number) => { await supabase.from('documents').update({ title: editDocTitle }).eq('id', id); setEditingDocId(null); fetchData() }
  const deleteDoc = async (id: number) => { if(!confirm('ลบ?')) return; await supabase.from('documents').delete().eq('id', id); fetchData() }
  const toggleAlbum = (docId: number) => { setExpandedAlbums(prev => ({ ...prev, [docId]: !prev[docId] })) }

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-blue-900">⚙️ จัดการข้อมูล (Admin)</h1>
            <div className="flex gap-2">
                <Link href="/" className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold text-gray-700 shadow-sm">🏠 ไปหน้าเว็บ</Link>
                <button onClick={handleLogout} className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm font-bold hover:bg-red-100 shadow-sm">ออกจากระบบ</button>
            </div>
        </div>

        {loading && dataTree.length === 0 ? <p className="text-center py-10">กำลังโหลดข้อมูล...</p> : (
            <>
                {/* --- TAB NAVIGATION (เมนูเลือกมาตรฐาน) --- */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-1">
                    {dataTree.map((std) => (
                        <button
                            key={std.id}
                            onClick={() => setActiveTab(std.id)}
                            className={`px-5 py-3 rounded-t-lg font-bold text-sm transition-all shadow-sm border-t border-l border-r
                                ${activeTab === std.id 
                                    ? 'bg-blue-600 text-white border-blue-600 translate-y-[1px]' 
                                    : 'bg-white text-gray-500 hover:bg-gray-100 border-transparent'
                                }
                            `}
                        >
                           {std.name.length > 20 ? std.name.substring(0, 20) + '...' : std.name}
                        </button>
                    ))}
                </div>

                {/* --- CONTENT AREA (แสดงเฉพาะมาตรฐานที่เลือก) --- */}
                <div className="space-y-8 min-h-[500px]">
                    {dataTree
                        .filter(std => std.id === activeTab) // กรองเอาเฉพาะตัวที่เลือก
                        .map(std => (
                            <div key={std.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                                    <h2 className="text-lg font-bold text-blue-800">{std.name}</h2>
                                </div>
                                <div className="divide-y divide-gray-100">
                                    {std.indicators.map((ind: any) => (
                                        <div key={ind.id} className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="font-semibold text-gray-800 text-lg">
                                                    <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm mr-2">{ind.code}</span>
                                                    {ind.name}
                                                </h3>
                                                <button 
                                                    onClick={() => { setSelectedIndicator(ind); setActTitle(''); setActDesc(''); setShowActivityModal(true) }}
                                                    className="bg-green-600 text-white px-3 py-1.5 rounded text-sm hover:bg-green-700 shadow-sm flex items-center gap-1"
                                                >
                                                    + เพิ่มรายการ
                                                </button>
                                            </div>

                                            <div className="space-y-4 ml-4 border-l-2 border-gray-200 pl-4">
                                                {ind.activities.map((act: any, index: number) => (
                                                    <div key={act.id} className="bg-gray-50 rounded border border-gray-200 p-4 relative group transition-all duration-300">
                                                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                                                            <button onClick={() => openEditActivity(act)} className="text-blue-500 hover:text-blue-700 bg-white px-2 py-1 rounded border shadow-sm text-xs">✏️ แก้ไข</button>
                                                            <button onClick={() => deleteActivity(act.id)} className="text-red-500 hover:text-red-700 bg-white px-2 py-1 rounded border shadow-sm text-xs">🗑️ ลบ</button>
                                                        </div>

                                                        <div className="flex items-start gap-3 mb-2 pr-20">
                                                            {/* ปุ่มเลื่อน */}
                                                            <div className="flex flex-col gap-1 mt-1">
                                                                {index > 0 && <button onClick={() => handleMoveActivity(act, 'up', ind.activities)} disabled={processingOrder} className="bg-white border border-gray-300 rounded hover:bg-blue-50 text-xs w-6 h-6 flex items-center justify-center text-gray-600 hover:text-blue-600">🔼</button>}
                                                                {index < ind.activities.length - 1 && <button onClick={() => handleMoveActivity(act, 'down', ind.activities)} disabled={processingOrder} className="bg-white border border-gray-300 rounded hover:bg-blue-50 text-xs w-6 h-6 flex items-center justify-center text-gray-600 hover:text-blue-600">🔽</button>}
                                                            </div>

                                                            <div className="flex-1">
                                                                <h4 className="font-bold text-gray-900 text-lg flex items-center gap-2">📁 {act.title}</h4>
                                                                {act.description && <p className="text-gray-600 text-sm mb-2">{act.description}</p>}
                                                            </div>
                                                        </div>
                                                        
                                                        <div className="bg-white rounded border border-gray-200 p-2 mb-3 ml-9">
                                                            {act.documents?.length > 0 ? (
                                                                <div className="space-y-2">
                                                                    {act.documents.map((doc: any) => (
                                                                        <div key={doc.id} className="border-b last:border-0 pb-2 mb-2">
                                                                            <div className="flex justify-between items-center text-sm">
                                                                                <div className="flex items-center gap-2 flex-1">
                                                                                    <span>{doc.doc_type === 'link' ? '🔗' : doc.doc_type === 'album' ? '🖼️' : '📄'}</span>
                                                                                    {editingDocId === doc.id ? (
                                                                                        <div className="flex gap-1"><input value={editDocTitle} onChange={e => setEditDocTitle(e.target.value)} className="border px-1" /><button onClick={() => saveEditDoc(doc.id)}>✅</button></div>
                                                                                    ) : (
                                                                                        <div className="flex items-center gap-2 group/doc">
                                                                                            <span className="font-medium">{doc.title}</span>
                                                                                            <button onClick={() => startEditDoc(doc)} className="opacity-0 group-hover/doc:opacity-100 text-gray-400">✎</button>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                                <div className="flex gap-2">
                                                                                    {doc.doc_type === 'album' && <button onClick={() => toggleAlbum(doc.id)} className="text-xs bg-gray-200 px-2 rounded">ดูรูป</button>}
                                                                                    <button onClick={() => deleteDoc(doc.id)} className="text-red-500 text-xs">ลบ</button>
                                                                                </div>
                                                                            </div>
                                                                            {doc.doc_type === 'album' && expandedAlbums[doc.id] && doc.gallery && (
                                                                                <div className="mt-2 grid grid-cols-5 gap-2">{doc.gallery.map((url:string) => <img key={url} src={url} className="w-full h-full object-cover aspect-square" />)}</div>
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            ) : <p className="text-gray-400 text-xs text-center py-2">- ยังไม่มีไฟล์ -</p>}
                                                        </div>
                                                        <button onClick={() => { setSelectedActivity(act); setDocTitle(''); setShowUploadModal(true) }} className="text-sm text-blue-600 font-medium ml-9">⬆ อัปโหลดไฟล์</button>
                                                    </div>
                                                ))}
                                                {ind.activities.length === 0 && <p className="text-gray-400 text-sm ml-9 italic">ยังไม่มีรายการ</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                </div>
            </>
        )}

        {/* --- MODALS (Code เดิม ย่อไว้) --- */}
        {showActivityModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                    <h3 className="text-xl font-bold mb-4">เพิ่มหลักฐาน/ร่องรอย</h3>
                    <form onSubmit={handleCreateActivity} className="space-y-4">
                        <div><label className="block text-sm font-bold text-gray-700">ชื่อรายการ</label><input autoFocus value={actTitle} onChange={e => setActTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" required /></div>
                        <div><label className="block text-sm font-bold text-gray-700">คำบรรยาย</label><textarea value={actDesc} onChange={e => setActDesc(e.target.value)} className="w-full border p-2 rounded text-gray-900" rows={3} /></div>
                        <div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowActivityModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">{uploading ? '...' : 'บันทึก'}</button></div>
                    </form>
                </div>
            </div>
        )}
        {showEditActivityModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl border-t-4 border-yellow-500">
                    <h3 className="text-xl font-bold mb-4">แก้ไขข้อมูล</h3>
                    <form onSubmit={handleUpdateActivity} className="space-y-4">
                        <div><label className="block text-sm font-bold text-gray-700">ชื่อรายการ</label><input autoFocus value={actTitle} onChange={e => setActTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" required /></div>
                        <div><label className="block text-sm font-bold text-gray-700">คำบรรยาย</label><textarea value={actDesc} onChange={e => setActDesc(e.target.value)} className="w-full border p-2 rounded text-gray-900" rows={3} /></div>
                        <div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowEditActivityModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" disabled={uploading} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded font-bold">บันทึก</button></div>
                    </form>
                </div>
            </div>
        )}
        {showUploadModal && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                    <h3 className="text-xl font-bold mb-2">แนบไฟล์</h3>
                    <p className="text-sm text-blue-600 mb-4 font-semibold">ในหัวข้อ: {selectedActivity?.title}</p>
                    <form onSubmit={handleUpload} className="space-y-4">
                        <div className="flex gap-4 border-b pb-2"><label className="cursor-pointer flex gap-1"><input type="radio" checked={uploadType === 'pdf'} onChange={() => setUploadType('pdf')} /> PDF</label><label className="cursor-pointer flex gap-1"><input type="radio" checked={uploadType === 'album'} onChange={() => setUploadType('album')} /> อัลบั้ม</label><label className="cursor-pointer flex gap-1"><input type="radio" checked={uploadType === 'link'} onChange={() => setUploadType('link')} /> ลิงก์</label></div>
                        <div><label className="block text-sm font-bold text-gray-700">ชื่อเอกสาร</label><input value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" required /></div>
                        {uploadType === 'pdf' && <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-lg p-1" required />}
                        {uploadType === 'album' && <input type="file" accept="image/*" multiple onChange={e => setImages(e.target.files)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer border border-gray-300 rounded-lg p-1" required />}
                        {uploadType === 'link' && <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full border p-2 rounded" placeholder="https://..." />}
                        <div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" className="px-4 py-2 bg-green-600 text-white rounded font-bold">ยืนยัน</button></div>
                    </form>
                </div>
             </div>
        )}
      </div>
    </div>
  )
}