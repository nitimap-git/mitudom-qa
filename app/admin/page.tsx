"use client"

import { useState, useEffect, Fragment } from 'react'
import { supabase } from '@/lib/supabase'

export default function AdminDashboard() {
  // --- Data State ---
  const [dataTree, setDataTree] = useState<any[]>([])
  const [loadingData, setLoadingData] = useState(true)

  // --- Upload Form State ---
  const [showUploadForm, setShowUploadForm] = useState(false)
  const [standards, setStandards] = useState<any[]>([])
  const [indicators, setIndicators] = useState<any[]>([])
  
  const [uploadType, setUploadType] = useState<'pdf' | 'album' | 'link'>('pdf')
  const [selectedStandard, setSelectedStandard] = useState('')
  const [selectedIndicator, setSelectedIndicator] = useState('')
  const [title, setTitle] = useState('')
  
  const [file, setFile] = useState<File | null>(null)
  const [images, setImages] = useState<FileList | null>(null)
  const [linkUrl, setLinkUrl] = useState('')

  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState('')

  // --- Edit & Manage State ---
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [expandedAlbums, setExpandedAlbums] = useState<Record<string, boolean>>({}) // เก็บสถานะการกางอัลบั้ม

  // 1. Fetch Data
  const fetchData = async () => {
    setLoadingData(true)
    try {
      const { data, error } = await supabase
        .from('standards')
        .select(`*, indicators (*, documents (*))`)
        .order('id')
      
      if (error) throw error
      
      const sortedData = data?.map((std: any) => ({
        ...std,
        indicators: std.indicators.sort((a: any, b: any) => a.code.localeCompare(b.code))
      }))

      setDataTree(sortedData || [])
      setStandards(sortedData || [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingData(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  useEffect(() => {
    if (selectedStandard) {
      const standard = standards.find((s) => s.id == selectedStandard)
      setIndicators(standard?.indicators || [])
    } else {
      setIndicators([])
    }
  }, [selectedStandard, standards])

  // 2. Main Upload Function (Create New)
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setMessage('')

    try {
      if (!selectedIndicator || !title) throw new Error('กรุณากรอกข้อมูลให้ครบ')

      // CASE 1: PDF
      if (uploadType === 'pdf') {
        if (!file) throw new Error('กรุณาเลือกไฟล์ PDF')
        const fileName = `${Date.now()}-${file.name}`
        const { error: upErr } = await supabase.storage.from('school_docs').upload(fileName, file)
        if (upErr) throw upErr
        const { data: urlData } = supabase.storage.from('school_docs').getPublicUrl(fileName)

        await supabase.from('documents').insert({
          title, indicator_id: Number(selectedIndicator), file_url: urlData.publicUrl, doc_type: 'pdf'
        })
      }
      // CASE 2: LINK
      else if (uploadType === 'link') {
        if (!linkUrl) throw new Error('กรุณาวางลิงก์')
        await supabase.from('documents').insert({
          title, indicator_id: Number(selectedIndicator), file_url: linkUrl, doc_type: 'link'
        })
      }
      // CASE 3: ALBUM (Create New)
      else if (uploadType === 'album') {
        if (!images || images.length === 0) throw new Error('กรุณาเลือกรูปภาพ')
        if (images.length > 5) throw new Error('เลือกได้สูงสุด 5 รูปต่อครั้ง')

        const imageUrls: string[] = []

        for (let i = 0; i < images.length; i++) {
          const img = images[i]
          const fileName = `album-${Date.now()}-${i}-${img.name}`
          const { error: upErr } = await supabase.storage.from('school_docs').upload(fileName, img)
          if (upErr) throw upErr
          const { data: urlData } = supabase.storage.from('school_docs').getPublicUrl(fileName)
          imageUrls.push(urlData.publicUrl)
        }

        await supabase.from('documents').insert({
          title, indicator_id: Number(selectedIndicator), 
          doc_type: 'album', file_url: imageUrls[0], gallery: imageUrls
        })
      }

      setMessage('✅ บันทึกข้อมูลเรียบร้อย!')
      setTitle(''); setFile(null); setImages(null); setLinkUrl('')
      const fInput = document.getElementById('file-upload') as HTMLInputElement; if (fInput) fInput.value = ''
      const imgInput = document.getElementById('image-upload') as HTMLInputElement; if (imgInput) imgInput.value = ''
      
      fetchData()

    } catch (error: any) {
      setMessage(`❌ ผิดพลาด: ${error.message}`)
    } finally {
      setUploading(false)
    }
  }

  // --- 3. Manage Album Functions (เพิ่ม/ลบ รูปในอัลบั้มเดิม) ---

  // เพิ่มรูปเข้าอัลบั้มเดิม
  const handleAddToAlbum = async (docId: string, currentGallery: string[], newFiles: FileList) => {
    if (!newFiles || newFiles.length === 0) return
    if (!confirm(`ยืนยันเพิ่มรูป ${newFiles.length} รูป เข้าไปในอัลบั้มนี้?`)) return

    try {
      const newUrls: string[] = []
      // Upload
      for (let i = 0; i < newFiles.length; i++) {
        const img = newFiles[i]
        const fileName = `add-${Date.now()}-${i}-${img.name}`
        const { error } = await supabase.storage.from('school_docs').upload(fileName, img)
        if (error) throw error
        const { data } = supabase.storage.from('school_docs').getPublicUrl(fileName)
        newUrls.push(data.publicUrl)
      }

      // รวมรูปเก่า + รูปใหม่
      const updatedGallery = [...(currentGallery || []), ...newUrls]

      // Update Database
      const { error: dbError } = await supabase
        .from('documents')
        .update({ 
          gallery: updatedGallery,
          file_url: updatedGallery[0] // อัปเดตปกเป็นรูปแรกเสมอ กันเหนียว
        })
        .eq('id', docId)

      if (dbError) throw dbError
      alert('✅ เพิ่มรูปเรียบร้อย')
      fetchData()
    } catch (err: any) {
      alert(`❌ เกิดข้อผิดพลาด: ${err.message}`)
    }
  }

  // ลบรูปออกจากอัลบั้ม
  const handleRemoveFromAlbum = async (docId: string, currentGallery: string[], indexToRemove: number) => {
    if (!confirm('ต้องการลบรูปนี้ออกจากอัลบั้ม?')) return

    try {
      // ตัดรูปที่เลือกออก
      const updatedGallery = currentGallery.filter((_, idx) => idx !== indexToRemove)

      // ถ้าลบหมดเกลี้ยง? (เหลือ 0 รูป) -> อาจจะลบเอกสารทิ้งเลย หรือปล่อยเป็นอัลบั้มว่าง
      if (updatedGallery.length === 0) {
        if (confirm('รูปหมดแล้ว ต้องการลบอัลบั้มนี้ทิ้งเลยหรือไม่?')) {
          await supabase.from('documents').delete().eq('id', docId)
          fetchData()
          return
        }
      }

      // Update Database
      const { error } = await supabase
        .from('documents')
        .update({ 
          gallery: updatedGallery,
          file_url: updatedGallery.length > 0 ? updatedGallery[0] : '' // เปลี่ยนรูปปกใหม่ถ้าจำเป็น
        })
        .eq('id', docId)

      if (error) throw error
      fetchData() // รีโหลดหน้าจอ รูปจะหายไปทันที
    } catch (err: any) {
      alert(`❌ ลบไม่สำเร็จ: ${err.message}`)
    }
  }

  // --- 4. Other Helpers ---
  const handleDelete = async (docId: string) => {
    if (!confirm('ยืนยันการลบเอกสารนี้?')) return
    try {
      await supabase.from('documents').delete().eq('id', docId)
      fetchData()
    } catch (err) { alert('ลบไม่สำเร็จ') }
  }

  const startEdit = (doc: any) => { setEditingId(doc.id); setEditTitle(doc.title) }
  const cancelEdit = () => { setEditingId(null); setEditTitle('') }
  const saveEdit = async (docId: string) => {
    try {
      const { error } = await supabase.from('documents').update({ title: editTitle }).eq('id', docId)
      if (error) throw error
      setEditingId(null); fetchData()
    } catch (err) { alert('แก้ไขชื่อไม่สำเร็จ') }
  }

  const toggleAlbum = (docId: string) => {
    setExpandedAlbums(prev => ({ ...prev, [docId]: !prev[docId] }))
  }

  const getIcon = (type: string) => {
    if (type === 'link') return '🔗'
    if (type === 'album') return '🖼️'
    return '📄'
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">⚙️ จัดการเอกสาร (Admin)</h1>
            <p className="text-gray-600">โรงเรียนอนุบาลมิตรอุดม</p>
          </div>
          <button onClick={() => setShowUploadForm(!showUploadForm)}
            className={`px-4 py-2 rounded shadow font-bold transition ${showUploadForm ? 'bg-red-100 text-red-600' : 'bg-blue-600 text-white'}`}>
            {showUploadForm ? 'ปิดฟอร์ม' : '➕ เพิ่มเอกสารใหม่'}
          </button>
        </div>

        {/* --- Form Upload (Create New) --- */}
        {showUploadForm && (
          <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-blue-200">
             <div className="flex gap-4 mb-6 border-b pb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" checked={uploadType === 'pdf'} onChange={() => setUploadType('pdf')} />
                <span className="font-bold text-gray-700">📄 PDF</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" checked={uploadType === 'album'} onChange={() => setUploadType('album')} />
                <span className="font-bold text-gray-700">🖼️ อัลบั้มรูป</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" checked={uploadType === 'link'} onChange={() => setUploadType('link')} />
                <span className="font-bold text-gray-700">🔗 ลิงก์</span>
              </label>
            </div>

            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">มาตรฐาน</label>
                <select className="w-full p-2 border rounded text-gray-900 bg-white"
                  value={selectedStandard} onChange={(e) => setSelectedStandard(e.target.value)} required>
                  <option value="">-- เลือก --</option>
                  {standards.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">ตัวบ่งชี้</label>
                <select className="w-full p-2 border rounded text-gray-900 bg-white disabled:bg-gray-100"
                  value={selectedIndicator} onChange={(e) => setSelectedIndicator(e.target.value)} disabled={!selectedStandard} required>
                  <option value="">-- เลือก --</option>
                  {indicators.map((ind) => <option key={ind.id} value={ind.id}>{ind.code} {ind.name.substring(0, 30)}...</option>)}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">ชื่อรายการ</label>
                <input type="text" className="w-full p-2 border rounded text-gray-900"
                  placeholder="ชื่อเอกสาร / ชื่ออัลบั้ม" value={title} onChange={(e) => setTitle(e.target.value)} required />
              </div>
              {uploadType === 'pdf' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์ PDF</label>
                  <input id="file-upload" type="file" accept="application/pdf" className="block w-full text-sm text-gray-500"
                    onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} required />
                </div>
              )}
              {uploadType === 'album' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">เลือกรูปภาพ (สูงสุด 5 รูป)</label>
                  <input id="image-upload" type="file" accept="image/*" multiple className="block w-full text-sm text-gray-500"
                    onChange={(e) => setImages(e.target.files)} required />
                </div>
              )}
              {uploadType === 'link' && (
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">วางลิงก์ URL</label>
                  <input type="url" className="w-full p-2 border rounded text-gray-900" placeholder="https://..." value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required />
                </div>
              )}
              <div className="md:col-span-2 mt-2">
                <button type="submit" disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow transition">
                  {uploading ? '⏳ กำลังบันทึก...' : 'บันทึกข้อมูล'}
                </button>
                {message && <p className="text-center mt-2 text-sm text-blue-600">{message}</p>}
              </div>
            </form>
          </div>
        )}

        {/* --- Data List --- */}
        <div className="space-y-6">
            {dataTree.map((std) => (
              <div key={std.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-6 py-3 border-b border-gray-100"><h2 className="text-lg font-bold text-gray-800">{std.name}</h2></div>
                <div className="divide-y divide-gray-100">
                  {std.indicators.map((ind: any) => (
                    <div key={ind.id} className="p-6">
                      <h3 className="font-semibold text-gray-800 mb-4 text-sm"><span className="bg-blue-100 text-blue-800 px-2 py-1 rounded mr-2">{ind.code}</span>{ind.name}</h3>
                      {ind.documents?.length > 0 ? (
                        <table className="w-full text-sm text-left border rounded">
                          <thead className="bg-gray-50 text-gray-600 border-b">
                            <tr>
                              <th className="px-4 py-2 w-10">#</th>
                              <th className="px-4 py-2">รายการ</th>
                              <th className="px-4 py-2 w-48 text-center">จัดการ</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ind.documents.map((doc: any) => (
                              <Fragment key={doc.id}>
                                <tr className="hover:bg-gray-50 border-b last:border-0">
                                  <td className="px-4 py-3 text-xl">{getIcon(doc.doc_type)}</td>
                                  
                                  {/* Title Editing */}
                                  <td className="px-4 py-3">
                                    {editingId === doc.id ? (
                                      <div className="flex gap-2">
                                        <input type="text" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="border rounded px-2 py-1 text-gray-900 w-full" />
                                        <button onClick={() => saveEdit(doc.id)} className="text-green-600">✅</button>
                                        <button onClick={cancelEdit} className="text-red-500">❌</button>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-2 group">
                                        <span className="text-gray-700 font-medium">
                                          {doc.title}
                                          {doc.doc_type === 'album' && doc.gallery && <span className="ml-2 text-xs bg-gray-200 px-2 rounded-full">{doc.gallery.length} รูป</span>}
                                        </span>
                                        <button onClick={() => startEdit(doc)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-blue-600">✏️</button>
                                      </div>
                                    )}
                                  </td>

                                  {/* Manage Buttons */}
                                  <td className="px-4 py-3 text-center flex justify-center gap-2">
                                    {doc.doc_type === 'album' ? (
                                      <button onClick={() => toggleAlbum(doc.id)} 
                                        className={`px-3 py-1 rounded text-xs font-bold transition flex items-center gap-1 ${expandedAlbums[doc.id] ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700 hover:bg-green-200'}`}>
                                        {expandedAlbums[doc.id] ? '🔼 ปิด' : '🖼️ จัดการรูป'}
                                      </button>
                                    ) : (
                                      <a href={doc.file_url} target="_blank" className="bg-sky-50 text-sky-600 hover:bg-sky-100 px-3 py-1 rounded text-xs font-bold border border-sky-200">เปิด</a>
                                    )}
                                    <button onClick={() => handleDelete(doc.id)} className="bg-red-50 text-red-600 hover:bg-red-100 px-3 py-1 rounded text-xs font-bold border border-red-200">ลบ</button>
                                  </td>
                                </tr>

                                {/* --- Expanded Album Management Area --- */}
                                {doc.doc_type === 'album' && expandedAlbums[doc.id] && doc.gallery && (
                                  <tr className="bg-gray-50 border-b">
                                    <td colSpan={3} className="p-4">
                                      <div className="mb-2 text-xs text-gray-500 font-bold">จัดการรูปภาพในอัลบั้ม:</div>
                                      
                                      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        {/* 1. วนลูปโชว์รูปที่มีอยู่ พร้อมปุ่มลบ */}
                                        {doc.gallery.map((imgUrl: string, idx: number) => (
                                          <div key={idx} className="relative group aspect-square bg-gray-200 rounded overflow-hidden border">
                                            <img src={imgUrl} alt="gallery" className="w-full h-full object-cover" />
                                            {/* ปุ่มลบ (กากบาทแดง) */}
                                            <button 
                                              onClick={() => handleRemoveFromAlbum(doc.id, doc.gallery, idx)}
                                              className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs shadow hover:bg-red-700"
                                              title="ลบรูปนี้"
                                            >
                                              ✕
                                            </button>
                                          </div>
                                        ))}

                                        {/* 2. ปุ่มเพิ่มรูปใหม่ (กล่องสุดท้าย) */}
                                        <label className="flex flex-col items-center justify-center aspect-square bg-white border-2 border-dashed border-gray-300 rounded cursor-pointer hover:bg-blue-50 hover:border-blue-300 transition text-gray-400 hover:text-blue-500">
                                          <span className="text-2xl font-bold">+</span>
                                          <span className="text-xs font-medium">เพิ่มรูป</span>
                                          <input 
                                            type="file" 
                                            accept="image/*" 
                                            multiple 
                                            className="hidden"
                                            onChange={(e) => handleAddToAlbum(doc.id, doc.gallery, e.target.files!)}
                                          />
                                        </label>
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </Fragment>
                            ))}
                          </tbody>
                        </table>
                      ) : <div className="text-gray-400 text-xs italic">- ว่าง -</div>}
                    </div>
                  ))}
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  )
}


