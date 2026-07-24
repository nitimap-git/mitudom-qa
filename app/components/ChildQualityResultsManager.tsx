"use client"

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { CHILD_QUALITY_CATEGORIES, type ChildQualityResult } from '@/lib/child-quality'

export default function ChildQualityResultsManager() {
  const [rows, setRows] = useState<ChildQualityResult[]>([])
  const [year, setYear] = useState(new Date().getFullYear() + 543)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    const { data } = await supabase.from('child_quality_results').select('*').order('year', { ascending: false }).order('display_order')
    setRows((data || []) as ChildQualityResult[])
  }
  useEffect(() => { load() }, [])

  const addYear = async () => {
    if (rows.some(row => row.year === year)) return alert(`มีข้อมูลปี ${year} แล้ว`)
    setSaving(true)
    const payload = CHILD_QUALITY_CATEGORIES.map((category, index) => ({
      year,
      category_code: category.code,
      category_name: category.name,
      target: 0,
      result: 0,
      display_order: index + 1,
    }))
    const { error } = await supabase.from('child_quality_results').insert(payload)
    setSaving(false)
    if (error) return alert(error.message)
    await load()
  }

  const updateValue = (id: number, field: 'target' | 'result', value: string) => {
    setRows(current => current.map(row => row.id === id ? { ...row, [field]: Number(value) } : row))
  }

  const saveYear = async (selectedYear: number) => {
    setSaving(true)
    const selectedRows = rows.filter(row => row.year === selectedYear)
    for (const row of selectedRows) {
      const { error } = await supabase
        .from('child_quality_results')
        .update({ target: row.target, result: row.result, updated_at: new Date().toISOString() })
        .eq('id', row.id)
      if (error) {
        setSaving(false)
        return alert(error.message)
      }
    }
    setSaving(false)
    alert(`บันทึกข้อมูลปี ${selectedYear} เรียบร้อย`)
  }

  const years = [...new Set(rows.map(row => row.year))].sort((a, b) => b - a)

  return (
    <section className="border-b border-gray-200 bg-blue-50/60 p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <h3 className="text-lg font-bold text-blue-950">ผลลัพธ์คุณภาพของเด็กปฐมวัย</h3>
          <p className="mt-1 text-sm text-gray-600">เพิ่มปีใหม่หรือแก้ไขค่าเป้าหมายและผลการประเมิน</p>
        </div>
        <div className="flex items-end gap-2">
          <label className="text-sm font-medium text-gray-700">ปี พ.ศ.
            <input type="number" min="2500" max="2700" value={year} onChange={event => setYear(Number(event.target.value))} className="mt-1 block w-28 rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900" />
          </label>
          <button onClick={addYear} disabled={saving} className="rounded-lg bg-blue-700 px-4 py-2 font-bold text-white hover:bg-blue-800 disabled:bg-gray-400">+ เพิ่มปี</button>
        </div>
      </div>

      <div className="mt-6 space-y-4">
        {years.map(selectedYear => (
          <details key={selectedYear} open={selectedYear === years[0]} className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <summary className="cursor-pointer px-4 py-3 font-bold text-gray-800">ปี {selectedYear}</summary>
            <div className="overflow-x-auto border-t border-gray-100 p-4">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-left text-gray-600"><th className="pb-2">ด้านพัฒนาการ</th><th className="w-36 pb-2 text-center">เป้าหมาย</th><th className="w-36 pb-2 text-center">ผลประเมิน</th></tr></thead>
                <tbody className="divide-y divide-gray-100">
                  {rows.filter(row => row.year === selectedYear).map(row => (
                    <tr key={row.id}>
                      <td className="py-2 font-medium text-gray-800">{row.category_name}</td>
                      <td className="p-2"><input type="number" min="0" max="100" step="0.01" value={row.target} onChange={event => updateValue(row.id, 'target', event.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 text-center text-gray-900" /></td>
                      <td className="p-2"><input type="number" min="0" max="100" step="0.01" value={row.result} onChange={event => updateValue(row.id, 'result', event.target.value)} className="w-full rounded border border-gray-300 px-2 py-1.5 text-center text-gray-900" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-3 flex justify-end"><button onClick={() => saveYear(selectedYear)} disabled={saving} className="rounded-lg bg-green-700 px-4 py-2 font-bold text-white hover:bg-green-800 disabled:bg-gray-400">{saving ? 'กำลังบันทึก...' : `บันทึกปี ${selectedYear}`}</button></div>
            </div>
          </details>
        ))}
      </div>
    </section>
  )
}
