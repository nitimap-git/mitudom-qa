"use client"

import { useState, useEffect, Fragment } from 'react'
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
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('standards')
        .select(`
          *,
          indicators (
            *,
            activities (
              *,
              documents (*)
            ),
            documents (*) 
          )
        `)
        .order('id')

      if (error) throw error

      const sorted = data?.map((std: any) => ({
        ...std,
        indicators: std.indicators.map((ind: any) => ({
            ...ind,
            activities: ind.activities?.sort((a:any, b:any) => a.id - b.id) || [],
            documents: ind.documents?.filter((d:any) => !d.activity_id) || []
        })).sort((a: any, b: any) => a.code.localeCompare(b.code))
      }))
      
      setDataTree(sorted || [])
    } catch (err) { console.error(err) } 
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  // --- Actions: Evidence Group ---

  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!actTitle) return alert('กรุณาใส่ชื่อรายการ')
    setUploading(true)
    try {
      const { error } = await supabase.from('activities').insert({
        indicator_id: selectedIndicator.id,
        title: actTitle,
        description: actDesc
      })
      if (error) throw error
      alert('✅ เพิ่มรายการสำเร็จ')
      setShowActivityModal(false); setActTitle(''); setActDesc('')
      fetchData()
    } catch (err: any) { alert(err.message) }
    finally { setUploading(false) }
  }

  const openEditActivity = (act: any) => {
    setEditingActivityId(act.id)
    setActTitle(act.title)
    setActDesc(act.description || '')
    setShowEditActivityModal(true)
  }

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingActivityId) return
    setUploading(true)
    try {
      const { error } = await supabase.from('activities')
        .update({ title: actTitle, description: actDesc })
        .eq('id', editingActivityId)
      
      if (error) throw error
      alert('✅ แก้ไขข้อมูลเรียบร้อย')
      setShowEditActivityModal(false); setActTitle(''); setActDesc(''); setEditingActivityId(null)
      fetchData()
    } catch (err: any) { alert(err.message) }
    finally { setUploading(false) }
  }

  const deleteActivity = async (id: number) => {
    if(!confirm('ยืนยันลบรายการนี้? (เอกสารข้างในจะหายหมด)')) return
    await supabase.from('activities').delete().eq('id', id)
    fetchData()
  }

  // --- Actions: Documents & Upload ---

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!docTitle) return alert('กรุณาใส่ชื่อเอกสาร')
    setUploading(true)

    try {
      let finalFileUrl = ''
      let gallery: string[] = []

      if (uploadType === 'link') {
        if (!linkUrl) throw new Error('กรุณาใส่ลิงก์')
        finalFileUrl = linkUrl
      } 
      else if (uploadType === 'pdf') {
        if (!file) throw new Error('เลือกไฟล์ PDF ก่อน')
        const name = getSafeFileName(file.name, 'pdf')
        const { error } = await supabase.storage.from('school_docs').upload(name, file)
        if (error) throw error
        const { data } = supabase.storage.from('school_docs').getPublicUrl(name)
        finalFileUrl = data.publicUrl
      }
      else if (uploadType === 'album') {
        if (!images || images.length === 0) throw new Error('เลือกรูปภาพก่อน')
        for (let i = 0; i < images.length; i++) {
           const name = getSafeFileName(images[i].name, `img-${i}`)
           await supabase.storage.from('school_docs').upload(name, images[i])
           const { data } = supabase.storage.from('school_docs').getPublicUrl(name)
           gallery.push(data.publicUrl)
        }
        finalFileUrl = gallery[0]
      }

      const payload: any = {
        title: docTitle,
        doc_type: uploadType,
        file_url: finalFileUrl,
        activity_id: selectedActivity.id,
        indicator_id: selectedActivity.indicator_id
      }
      if (gallery.length > 0) payload.gallery = gallery

      const { error } = await supabase.from('documents').insert(payload)
      if (error) throw error

      alert('✅ เพิ่มไฟล์แนบเรียบร้อย')
      setShowUploadModal(false); setDocTitle(''); setFile(null); setImages(null); setLinkUrl('')
      fetchData()
    } catch (err: any) { alert(err.message) }
    finally { setUploading(false) }
  }

  // --- New Feature 1: Add Images to Existing Album ---
  const handleAddToAlbum = async (docId: number, currentGallery: string[], e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files
    if (!newFiles || newFiles.length === 0) return
    
    if (!confirm(`ยืนยันเพิ่มรูป ${newFiles.length} รูป?`)) {
        e.target.value = '' // Reset input
        return
    }

    try {
        const newUrls: string[] = []
        for (let i = 0; i < newFiles.length; i++) {
            const img = newFiles[i]
            const name = getSafeFileName(img.name, `add-${i}`)
            const { error } = await supabase.storage.from('school_docs').upload(name, img)
            if (error) throw error
            const { data } = supabase.storage.from('school_docs').getPublicUrl(name)
            newUrls.push(data.publicUrl)
        }
        
        // เอาของเก่า + ของใหม่มารวมกัน
        const updatedGallery = [...(currentGallery || []), ...newUrls]
        
        await supabase.from('documents')
            .update({ 
                gallery: updatedGallery,
                // อัปเดตปกให้เป็นรูปล่าสุด หรือรูปแรกเสมอ (เลือกรูปแรก)
                file_url: updatedGallery[0] 
            })
            .eq('id', docId)
            
        alert('✅ เพิ่มรูปเรียบร้อย')
        fetchData() // รีเฟรชหน้าจอ
    } catch (err: any) { 
        alert(`❌ เกิดข้อผิดพลาด: ${err.message}`) 
    }
  }

  // --- New Feature 2: Remove Single Image from Album ---
  const handleRemoveFromAlbum = async (docId: number, currentGallery: string[], indexToRemove: number) => {
    if (!confirm('ต้องการลบรูปนี้ใช่ไหม?')) return

    try {
        // สร้างอาร์เรย์ใหม่โดยตัดตัวที่เลือกออก
        const updatedGallery = currentGallery.filter((_, idx) => idx !== indexToRemove)
        
        if (updatedGallery.length === 0) {
            if (confirm('รูปหมดแล้ว ต้องการลบอัลบั้มนี้ทิ้งเลยไหม?')) {
                await supabase.from('documents').delete().eq('id', docId)
            } else {
                // ถ้าไม่ลบอัลบั้ม ก็ปล่อยให้ว่างไว้ แต่ต้องระวังเรื่อง file_url
                await supabase.from('documents').update({ gallery: [], file_url: null }).eq('id', docId)
            }
        } else {
            // บันทึกอาร์เรย์ใหม่ลงฐานข้อมูล
            await supabase.from('documents')
                .update({ 
                    gallery: updatedGallery,
                    file_url: updatedGallery[0] // อัปเดตปกใหม่เผื่อลบรูปปกไป
                })
                .eq('id', docId)
        }
        fetchData()
    } catch (err: any) { 
        alert(`❌ ลบไม่สำเร็จ: ${err.message}`) 
    }
  }

  // --- Inline Edit / Delete Document ---
  const startEditDoc = (doc: any) => { setEditingDocId(doc.id); setEditDocTitle(doc.title) }
  const saveEditDoc = async (id: number) => {
    try {
      const { error } = await supabase.from('documents').update({ title: editDocTitle }).eq('id', id)
      if (error) throw error
      setEditingDocId(null); fetchData()
    } catch (err: any) { alert(err.message) }
  }
  const deleteDoc = async (id: number) => { if(!confirm('ลบไฟล์แนบนี้?')) return; await supabase.from('documents').delete().eq('id', id); fetchData() }
  const toggleAlbum = (docId: number) => { setExpandedAlbums(prev => ({ ...prev, [docId]: !prev[docId] })) }

  // --- RENDER ---
  return (
    <div className="min-h-screen bg-gray-50 p-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
            <h1 className="text-2xl font-bold text-blue-900">⚙️ จัดการข้อมูล (Admin)</h1>
            <div className="flex gap-2">
                <Link 
                  href="/" 
                  className="px-4 py-2 bg-white border border-gray-300 rounded hover:bg-gray-50 text-sm font-bold text-gray-700 shadow-sm"
                >
                  🏠 ไปหน้าเว็บ
                </Link>
                <button 
                  onClick={handleLogout} 
                  className="px-4 py-2 bg-red-50 text-red-700 border border-red-200 rounded text-sm font-bold hover:bg-red-100 shadow-sm"
                >
                  ออกจากระบบ
                </button>
            </div>
        </div>

        {loading ? <p>Loading...</p> : (
            <div className="space-y-8">
                {dataTree.map(std => (
                    <div key={std.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
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
                                            + เพิ่มหลักฐาน/ร่องรอย
                                        </button>
                                    </div>

                                    {/* Evidence List */}
                                    <div className="space-y-4 ml-4 border-l-2 border-gray-200 pl-4">
                                        {ind.activities.map((act: any) => (
                                            <div key={act.id} className="bg-gray-50 rounded border border-gray-200 p-4 relative group">
                                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition">
                                                    <button onClick={() => openEditActivity(act)} className="text-blue-500 hover:text-blue-700 bg-white p-1 rounded border shadow-sm text-xs">✏️ แก้ไข</button>
                                                    <button onClick={() => deleteActivity(act.id)} className="text-red-500 hover:text-red-700 bg-white p-1 rounded border shadow-sm text-xs">🗑️ ลบ</button>
                                                </div>
                                                
                                                <h4 className="font-bold text-gray-900 text-lg mb-1 flex items-center gap-2">📂 {act.title}</h4>
                                                {act.description && <p className="text-gray-600 text-sm mb-3">{act.description}</p>}
                                                
                                                {/* Attached Files List */}
                                                <div className="bg-white rounded border border-gray-200 p-2 mb-3">
                                                    {act.documents?.length > 0 ? (
                                                        <div className="space-y-2">
                                                            {act.documents.map((doc: any) => (
                                                                <div key={doc.id} className="border-b last:border-0 pb-2 mb-2">
                                                                    <div className="flex justify-between items-center text-sm">
                                                                        <div className="flex items-center gap-2 flex-1">
                                                                            <span>{doc.doc_type === 'link' ? '🔗' : doc.doc_type === 'album' ? '🖼️' : '📄'}</span>
                                                                            {editingDocId === doc.id ? (
                                                                                <div className="flex items-center gap-1 w-full max-w-xs">
                                                                                    <input value={editDocTitle} onChange={e => setEditDocTitle(e.target.value)} className="border px-2 py-1 rounded w-full text-gray-900" autoFocus />
                                                                                    <button onClick={() => saveEditDoc(doc.id)} className="text-green-600">✅</button>
                                                                                    <button onClick={() => setEditingDocId(null)} className="text-red-500">❌</button>
                                                                                </div>
                                                                            ) : (
                                                                                <div className="flex items-center gap-2 group/doc">
                                                                                    <span className="font-medium text-gray-700">{doc.title}</span>
                                                                                    <button onClick={() => startEditDoc(doc)} className="text-gray-400 hover:text-blue-500 opacity-0 group-hover/doc:opacity-100 transition">✎</button>
                                                                                </div>
                                                                            )}
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            {doc.doc_type === 'album' ? (
                                                                                <button onClick={() => toggleAlbum(doc.id)} className={`text-xs px-2 py-1 rounded ${expandedAlbums[doc.id] ? 'bg-gray-200 text-gray-600' : 'bg-blue-100 text-blue-600'}`}>
                                                                                    {expandedAlbums[doc.id] ? 'หุบรูป' : 'ดูรูป 📸'}
                                                                                </button>
                                                                            ) : (
                                                                                <a href={doc.file_url} target="_blank" className="text-xs px-2 py-1 bg-gray-100 hover:bg-gray-200 rounded text-gray-600">เปิดดู ↗</a>
                                                                            )}
                                                                            <button onClick={() => deleteDoc(doc.id)} className="text-red-500 hover:text-red-700 text-xs">✕ ลบ</button>
                                                                        </div>
                                                                    </div>

                                                                    {/* --- Album Gallery Preview & Edit --- */}
                                                                    {doc.doc_type === 'album' && expandedAlbums[doc.id] && doc.gallery && (
                                                                        <div className="mt-3 p-3 bg-gray-50 border rounded-lg">
                                                                            <p className="text-xs text-gray-500 mb-2 font-bold">จัดการรูปภาพในอัลบั้ม ({doc.gallery.length} รูป):</p>
                                                                            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
                                                                                {/* วนลูปรูปภาพที่มีอยู่ */}
                                                                                {doc.gallery.map((url: string, idx: number) => (
                                                                                    <div key={idx} className="relative group/img aspect-square border rounded-md overflow-hidden bg-white shadow-sm">
                                                                                        <a href={url} target="_blank">
                                                                                            <img src={url} className="w-full h-full object-cover" />
                                                                                        </a>
                                                                                        {/* ปุ่มลบรูปทีละรูป */}
                                                                                        <button 
                                                                                            onClick={() => handleRemoveFromAlbum(doc.id, doc.gallery, idx)} 
                                                                                            className="absolute top-1 right-1 bg-red-600 text-white w-6 h-6 flex items-center justify-center rounded-full text-xs shadow hover:bg-red-700 opacity-100 md:opacity-0 group-hover/img:opacity-100 transition"
                                                                                            title="ลบรูปนี้"
                                                                                        >
                                                                                            ✕
                                                                                        </button>
                                                                                    </div>
                                                                                ))}

                                                                                {/* ปุ่มเพิ่มรูปใหม่ (กล่องสุดท้าย) */}
                                                                                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition text-gray-400 hover:text-blue-600">
                                                                                    <span className="text-2xl font-bold">+</span>
                                                                                    <span className="text-xs">เพิ่มรูป</span>
                                                                                    <input 
                                                                                        type="file" 
                                                                                        accept="image/*" 
                                                                                        multiple 
                                                                                        className="hidden" 
                                                                                        onChange={(e) => handleAddToAlbum(doc.id, doc.gallery, e)} 
                                                                                    />
                                                                                </label>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    ) : <p className="text-gray-400 text-xs text-center py-2">- ยังไม่มีไฟล์แนบ -</p>}
                                                </div>

                                                <button onClick={() => { setSelectedActivity(act); setDocTitle(''); setShowUploadModal(true) }} className="text-sm text-blue-600 hover:text-blue-800 font-medium flex items-center gap-1">
                                                    ⬆ อัปโหลดไฟล์แนบ
                                                </button>
                                            </div>
                                        ))}
                                        {ind.activities.length === 0 && <p className="text-gray-400 italic text-sm">ยังไม่มีข้อมูล</p>}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* --- Modals (Create, Edit, Upload) --- */}
        {showActivityModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                    <h3 className="text-xl font-bold mb-4">เพิ่มหลักฐาน/ร่องรอยใหม่</h3>
                    <form onSubmit={handleCreateActivity} className="space-y-4">
                        <div><label className="block text-sm font-bold text-gray-700">ชื่อรายการ</label><input autoFocus value={actTitle} onChange={e => setActTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" placeholder="เช่น โครงการวันเด็ก..." required /></div>
                        <div><label className="block text-sm font-bold text-gray-700">คำบรรยาย</label><textarea value={actDesc} onChange={e => setActDesc(e.target.value)} className="w-full border p-2 rounded text-gray-900" rows={3} /></div>
                        <div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowActivityModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">{uploading ? '...' : 'บันทึก'}</button></div>
                    </form>
                </div>
            </div>
        )}
        {showEditActivityModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl border-t-4 border-yellow-500">
                    <h3 className="text-xl font-bold mb-4">แก้ไขหลักฐาน/ร่องรอย</h3>
                    <form onSubmit={handleUpdateActivity} className="space-y-4">
                        <div><label className="block text-sm font-bold text-gray-700">ชื่อรายการ</label><input autoFocus value={actTitle} onChange={e => setActTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" required /></div>
                        <div><label className="block text-sm font-bold text-gray-700">คำบรรยาย</label><textarea value={actDesc} onChange={e => setActDesc(e.target.value)} className="w-full border p-2 rounded text-gray-900" rows={3} /></div>
                        <div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowEditActivityModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" disabled={uploading} className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded font-bold">{uploading ? '...' : 'บันทึกการแก้ไข'}</button></div>
                    </form>
                </div>
            </div>
        )}
        {showUploadModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
    <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
        <h3 className="text-xl font-bold mb-2">แนบไฟล์/รูปภาพ</h3>
        <p className="text-sm text-blue-600 mb-4 font-semibold">ในหัวข้อ: {selectedActivity?.title}</p>
        
        <form onSubmit={handleUpload} className="space-y-4">
            {/* เลือกประเภท */}
            <div className="flex gap-4 border-b pb-2">
                    <label className="flex gap-1 cursor-pointer"><input type="radio" checked={uploadType === 'pdf'} onChange={() => setUploadType('pdf')} /> PDF</label>
                    <label className="flex gap-1 cursor-pointer"><input type="radio" checked={uploadType === 'album'} onChange={() => setUploadType('album')} /> อัลบั้ม</label>
                    <label className="flex gap-1 cursor-pointer"><input type="radio" checked={uploadType === 'link'} onChange={() => setUploadType('link')} /> ลิงก์</label>
            </div>

            {/* ช่องกรอกชื่อ */}
            <div>
                <label className="block text-sm font-bold text-gray-700">ชื่อเอกสาร/รูปภาพ</label>
                <input value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" required />
            </div>

            {/* --- จุดที่แก้: ปรับ Input PDF ให้สวยงาม --- */}
            {uploadType === 'pdf' && (
                <div className="mt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">เลือกไฟล์ PDF</label>
                    <input 
                        type="file" 
                        accept="application/pdf" 
                        onChange={e => setFile(e.target.files?.[0] || null)} 
                        className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-bold
                            file:bg-blue-50 file:text-blue-700
                            hover:file:bg-blue-100
                            cursor-pointer border border-gray-300 rounded-lg p-1"
                        required 
                    />
                </div>
            )}

            {/* --- จุดที่แก้: ปรับ Input Album ให้สวยงาม --- */}
            {uploadType === 'album' && (
                <div className="mt-2">
                    <label className="block text-sm font-bold text-gray-700 mb-2">เลือกรูปภาพ (เลือกได้หลายรูป)</label>
                    <input 
                        type="file" 
                        accept="image/*" 
                        multiple 
                        onChange={e => setImages(e.target.files)} 
                        className="block w-full text-sm text-gray-500
                            file:mr-4 file:py-2 file:px-4
                            file:rounded-full file:border-0
                            file:text-sm file:font-bold
                            file:bg-purple-50 file:text-purple-700
                            hover:file:bg-purple-100
                            cursor-pointer border border-gray-300 rounded-lg p-1"
                        required 
                    />
                </div>
            )}

            {/* ส่วน Link (เหมือนเดิม) */}
            {uploadType === 'link' && <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full border p-2 rounded text-gray-900" placeholder="https://..." required />}
            
            <div className="flex gap-2 justify-end mt-6">
                <button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button>
                <button type="submit" disabled={uploading} className="px-4 py-2 bg-green-600 text-white rounded font-bold">{uploading ? '...' : 'ยืนยัน'}</button>
            </div>
        </form>
    </div>
</div>
        )}
      </div>
    </div>
  )
}