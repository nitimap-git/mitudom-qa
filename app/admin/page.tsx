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

  // --- Data State ---
  const [dataTree, setDataTree] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<number>(0)
  
  // --- Modal Visibility ---
  const [showTopicModal, setShowTopicModal] = useState(false)
  const [showEditTopicModal, setShowEditTopicModal] = useState(false)
  const [showActivityModal, setShowActivityModal] = useState(false)
  const [showEditActivityModal, setShowEditActivityModal] = useState(false)
  const [showUploadModal, setShowUploadModal] = useState(false)

  // --- Selection State ---
  const [selectedIndicator, setSelectedIndicator] = useState<any>(null)
  const [selectedTopic, setSelectedTopic] = useState<any>(null)
  const [selectedActivity, setSelectedActivity] = useState<any>(null)
  
  // --- Inputs ---
  const [topicTitle, setTopicTitle] = useState('')
  const [topicDesc, setTopicDesc] = useState('')
  const [editingTopicId, setEditingTopicId] = useState<number|null>(null)

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

  // --- Inline Edit & Preview ---
  const [editingDocId, setEditingDocId] = useState<number | null>(null)
  const [editDocTitle, setEditDocTitle] = useState('')
  const [expandedAlbums, setExpandedAlbums] = useState<Record<number, boolean>>({})

  // --- Helper: Safe Filename ---
  const getSafeFileName = (name: string, prefix: string) => {
    const ext = name.split('.').pop()
    const random = Math.random().toString(36).substring(2, 8)
    return `${prefix}-${Date.now()}-${random}.${ext}`
  }

  // --- FETCH DATA ---
  const fetchData = async () => {
    if (dataTree.length === 0) setLoading(true)
    try {
      const { data, error } = await supabase
        .from('standards')
        .select(`*, indicators (*, topics (*, activities (*, documents (*))))`)
        .order('id')

      if (error) throw error

      const sorted = data?.map((std: any) => ({
        ...std,
        indicators: std.indicators.map((ind: any) => ({
            ...ind,
            topics: ind.topics?.sort((a:any, b:any) => (a.order_index || 0) - (b.order_index || 0))?.map((topic: any) => ({
                ...topic,
                activities: topic.activities?.sort((a:any, b:any) => {
                    const orderDiff = (a.order_index || 0) - (b.order_index || 0)
                    if (orderDiff !== 0) return orderDiff
                    return a.id - b.id
                }) || []
            })) || []
        }))
        .sort((a: any, b: any) => a.code.localeCompare(b.code, undefined, { numeric: true }))
      }))
      
      setDataTree(sorted || [])
      if (sorted && sorted.length > 0 && activeTab === 0) setActiveTab(sorted[0].id)

    } catch (err) { console.error(err) } 
    finally { setLoading(false) }
  }

  useEffect(() => { fetchData() }, [])

  // --- TOPIC ACTIONS ---
  const handleCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!topicTitle) return alert('ใส่ชื่อหัวข้อหลัก')
    setUploading(true)
    try {
        const currentCount = selectedIndicator?.topics?.length || 0
        const { error } = await supabase.from('topics').insert({
            indicator_id: selectedIndicator.id,
            title: topicTitle,
            description: topicDesc,
            order_index: currentCount + 1
        })
        if (error) throw error
        alert('✅ เพิ่มหัวข้อหลักสำเร็จ')
        setShowTopicModal(false); setTopicTitle(''); setTopicDesc(''); fetchData()
    } catch (err: any) { alert(err.message) } finally { setUploading(false) }
  }

  const handleUpdateTopic = async (e: React.FormEvent) => {
      e.preventDefault(); if(!editingTopicId) return; setUploading(true)
      try {
          await supabase.from('topics').update({ title: topicTitle, description: topicDesc }).eq('id', editingTopicId)
          alert('✅ แก้ไขหัวข้อหลักแล้ว'); setShowEditTopicModal(false); setTopicTitle(''); setTopicDesc(''); setEditingTopicId(null); fetchData()
      } catch (err: any) { alert(err.message) } finally { setUploading(false) }
  }

  const deleteTopic = async (id: number) => {
      if(!confirm('ลบหัวข้อหลักนี้? (ข้อมูลข้างในจะหายหมด)')) return
      await supabase.from('topics').delete().eq('id', id)
      fetchData()
  }

  // --- ACTIVITY ACTIONS ---
  const handleCreateActivity = async (e: React.FormEvent) => {
    e.preventDefault(); if (!actTitle) return alert('ใส่ชื่อหัวข้อย่อย')
    setUploading(true)
    try {
      const currentCount = selectedTopic?.activities?.length || 0
      const { error } = await supabase.from('activities').insert({
        topic_id: selectedTopic.id, 
        indicator_id: selectedIndicator.id,
        title: actTitle,
        description: actDesc,
        order_index: currentCount + 1
      })
      if (error) throw error
      alert('✅ เพิ่มหัวข้อย่อยสำเร็จ'); setShowActivityModal(false); setActTitle(''); setActDesc(''); fetchData()
    } catch (err: any) { alert(err.message) } finally { setUploading(false) }
  }

  const handleUpdateActivity = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingActivityId) return; setUploading(true)
    try {
      await supabase.from('activities').update({ title: actTitle, description: actDesc }).eq('id', editingActivityId)
      alert('✅ แก้ไขแล้ว'); setShowEditActivityModal(false); setActTitle(''); setActDesc(''); setEditingActivityId(null); fetchData()
    } catch (err: any) { alert(err.message) } finally { setUploading(false) }
  }

  const deleteActivity = async (id: number) => { if(!confirm('ลบหัวข้อย่อยนี้?')) return; await supabase.from('activities').delete().eq('id', id); fetchData() }
  
  // Re-order Logic
  const handleMoveActivity = async (activity: any, direction: 'up' | 'down', allActivities: any[]) => {
      if (processingOrder) return; setProcessingOrder(true)
      try {
          const idx = allActivities.findIndex(a => a.id === activity.id); if (idx === -1) return
          let target = -1; if (direction === 'up' && idx > 0) target = idx - 1; if (direction === 'down' && idx < allActivities.length - 1) target = idx + 1;
          if (target === -1) return
          const newList = [...allActivities]; [newList[idx], newList[target]] = [newList[target], newList[idx]]
          for (let i = 0; i < newList.length; i++) await supabase.from('activities').update({ order_index: i + 1 }).eq('id', newList[i].id)
          await fetchData()
      } catch (err) { console.error(err) } finally { setProcessingOrder(false) }
  }

  // --- UPLOAD & DOCUMENTS ---
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault(); 
    if (uploading) return; 
    
    // 🛡️ ป้องกัน Error: เช็คว่าเลือกกิจกรรมและตัวชี้วัดหรือยัง
    if (!selectedActivity || !selectedActivity.id) return alert('เกิดข้อผิดพลาด: ไม่พบข้อมูลกิจกรรม');
    // หมายเหตุ: indicator_id อาจไม่จำเป็นต้องใช้ในการ insert ถ้า DB ไม่บังคับ แต่ถ้าใส่ต้องมีค่า
    const indicatorId = selectedIndicator?.id || selectedActivity.indicator_id; 

    if (!docTitle) return alert('ใส่ชื่อเอกสาร')

    setUploading(true)
    try {
      let finalFileUrl = '', gallery: string[] = []
      
      if (uploadType === 'link') {
          if (!linkUrl) throw new Error("กรุณาใส่ลิงก์");
          finalFileUrl = linkUrl
      } else if (uploadType === 'pdf') {
        if (!file) throw new Error("กรุณาเลือกไฟล์ PDF");
        const name = getSafeFileName(file.name, 'pdf'); 
        await supabase.storage.from('school_docs').upload(name, file);
        finalFileUrl = supabase.storage.from('school_docs').getPublicUrl(name).data.publicUrl
      } else if (uploadType === 'album') {
        if (!images || images.length === 0) throw new Error("กรุณาเลือกรูปภาพ");
        for (let i = 0; i < images.length; i++) {
           const name = getSafeFileName(images[i].name, `img-${i}`); 
           await supabase.storage.from('school_docs').upload(name, images[i]);
           gallery.push(supabase.storage.from('school_docs').getPublicUrl(name).data.publicUrl)
        }
        finalFileUrl = gallery[0]
      }

      const payload: any = { 
          title: docTitle, 
          doc_type: uploadType, 
          file_url: finalFileUrl, 
          activity_id: selectedActivity.id, 
          indicator_id: indicatorId, // ใช้ค่าที่เช็คแล้ว
          gallery: gallery.length > 0 ? gallery : null 
      }

      const { error } = await supabase.from('documents').insert(payload)
      if (error) throw error

      alert('✅ อัปโหลดเรียบร้อย'); 
      setShowUploadModal(false); 
      setDocTitle(''); 
      setFile(null); 
      setImages(null); 
      setLinkUrl(''); 
      fetchData()
    } catch (err: any) { 
        alert(`❌ Error: ${err.message}`) 
    } finally { 
        setUploading(false) 
    }
  }
  
  // Gallery Actions
  const handleAddToAlbum = async (docId: number, currentGallery: string[], e: React.ChangeEvent<HTMLInputElement>) => {
    const newFiles = e.target.files; if (!newFiles?.length) return; if (!confirm(`เพิ่ม ${newFiles.length} รูป?`)) { e.target.value = ''; return }
    try {
        const newUrls: string[] = []
        for (let i = 0; i < newFiles.length; i++) {
            const name = getSafeFileName(newFiles[i].name, `add-${i}`); await supabase.storage.from('school_docs').upload(name, newFiles[i]);
            newUrls.push(supabase.storage.from('school_docs').getPublicUrl(name).data.publicUrl)
        }
        await supabase.from('documents').update({ gallery: [...(currentGallery||[]), ...newUrls] }).eq('id', docId)
        alert('✅ เพิ่มรูปแล้ว'); fetchData()
    } catch (err: any) { alert(`❌ Error: ${err.message}`) }
  }
  const handleRemoveFromAlbum = async (docId: number, currentGallery: string[], indexToRemove: number) => {
    if (!confirm('ลบรูปนี้?')) return
    try {
        const updated = currentGallery.filter((_, idx) => idx !== indexToRemove)
        if (updated.length === 0) { if (confirm('รูปหมดแล้ว ลบอัลบั้มเลยไหม?')) await supabase.from('documents').delete().eq('id', docId); else await supabase.from('documents').update({ gallery: [], file_url: null }).eq('id', docId) }
        else await supabase.from('documents').update({ gallery: updated, file_url: updated[0] }).eq('id', docId)
        fetchData()
    } catch (err: any) { alert(`❌ Error: ${err.message}`) }
  }
  const startEditDoc = (doc: any) => { setEditingDocId(doc.id); setEditDocTitle(doc.title) }
  const saveEditDoc = async (id: number) => { await supabase.from('documents').update({ title: editDocTitle }).eq('id', id); setEditingDocId(null); fetchData() }
  const deleteDoc = async (id: number) => { if(!confirm('ลบ?')) return; await supabase.from('documents').delete().eq('id', id); fetchData() }
  const toggleAlbum = (docId: number) => { setExpandedAlbums(prev => ({ ...prev, [docId]: !prev[docId] })) }
  const openEditActivity = (act: any) => { setEditingActivityId(act.id); setActTitle(act.title); setActDesc(act.description || ''); setShowEditActivityModal(true) }

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
                {/* TABS */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-1">
                    {dataTree.map((std) => (
                        <button key={std.id} onClick={() => setActiveTab(std.id)} className={`px-5 py-3 rounded-t-lg font-bold text-sm transition-all shadow-sm border-t border-l border-r ${activeTab === std.id ? 'bg-blue-600 text-white border-blue-600 translate-y-[1px]' : 'bg-white text-gray-500 hover:bg-gray-100 border-transparent'}`}>
                           {std.name.length > 20 ? std.name.substring(0, 20) + '...' : std.name}
                        </button>
                    ))}
                </div>

                <div className="space-y-8 min-h-[500px]">
                    {dataTree.filter(std => std.id === activeTab).map(std => (
                        <div key={std.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden animate-fade-in">
                            <div className="bg-blue-50 px-6 py-4 border-b border-blue-100"><h2 className="text-lg font-bold text-blue-800">{std.name}</h2></div>
                            <div className="divide-y divide-gray-100">
                                {std.indicators.map((ind: any) => (
                                    <div key={ind.id} className="p-6">
                                        <div className="flex justify-between items-start mb-6 pb-4 border-b">
                                            <h3 className="font-semibold text-gray-800 text-lg"><span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm mr-2">{ind.code}</span>{ind.name}</h3>
                                            <button 
                                                onClick={() => { setSelectedIndicator(ind); setTopicTitle(''); setTopicDesc(''); setShowTopicModal(true) }} 
                                                className="bg-purple-600 text-white px-3 py-1.5 rounded text-sm hover:bg-purple-700 shadow-sm flex items-center gap-1"
                                            >
                                                + เพิ่มหัวข้อหลัก
                                            </button>
                                        </div>

                                        <div className="space-y-6 ml-2">
                                            {ind.topics?.length > 0 ? ind.topics.map((topic: any) => (
                                                <div key={topic.id} className="bg-gray-50 rounded-lg border border-gray-300 p-4 relative">
                                                    
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-gray-800 text-lg flex items-center gap-2">
                                                                📌 {topic.title}
                                                                <button onClick={() => { setEditingTopicId(topic.id); setTopicTitle(topic.title); setTopicDesc(topic.description || ''); setShowEditTopicModal(true) }} className="text-gray-400 hover:text-blue-600 text-sm">✎</button>
                                                                <button onClick={() => deleteTopic(topic.id)} className="text-gray-400 hover:text-red-600 text-sm">✕</button>
                                                            </h4>
                                                            {topic.description && <p className="text-gray-500 text-sm mt-1 ml-6">{topic.description}</p>}
                                                        </div>
                                                        <button 
                                                            onClick={() => { setSelectedIndicator(ind); setSelectedTopic(topic); setActTitle(''); setActDesc(''); setShowActivityModal(true) }}
                                                            className="bg-white border border-green-600 text-green-600 px-3 py-1 rounded text-sm hover:bg-green-50 font-bold ml-4"
                                                        >
                                                            + เพิ่มหัวข้อย่อย
                                                        </button>
                                                    </div>

                                                    <div className="space-y-3 pl-4 border-l-2 border-gray-300">
                                                        {topic.activities?.map((act: any, index: number) => (
                                                            <div key={act.id} className="bg-white rounded border border-gray-200 p-4 relative group hover:shadow-sm transition">
                                                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition z-10">
                                                                    <button onClick={() => openEditActivity(act)} className="text-blue-500 hover:text-blue-700 bg-gray-50 px-2 py-1 rounded border shadow-sm text-xs">✏️ แก้ไข</button>
                                                                    <button onClick={() => deleteActivity(act.id)} className="text-red-500 hover:text-red-700 bg-gray-50 px-2 py-1 rounded border shadow-sm text-xs">🗑️ ลบ</button>
                                                                </div>

                                                                <div className="flex items-start gap-3 mb-2 pr-20">
                                                                    <div className="flex flex-col gap-1 mt-1">
                                                                        {index > 0 && <button onClick={() => handleMoveActivity(act, 'up', topic.activities)} disabled={processingOrder} className="bg-gray-50 border border-gray-200 rounded hover:bg-blue-50 text-xs w-6 h-6 flex items-center justify-center text-gray-500 hover:text-blue-600">🔼</button>}
                                                                        {index < topic.activities.length - 1 && <button onClick={() => handleMoveActivity(act, 'down', topic.activities)} disabled={processingOrder} className="bg-gray-50 border border-gray-200 rounded hover:bg-blue-50 text-xs w-6 h-6 flex items-center justify-center text-gray-500 hover:text-blue-600">🔽</button>}
                                                                    </div>
                                                                    <div className="flex-1">
                                                                        <h5 className="font-bold text-gray-900 text-base flex items-center gap-2">🔹 {act.title}</h5>
                                                                        {act.description && <p className="text-gray-500 text-sm mb-2">{act.description}</p>}
                                                                    </div>
                                                                </div>
                                                                
                                                                <div className="bg-gray-50 rounded border border-gray-200 p-2 mb-2 ml-9">
                                                                    {act.documents?.length > 0 ? (
                                                                        <div className="space-y-2">
                                                                            {act.documents.map((doc: any) => (
                                                                                <div key={doc.id} className="border-b last:border-0 pb-2 mb-2 border-gray-200">
                                                                                    <div className="flex justify-between items-center text-sm">
                                                                                        <div className="flex items-center gap-2 flex-1 flex-wrap">
                                                                                            <span className="text-lg">{doc.doc_type === 'link' ? '🔗' : doc.doc_type === 'album' ? '🖼️' : '📄'}</span>
                                                                                            {editingDocId === doc.id ? (
                                                                                                <div className="flex gap-1 items-center"><input value={editDocTitle} onChange={e => setEditDocTitle(e.target.value)} className="border px-2 py-1 rounded text-gray-900 text-sm" autoFocus /><button onClick={() => saveEditDoc(doc.id)} className="text-green-600 p-1">✅</button><button onClick={() => setEditingDocId(null)} className="text-red-500 p-1">❌</button></div>
                                                                                            ) : (
                                                                                                <div className="flex items-center gap-2 group/doc"><span className="font-medium text-gray-700">{doc.title}</span><button onClick={() => startEditDoc(doc)} className="opacity-0 group-hover/doc:opacity-100 text-gray-400 hover:text-blue-500 transition-opacity px-1">✎</button></div>
                                                                                            )}
                                                                                            {doc.doc_type !== 'album' && <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="ml-2 flex items-center gap-1 text-xs bg-blue-50 text-blue-600 border border-blue-100 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors">{doc.doc_type === 'link' ? 'เปิดลิงก์' : 'เปิดไฟล์'}</a>}
                                                                                        </div>
                                                                                        <div className="flex gap-2 items-center ml-2">
                                                                                            {doc.doc_type === 'album' && <button onClick={() => toggleAlbum(doc.id)} className={`text-xs px-3 py-1 rounded transition-colors border ${expandedAlbums[doc.id] ? 'bg-gray-200 text-gray-600' : 'bg-white border-purple-200 text-purple-600 hover:bg-purple-50'}`}>{expandedAlbums[doc.id] ? 'หุบรูป' : 'ดูรูป'}</button>}
                                                                                            <button onClick={() => deleteDoc(doc.id)} className="text-red-400 hover:text-red-600 px-2 py-1 rounded text-xs">✕ ลบ</button>
                                                                                        </div>
                                                                                    </div>
                                                                                    {doc.doc_type === 'album' && expandedAlbums[doc.id] && doc.gallery && (
                                                                                        <div className="mt-3 p-3 bg-white rounded border border-gray-200">
                                                                                            <div className="grid grid-cols-4 md:grid-cols-6 lg:grid-cols-10 gap-2">
                                                                                                {doc.gallery.map((url: string, idx: number) => (
                                                                                                    <div key={idx} className="relative group/img aspect-square rounded overflow-hidden border border-gray-200">
                                                                                                        <a href={url} target="_blank" className="block w-full h-full"><img src={url} className="w-full h-full object-cover" /></a>
                                                                                                        <button onClick={() => handleRemoveFromAlbum(doc.id, doc.gallery, idx)} className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center text-xs shadow hover:bg-red-700" title="ลบรูป">✕</button>
                                                                                                    </div>
                                                                                                ))}
                                                                                                <label className="flex flex-col items-center justify-center aspect-square border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-blue-50 hover:border-blue-400 transition text-gray-400 hover:text-blue-600 bg-white"><span className="text-xl font-bold">+</span><input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleAddToAlbum(doc.id, doc.gallery, e)} /></label>
                                                                                            </div>
                                                                                        </div>
                                                                                    )}
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : <p className="text-gray-400 text-xs text-center py-2">- ยังไม่มีไฟล์ -</p>}
                                                                </div>
                                                                {/* ⭐ FIX HERE: ใส่ setSelectedIndicator(ind) เข้าไป */}
                                                                <button onClick={() => { setSelectedIndicator(ind); setSelectedActivity(act); setDocTitle(''); setShowUploadModal(true) }} className="text-sm text-blue-600 font-medium ml-9 hover:underline">⬆ แนบไฟล์เพิ่ม</button>
                                                            </div>
                                                        ))}
                                                        {topic.activities?.length === 0 && <p className="text-gray-400 text-sm italic py-2">ยังไม่มีหัวข้อย่อย</p>}
                                                    </div>
                                                </div>
                                            )) : (
                                                <div className="text-center py-8 bg-gray-50 border-2 border-dashed border-gray-200 rounded-lg">
                                                    <p className="text-gray-400 mb-2">ยังไม่มีหัวข้อหลัก</p>
                                                    <button onClick={() => { setSelectedIndicator(ind); setTopicTitle(''); setShowTopicModal(true) }} className="text-purple-600 font-bold hover:underline">สร้างหัวข้อหลักใหม่</button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </>
        )}

        {/* MODAL 1: Create Topic */}
        {showTopicModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl border-t-4 border-purple-600">
                    <h3 className="text-xl font-bold mb-4">สร้างหัวข้อหลักใหม่</h3>
                    <form onSubmit={handleCreateTopic} className="space-y-4">
                        <div><label className="block text-sm font-bold text-gray-700">ชื่อหัวข้อหลัก</label><input autoFocus value={topicTitle} onChange={e => setTopicTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" placeholder="เช่น ด้านคุณภาพผู้เรียน..." required /></div>
                        <div><label className="block text-sm font-bold text-gray-700">คำบรรยายสั้นๆ</label><textarea value={topicDesc} onChange={e => setTopicDesc(e.target.value)} className="w-full border p-2 rounded text-gray-900" rows={2} placeholder="เช่น ผลสัมฤทธิ์ทางวิชาการ..." /></div>
                        <div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowTopicModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" disabled={uploading} className="px-4 py-2 bg-purple-600 text-white rounded font-bold">สร้างหัวข้อ</button></div>
                    </form>
                </div>
            </div>
        )}

        {/* MODAL 1.5: Edit Topic */}
        {showEditTopicModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                <div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl">
                    <h3 className="text-xl font-bold mb-4">แก้ไขหัวข้อหลัก</h3>
                    <form onSubmit={handleUpdateTopic} className="space-y-4">
                        <div><label className="block text-sm font-bold text-gray-700">ชื่อหัวข้อหลัก</label><input autoFocus value={topicTitle} onChange={e => setTopicTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" required /></div>
                        <div><label className="block text-sm font-bold text-gray-700">คำบรรยายสั้นๆ</label><textarea value={topicDesc} onChange={e => setTopicDesc(e.target.value)} className="w-full border p-2 rounded text-gray-900" rows={2} /></div>
                        <div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowEditTopicModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">บันทึก</button></div>
                    </form>
                </div>
            </div>
        )}

        {/* Modal อื่นๆ (ย่อ) */}
        {showActivityModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl border-t-4 border-green-600"><h3 className="text-xl font-bold mb-2">เพิ่มหัวข้อย่อย</h3><p className="text-sm text-gray-500 mb-4">ภายใต้หัวข้อ: <strong>{selectedTopic?.title}</strong></p><form onSubmit={handleCreateActivity} className="space-y-4"><div><label className="block text-sm font-bold text-gray-700">ชื่อหัวข้อย่อย</label><input autoFocus value={actTitle} onChange={e => setActTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" placeholder="เช่น โครงการรักการอ่าน..." required /></div><div><label className="block text-sm font-bold text-gray-700">คำบรรยาย (ถ้ามี)</label><textarea value={actDesc} onChange={e => setActDesc(e.target.value)} className="w-full border p-2 rounded text-gray-900" rows={3} /></div><div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowActivityModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" disabled={uploading} className="px-4 py-2 bg-green-600 text-white rounded font-bold">บันทึก</button></div></form></div></div>
        )}
        {showEditActivityModal && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl"><h3 className="text-xl font-bold mb-4">แก้ไขข้อมูล</h3><form onSubmit={handleUpdateActivity} className="space-y-4"><div><label className="block text-sm font-bold text-gray-700">ชื่อรายการ</label><input autoFocus value={actTitle} onChange={e => setActTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" required /></div><div><label className="block text-sm font-bold text-gray-700">คำบรรยาย</label><textarea value={actDesc} onChange={e => setActDesc(e.target.value)} className="w-full border p-2 rounded text-gray-900" rows={3} /></div><div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowEditActivityModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" disabled={uploading} className="px-4 py-2 bg-blue-600 text-white rounded font-bold">บันทึก</button></div></form></div></div>
        )}
        {showUploadModal && (
             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"><div className="bg-white p-6 rounded-lg w-full max-w-md shadow-xl"><h3 className="text-xl font-bold mb-2">แนบไฟล์</h3><p className="text-sm text-blue-600 mb-4 font-semibold">ในหัวข้อ: {selectedActivity?.title}</p><form onSubmit={handleUpload} className="space-y-4"><div className="flex gap-4 border-b pb-2"><label className="cursor-pointer flex gap-1"><input type="radio" checked={uploadType === 'pdf'} onChange={() => setUploadType('pdf')} /> PDF</label><label className="cursor-pointer flex gap-1"><input type="radio" checked={uploadType === 'album'} onChange={() => setUploadType('album')} /> อัลบั้ม</label><label className="cursor-pointer flex gap-1"><input type="radio" checked={uploadType === 'link'} onChange={() => setUploadType('link')} /> ลิงก์</label></div><div><label className="block text-sm font-bold text-gray-700">ชื่อเอกสาร</label><input value={docTitle} onChange={e => setDocTitle(e.target.value)} className="w-full border p-2 rounded text-gray-900" required /></div>{uploadType === 'pdf' && <input type="file" accept="application/pdf" onChange={e => setFile(e.target.files?.[0] || null)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer border border-gray-300 rounded-lg p-1" required />}{uploadType === 'album' && <input type="file" accept="image/*" multiple onChange={e => setImages(e.target.files)} className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-purple-50 file:text-purple-700 hover:file:bg-purple-100 cursor-pointer border border-gray-300 rounded-lg p-1" required />}{uploadType === 'link' && <input type="url" value={linkUrl} onChange={e => setLinkUrl(e.target.value)} className="w-full border p-2 rounded" placeholder="https://..." />}<div className="flex gap-2 justify-end mt-4"><button type="button" onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-gray-600">ยกเลิก</button><button type="submit" disabled={uploading} className={`px-4 py-2 text-white rounded font-bold ${uploading ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}>{uploading ? '⏳ กำลังอัปโหลด...' : 'ยืนยัน'}</button></div></form></div></div>
        )}
      </div>
    </div>
  )
}