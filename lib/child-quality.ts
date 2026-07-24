export type ChildQualityResult = {
  id: number
  year: number
  category_code: string
  category_name: string
  target: number
  result: number
  display_order: number
}

export const CHILD_QUALITY_CATEGORIES = [
  { code: 'physical', name: 'ด้านร่างกาย' },
  { code: 'intellectual', name: 'ด้านสติปัญญา' },
  { code: 'language', name: 'ด้านภาษาและการสื่อสาร' },
  { code: 'emotional', name: 'ด้านอารมณ์และจิตใจ' },
  { code: 'social', name: 'ด้านสังคมและคุณธรรม' },
] as const
