import type { Platform } from './api'

/** 从输入字符串解析 ID 列表：支持半角/全角逗号、空格、换行 */
export function parseIdsFromInput(input: string): string[] {
  return input
    .split(/[\n\s,，]+/)
    .map((s) => s.trim())
    .filter(Boolean)
}

/** 将 ID 列表规范化为半角逗号分隔的字符串（用于写回输入框与 URL） */
export function normalizeIdsToCommaSeparated(ids: string[]): string {
  return ids.join(',')
}

export function parseIdsFromSearch(): string[] {
  const sp = new URLSearchParams(window.location.search)
  const ids = sp.get('ids')
  if (ids) return ids.split(/[,，\s]+/).map((s) => s.trim()).filter(Boolean)
  return []
}

export function parsePlatformFromSearch(): Platform {
  const p = new URLSearchParams(window.location.search).get('platform')
  if (p === 'huaban' || p === 'gaoding') return p
  return 'gaoding'
}

export function setUrlParams(ids: string[], platform: Platform) {
  const u = new URL(window.location.href)
  if (ids.length) u.searchParams.set('ids', ids.join(','))
  else u.searchParams.delete('ids')
  u.searchParams.set('platform', platform)
  window.history.replaceState({}, '', u.toString())
}

/** 列表卡片用小图：通过 OSS 参数缩图 */
const OSS_THUMB_SUFFIX =
  (import.meta.env.VITE_OSS_THUMB_SUFFIX as string | undefined)?.trim() ||
  'image/resize,w_200/interlace,1,image/format,webp'

export function getThumbUrl(imageUrl: string): string {
  if (!imageUrl || !/^https?:\/\//i.test(imageUrl)) return imageUrl
  const separator = imageUrl.includes('?') ? '&' : '?'
  return `${imageUrl}${separator}x-oss-process=${OSS_THUMB_SUFFIX}`
}

/** 卡片展示用：去掉 title 里开头的 【id 】，只保留名称 */
export function displayTitle(title: string, id: string): string {
  return (
    title
      .replace(
        new RegExp(`^【\\s*${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[\\]】]\\s*`),
        '',
      )
      .trim() || title
  )
}

/** 花瓣：从标题中剥离 pin_id：数字，返回展示用标题和 pin_id（若有） */
export function stripPinIdFromTitle(title: string): { displayTitle: string; pinId?: string } {
  const match = title.match(/^pin_id[：:]\s*(\d+)\s*(.*)/s)
  if (match) {
    const pinId = match[1]
    const rest = match[2].trim()
    return { displayTitle: rest || title, pinId }
  }
  const anyMatch = title.match(/pin_id[：:]\s*(\d+)/)
  if (anyMatch) {
    const pinId = anyMatch[1]
    const displayTitle = title.replace(/pin_id[：:]\s*\d+\s*/g, '').trim()
    return { displayTitle: displayTitle || title, pinId }
  }
  return { displayTitle: title }
}

const PREFS_KEY = 'show_contents_prefs'

export type StoredPrefs = {
  theme?: 'dark' | 'light'
  platform?: Platform
  cardSize?: number
  manualOrderIds?: string[]
  /** 稿定 / 花瓣 输入框内容各自保存，切换平台互不影响 */
  idsInputGaoding?: string
  idsInputHuaban?: string
}

export function loadStoredPrefs(): StoredPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as StoredPrefs
    return {
      theme: parsed.theme === 'light' ? 'light' : parsed.theme === 'dark' ? 'dark' : undefined,
      platform: parsed.platform === 'huaban' || parsed.platform === 'gaoding' ? parsed.platform : undefined,
      cardSize:
        typeof parsed.cardSize === 'number' && parsed.cardSize >= 120 && parsed.cardSize <= 280
          ? parsed.cardSize
          : undefined,
      manualOrderIds: Array.isArray(parsed.manualOrderIds)
        ? parsed.manualOrderIds.filter((id) => typeof id === 'string')
        : undefined,
      idsInputGaoding: typeof parsed.idsInputGaoding === 'string' ? parsed.idsInputGaoding : undefined,
      idsInputHuaban: typeof parsed.idsInputHuaban === 'string' ? parsed.idsInputHuaban : undefined,
    }
  } catch {
    return {}
  }
}

export function saveStoredPrefs(prefs: StoredPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore
  }
}
