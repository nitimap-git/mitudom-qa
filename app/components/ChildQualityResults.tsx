"use client"

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ChildQualityResult } from '@/lib/child-quality'

export default function ChildQualityResults() {
  const [rows, setRows] = useState<ChildQualityResult[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const { data, error } = await supabase
        .from('child_quality_results')
        .select('*')
        .order('year', { ascending: false })
        .order('display_order')

      if (!error) setRows((data || []) as ChildQualityResult[])
      setLoading(false)
    }
    load()
  }, [])

  const years = useMemo(
    () => [...new Set(rows.map(row => row.year))].sort((a, b) => b - a).slice(0, 3).sort(),
    [rows]
  )
  const visibleRows = rows.filter(row => years.includes(row.year))
  const categories = [...new Map(
    visibleRows
      .sort((a, b) => a.display_order - b.display_order)
      .map(row => [row.category_code, row])
  ).values()]
  const averages = years.map(year => {
    const yearRows = visibleRows.filter(row => row.year === year)
    const average = (key: 'target' | 'result') =>
      yearRows.length ? yearRows.reduce((sum, row) => sum + Number(row[key]), 0) / yearRows.length : 0
    return { year, target: average('target'), result: average('result') }
  })

  if (loading) return <div className="mb-10 rounded-xl bg-white p-6 text-gray-500">กำลังโหลดผลลัพธ์...</div>
  if (!rows.length) return null

  return (
    <section className="mb-10 overflow-hidden rounded-xl bg-white shadow-sm">
      <div className="border-b border-gray-200 px-5 py-5 md:px-6">
        <h2 className="text-xl font-bold text-gray-900">ผลลัพธ์คุณภาพของเด็กปฐมวัย</h2>
        <p className="mt-1 text-sm text-gray-600">เปรียบเทียบเป้าหมายและผลการประเมิน 3 ปีล่าสุด</p>
      </div>

      <div className="grid gap-6 p-5 md:grid-cols-[minmax(0,1fr)_280px] md:p-6">
        <div className="overflow-x-auto rounded-lg border border-gray-200">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="bg-blue-700 text-white">
                <th rowSpan={2} className="px-4 py-3 text-left">พัฒนาการเด็ก</th>
                {years.map(year => <th key={year} colSpan={2} className="border-l border-blue-600 px-3 py-2 text-center">ปี {year}</th>)}
              </tr>
              <tr className="bg-blue-50 text-blue-950">
                {years.flatMap(year => [
                  <th key={`${year}-target`} className="border-l border-gray-200 px-3 py-2 text-center">เป้าหมาย</th>,
                  <th key={`${year}-result`} className="border-l border-gray-200 px-3 py-2 text-center">ผลประเมิน</th>,
                ])}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categories.map((category, index) => (
                <tr key={category.category_code} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{index + 1}. {category.category_name}</td>
                  {years.flatMap(year => {
                    const value = visibleRows.find(row => row.year === year && row.category_code === category.category_code)
                    return [
                      <td key={`${category.category_code}-${year}-target`} className="border-l border-gray-100 px-3 py-3 text-center text-gray-600">{value?.target ?? '–'}</td>,
                      <td key={`${category.category_code}-${year}-result`} className={`border-l border-gray-100 px-3 py-3 text-center font-bold ${value && Number(value.result) >= Number(value.target) ? 'text-green-700' : 'text-red-600'}`}>{value?.result ?? '–'}</td>,
                    ]
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div>
          <h3 className="font-bold text-gray-800">ค่าเฉลี่ยรายปี</h3>
          <div className="mt-4 space-y-5">
            {averages.map(item => (
              <div key={item.year}>
                <div className="mb-2 flex justify-between text-sm"><span className="font-semibold">ปี {item.year}</span><span className="text-gray-500">{item.result.toFixed(2)}%</span></div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-14">เป้าหมาย</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-gray-100"><div className="h-full bg-gray-400" style={{ width: `${item.target}%` }} /></div></div>
                  <div className="flex items-center gap-2 text-xs text-gray-600"><span className="w-14">ผลจริง</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-blue-100"><div className="h-full bg-blue-600" style={{ width: `${item.result}%` }} /></div></div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 flex gap-4 border-t border-gray-100 pt-4 text-xs text-gray-600">
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-gray-400" />เป้าหมาย</span>
            <span className="flex items-center gap-1.5"><i className="h-2.5 w-2.5 rounded-full bg-blue-600" />ผลประเมิน</span>
          </div>
        </div>
      </div>
    </section>
  )
}
