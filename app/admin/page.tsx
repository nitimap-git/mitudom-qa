"use client"

import { useState, useEffect, Fragment } from 'react'
import { supabase } from '@/lib/supabase'
import { useRouter } from 'next/navigation'

export default function AdminDashboard() {
  const router = useRouter()
  
  // Security Check
  useEffect(() => {
    const isLoggedIn = sessionStorage.getItem('isLoggedIn')
    if (!isLoggedIn) {
      router.push('/login')
    }
  }, [router])

  const handleLogout = () => {
    sessionStorage.removeItem('isLoggedIn')
    router.push('/login')
  }

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
  const [expandedAlbums, setExpandedAlbums] = useState<Record<string, boolean>>({})

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

  // --- Helper: ฟังก์ชันตั้งชื่อไฟล์ใหม่ให้ปลอดภัย (แก้ปัญหาภาษาไทย) ---
  const getSafeFileName = (originalName: string, prefix: string) => {
    const ext = originalName.split('.').pop() // ดึงนามสกุลไฟล์ (jpg, png)
    const randomString = Math.random().toString(36).substring(2, 10) // สุ่มตัวเลข
    // ผลลัพธ์จะเป็น: album-1788888-xr5z1.jpg (ไม่มีภาษาไทยแล้ว)
    return `${prefix}-${Date.now()}-${randomString}.${ext}`
  }

  // 2. Main Upload Function
  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    setUploading(true)
    setMessage('')

    try {
      if (!selectedIndicator || !title) throw new Error('กรุณากรอกข้อมูลให้ครบ')

      // CASE 1: PDF
      if (uploadType === 'pdf') {
        if (!file) throw new Error('กรุณาเลือกไฟล์ PDF')
        // ใช้ฟังก์ชันตั้งชื่อใหม่
        const fileName = getSafeFileName(file.name, 'pdf') 
        
        const { error: upErr } = await supabase.storage.from('school_docs').upload(fileName, file)
        if (upErr) throw upErr
        
        const { data: d } = supabase.storage.from('school_docs').getPublicUrl(fileName)
        await supabase.from('documents').insert({ title, indicator_id: Number(selectedIndicator), file_url: d.publicUrl, doc_type: 'pdf' })
      }
      // CASE 2: LINK
      else if (uploadType === 'link') {
        if (!linkUrl) throw new Error('กรุณาวางลิงก์')
        await supabase.from('documents').insert({ title, indicator_id: Number(selectedIndicator), file_url: linkUrl, doc_type: 'link' })
      }
      // CASE 3: ALBUM
      else if (uploadType === 'album') {
        if (!images || images.length === 0) throw new Error('กรุณาเลือกรูปภาพ')
        if (images.length > 20) throw new Error('เลือกได้สูงสุด 20 รูป') // ปรับเพิ่มให้หน่อยเผื่ออยากลงเยอะ
        
        const imageUrls: string[] = []
        for (let i = 0; i < images.length; i++) {
          const img = images[i]
          // ใช้ฟังก์ชันตั้งชื่อใหม่
          const fileName = getSafeFileName(img.name, `album-${i}`)

          const { error } = await supabase.storage.from('school_docs').upload(fileName, img)
          if (error) throw error
          const { data } = supabase.storage.from('school_docs').getPublicUrl(fileName)
          imageUrls.push(data.publicUrl)
        }
        await supabase.from('documents').insert({ title, indicator_id: Number(selectedIndicator), doc_type: 'album', file_url: imageUrls[0], gallery: imageUrls })
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

  // Manage Album Functions
  const handleAddToAlbum = async (docId: string, currentGallery: string[], newFiles: FileList) => {
    if (!newFiles || !confirm(`ยืนยันเพิ่มรูป ${newFiles.length} รูป?`)) return
    try {
      const newUrls: string[] = []
      for (let i = 0; i < newFiles.length; i++) {
        const img = newFiles[i]
        
        // --- แก้ไขจุดนี้: ใช้ชื่อภาษาอังกฤษเท่านั้น ---
        const fileName = getSafeFileName(img.name, `add-${i}`)
        // ----------------------------------------

        const { error } = await supabase.storage.from('school_docs').upload(fileName, img)
        if (error) throw error
        const { data } = supabase.storage.from('school_docs').getPublicUrl(fileName)
        newUrls.push(data.publicUrl)
      }
      const updatedGallery = [...(currentGallery || []), ...newUrls]
      await supabase.from('documents').update({ gallery: updatedGallery, file_url: updatedGallery[0] }).eq('id', docId)
      alert('✅ เพิ่มรูปเรียบร้อย'); fetchData()
    } catch (err: any) { alert(`❌ เกิดข้อผิดพลาด: ${err.message}`) }
  }

  const handleRemoveFromAlbum = async (docId: string, currentGallery: string[], indexToRemove: number) => {
    if (!confirm('ลบรูปนี้?')) return
    try {
      const updatedGallery = currentGallery.filter((_, idx) => idx !== indexToRemove)
      if (updatedGallery.length === 0 && confirm('รูปหมดแล้ว ลบอัลบั้มเลยไหม?')) {
        await supabase.from('documents').delete().eq('id', docId)
      } else {
        await supabase.from('documents').update({ gallery: updatedGallery, file_url: updatedGallery.length > 0 ? updatedGallery[0] : '' }).eq('id', docId)
      }
      fetchData()
    } catch (err: any) { alert(`❌ ลบไม่สำเร็จ`) }
  }

  const handleDelete = async (docId: string) => { if (confirm('ยืนยันลบ?')) { await supabase.from('documents').delete().eq('id', docId); fetchData() } }
  const startEdit = (doc: any) => { setEditingId(doc.id); setEditTitle(doc.title) }
  const cancelEdit = () => { setEditingId(null); setEditTitle('') }
  const saveEdit = async (docId: string) => { await supabase.from('documents').update({ title: editTitle }).eq('id', docId); setEditingId(null); fetchData() }
  const toggleAlbum = (docId: string) => { setExpandedAlbums(prev => ({ ...prev, [docId]: !prev[docId] })) }
  const getIcon = (type: string) => { if (type === 'link') return '🔗'; if (type === 'album') return '🖼️'; return '📄' }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-blue-900">⚙️ จัดการเอกสาร (Admin)</h1>
            <p className="text-gray-600">โรงเรียนอนุบาลมิตรอุดม</p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowUploadForm(!showUploadForm)} className={`px-4 py-2 rounded shadow font-bold transition ${showUploadForm ? 'bg-red-100 text-red-600' : 'bg-blue-600 text-white'}`}>
                {showUploadForm ? 'ปิดฟอร์ม' : '➕ เพิ่มเอกสาร'}
            </button>
            <button onClick={handleLogout} className="px-4 py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 font-bold">
                ออกจากระบบ
            </button>
          </div>
        </div>

        {/* Form */}
        {showUploadForm && (
           <div className="bg-white p-6 rounded-lg shadow-md mb-8 border border-blue-200">
             <div className="flex gap-4 mb-6 border-b pb-4">
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type" checked={uploadType === 'pdf'} onChange={() => setUploadType('pdf')} /><span className="font-bold text-gray-700">📄 PDF</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type" checked={uploadType === 'album'} onChange={() => setUploadType('album')} /><span className="font-bold text-gray-700">🖼️ อัลบั้มรูป</span></label>
              <label className="flex items-center gap-2 cursor-pointer"><input type="radio" name="type" checked={uploadType === 'link'} onChange={() => setUploadType('link')} /><span className="font-bold text-gray-700">🔗 ลิงก์</span></label>
            </div>
            <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-sm font-medium text-gray-700 mb-1">มาตรฐาน</label><select className="w-full p-2 border rounded text-gray-900" value={selectedStandard} onChange={(e) => setSelectedStandard(e.target.value)} required><option value="">-- เลือก --</option>{standards.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
              <div><label className="block text-sm font-medium text-gray-700 mb-1">ตัวบ่งชี้</label><select className="w-full p-2 border rounded text-gray-900" value={selectedIndicator} onChange={(e) => setSelectedIndicator(e.target.value)} disabled={!selectedStandard} required><option value="">-- เลือก --</option>{indicators.map((ind) => <option key={ind.id} value={ind.id}>{ind.code} {ind.name.substring(0, 30)}...</option>)}</select></div>
              
              <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">ชื่อรายการ</label><input type="text" className="w-full p-2 border rounded text-gray-900" value={title} onChange={(e) => setTitle(e.target.value)} required /></div>
              
              {uploadType === 'pdf' && <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">ไฟล์ PDF</label><input id="file-upload" type="file" accept="application/pdf" className="block w-full text-sm text-gray-900" onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)} required /></div>}
              {uploadType === 'album' && <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">รูปภาพ</label><input id="image-upload" type="file" accept="image/*" multiple className="block w-full text-sm text-gray-900" onChange={(e) => setImages(e.target.files)} required /></div>}
              {uploadType === 'link' && <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 mb-1">URL</label><input type="url" className="w-full p-2 border rounded text-gray-900" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} required /></div>}
              
              <div className="md:col-span-2 mt-2"><button type="submit" disabled={uploading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 rounded shadow">{uploading ? '⏳...' : 'บันทึก'}</button>{message && <p className="text-center mt-2 text-sm text-blue-600">{message}</p>}</div>
            </form>
          </div>
        )}

        {/* Table Display */}
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
                          <thead className="bg-gray-50 text-gray-600 border-b"><tr><th className="px-4 py-2 w-10">#</th><th className="px-4 py-2">รายการ</th><th className="px-4 py-2 w-48 text-center">จัดการ</th></tr></thead>
                          <tbody>
                            {ind.documents.map((doc: any) => (
                              <Fragment key={doc.id}>
                                <tr className="hover:bg-gray-50 border-b last:border-0">
                                  <td className="px-4 py-3 text-xl">{getIcon(doc.doc_type)}</td>
                                  <td className="px-4 py-3">
                                    {editingId === doc.id ? (
                                        <div className="flex gap-2">
                                            <input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="border rounded px-2 w-full text-gray-900" />
                                            <button onClick={() => saveEdit(doc.id)}>✅</button><button onClick={cancelEdit}>❌</button>
                                        </div> 
                                    ) : (
                                        <div className="flex items-center gap-2 group">
                                            <span className="text-gray-900 font-medium">{doc.title} {doc.doc_type === 'album' && doc.gallery && `(${doc.gallery.length} รูป)`}</span>
                                            <button onClick={() => startEdit(doc)} className="opacity-0 group-hover:opacity-100">✏️</button>
                                        </div>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-center flex justify-center gap-2">{doc.doc_type === 'album' ? <button onClick={() => toggleAlbum(doc.id)} className={`px-3 py-1 rounded text-xs font-bold ${expandedAlbums[doc.id] ? 'bg-gray-200 text-gray-700' : 'bg-green-100 text-green-700'}`}>{expandedAlbums[doc.id] ? '🔼 ปิด' : '🖼️ รูป'}</button> : <a href={doc.file_url} target="_blank" className="bg-sky-50 text-sky-600 px-3 py-1 rounded text-xs font-bold">เปิด</a>}<button onClick={() => handleDelete(doc.id)} className="bg-red-50 text-red-600 px-3 py-1 rounded text-xs font-bold">ลบ</button></td>
                                </tr>
                                {doc.doc_type === 'album' && expandedAlbums[doc.id] && doc.gallery && (
                                  <tr className="bg-gray-50 border-b"><td colSpan={3} className="p-4"><div className="grid grid-cols-2 md:grid-cols-5 gap-4">{doc.gallery.map((url: string, idx: number) => (<div key={idx} className="relative aspect-square"><img src={url} className="w-full h-full object-cover rounded border" /><button onClick={() => handleRemoveFromAlbum(doc.id, doc.gallery, idx)} className="absolute top-0 right-0 bg-red-600 text-white w-5 h-5 flex items-center justify-center text-xs rounded-full">✕</button></div>))}<label className="flex items-center justify-center aspect-square border-2 border-dashed rounded cursor-pointer hover:bg-blue-50">+<input type="file" accept="image/*" multiple className="hidden" onChange={(e) => handleAddToAlbum(doc.id, doc.gallery, e.target.files!)} /></label></div></td></tr>
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