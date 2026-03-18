/**
 * 兼容多种后端返回结构：从 JSON 里抽出「列表」和每条里的 id / 预览图 URL。
 * 说明：部分内网地址整页是 HTML（浏览器直接打开的预览页），需从 HTML 内嵌 JSON 或 DOM 解析。
 */
const IMAGE_KEYS = [
  'previewUrl',
  'preview_url',
  'image',
  'imageUrl',
  'image_url',
  'thumb',
  'thumbnail',
  'cover',
  'pic',
  'url',
  'img',
]

function isHttpUrl(s: unknown): s is string {
  return typeof s === 'string' && /^https?:\/\//i.test(s)
}

const THUMB_KEYS = ['thumb', 'thumbnail', 'thumbUrl', 'thumbnail_url', 'small']

function findImageInObject(obj: Record<string, unknown>, depth = 0): string | undefined {
  if (depth > 4) return undefined
  for (const k of IMAGE_KEYS) {
    const v = obj[k]
    if (isHttpUrl(v)) return v
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = findImageInObject(v as Record<string, unknown>, depth + 1)
      if (nested) return nested
    }
  }
  return undefined
}

function findThumbInObject(obj: Record<string, unknown>, depth = 0): string | undefined {
  if (depth > 4) return undefined
  for (const k of THUMB_KEYS) {
    const v = obj[k]
    if (isHttpUrl(v)) return v
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const nested = findThumbInObject(v as Record<string, unknown>, depth + 1)
      if (nested) return nested
    }
  }
  return undefined
}

function walkForJsonArray(obj: unknown, maxDepth = 6): unknown[] | null {
  if (maxDepth < 0) return null
  if (Array.isArray(obj)) {
    if (obj.length > 0 && typeof obj[0] === 'object' && obj[0] !== null && 'id' in (obj[0] as object)) {
      return obj
    }
    for (const el of obj) {
      const found = walkForJsonArray(el, maxDepth - 1)
      if (found?.length) return found
    }
    return null
  }
  if (obj && typeof obj === 'object') {
    for (const v of Object.values(obj as Record<string, unknown>)) {
      const found = walkForJsonArray(v, maxDepth - 1)
      if (found?.length) return found
    }
  }
  return null
}

/** 接口可能用来表示「内容名称」的字段，按优先级尝试 */
const TITLE_KEYS = [
  'title',
  'name',
  'templateName',
  'template_name',
  'contentName',
  'content_name',
  'label',
  'caption',
  'displayName',
  'display_name',
  '名称',
  'desc',
  'description',
]

/** 可能包含名称的嵌套对象 key，先在这些子对象里找 */
const TITLE_NESTED_KEYS = ['template', 'content', 'detail', 'info', 'data', 'base', 'item']

function isLikelyTitleString(s: string): boolean {
  const t = s.trim()
  if (!t || t.length > 500) return false
  if (/^https?:\/\//i.test(t)) return false
  if (/^\d+$/.test(t)) return false
  return true
}

/** 在对象及其嵌套对象中递归查找内容名称 */
function findTitleInObject(obj: Record<string, unknown>, depth = 0): string {
  if (depth > 4) return ''
  for (const k of TITLE_KEYS) {
    const v = obj[k]
    if (typeof v === 'string' && isLikelyTitleString(v)) return v.trim()
  }
  for (const k of Object.keys(obj)) {
    if (/name|title|label|caption|名称|标题/i.test(k)) {
      const v = obj[k]
      if (typeof v === 'string' && isLikelyTitleString(v)) return v.trim()
    }
  }
  for (const nestKey of TITLE_NESTED_KEYS) {
    const nested = obj[nestKey]
    if (nested && typeof nested === 'object' && !Array.isArray(nested)) {
      const found = findTitleInObject(nested as Record<string, unknown>, depth + 1)
      if (found) return found
    }
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      const found = findTitleInObject(v as Record<string, unknown>, depth + 1)
      if (found) return found
    }
  }
  return ''
}

function extractTitle(item: Record<string, unknown>): string {
  return findTitleInObject(item)
}

function extractId(item: Record<string, unknown>): string {
  const id =
    item.id ??
    item.contentId ??
    item.content_id ??
    item.templateId ??
    item.template_id
  if (id != null) return String(id)
  return ''
}

/** 从接口数据中识别是否为 UGC 内容（用于稿定大内容打开链接区分 materials-ugc / materials） */
function extractIsUgc(obj: Record<string, unknown>, depth = 0): boolean {
  if (depth > 3) return false
  const ugcKeys = ['isUgc', 'ugc', 'is_ugc', 'source_type', 'sourceType', 'content_type', 'contentType', 'contentBizType', 'content_biz_type']
  for (const k of ugcKeys) {
    const v = obj[k]
    if (v === true || v === 1 || (typeof v === 'string' && /ugc|UGC/i.test(v))) return true
  }
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (extractIsUgc(v as Record<string, unknown>, depth + 1)) return true
    }
  }
  return false
}

export type NormalizedItem = {
  id: string
  title: string
  /** 列表用小图（优先 thumb/thumbnail） */
  thumbUrl: string | undefined
  /** 弹窗用大图 */
  imageUrl: string | undefined
  /** 是否为 UGC 内容（稿定大内容打开用 materials-ugc / materials） */
  isUgc: boolean
  /** 花瓣：pin_id，从标题或 raw 提取，展示在内容ID下方 */
  pinId?: string
  /** 花瓣：版权素材（接口中内容ID为红色 #FF0000） */
  isCopyright?: boolean
  raw: Record<string, unknown>
}

function normalizeItem(item: unknown): NormalizedItem | null {
  if (!item || typeof item !== 'object') return null
  const o = item as Record<string, unknown>
  const id = extractId(o)
  let title = extractTitle(o) || (id ? `ID ${id}` : '')
  const imageUrl = findImageInObject(o)
  const thumbUrl = findThumbInObject(o)
  const isUgc = extractIsUgc(o)
  let pinId: string | undefined
  const pinIdMatch = title.match(/^pin_id[：:]\s*(\d+)\s*(.*)/s)
  if (pinIdMatch) {
    pinId = pinIdMatch[1]
    const rest = pinIdMatch[2].trim()
    if (rest) title = rest
  } else {
    const rawPin = o.pin_id ?? o.pinId
    if (rawPin != null) pinId = String(rawPin)
  }
  const isCopyright = extractIsCopyright(o)
  return {
    id: id || title || 'unknown',
    title: title || id,
    thumbUrl: thumbUrl || imageUrl,
    imageUrl: imageUrl || thumbUrl,
    isUgc,
    ...(pinId !== undefined && { pinId }),
    ...(isCopyright && { isCopyright: true }),
    raw: o,
  }
}

/** 花瓣：接口中内容ID为红色 #FF0000 表示版权素材；也识别布尔/类型字段 */
function extractIsCopyright(obj: Record<string, unknown>, depth = 0): boolean {
  if (depth > 4) return false
  const colorKeys = [
    'idColor',
    'id_color',
    'contentIdColor',
    'content_id_color',
    'idStyleColor',
    'color',
    'textColor',
    'text_color',
    '字体颜色',
    '颜色',
  ]
  for (const k of colorKeys) {
    const v = obj[k]
    if (typeof v === 'string') {
      const lower = v.toLowerCase().replace(/\s/g, '')
      if (lower === '#ff0000' || lower === 'ff0000' || lower === 'red' || lower.includes('255,0,0'))
        return true
    }
  }
  const copyrightKeys = ['isCopyright', 'is_copyright', 'copyright', '版权', 'copyrightMaterial', 'isCopyrightMaterial']
  for (const k of copyrightKeys) {
    const v = obj[k]
    if (v === true || v === 1) return true
    if (typeof v === 'string' && /版权|copyright|true|1/i.test(v)) return true
  }
  if (obj.type === 'copyright' || obj.contentType === 'copyright') return true
  for (const v of Object.values(obj)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (extractIsCopyright(v as Record<string, unknown>, depth + 1)) return true
    }
  }
  if (depth === 0) {
    const str = JSON.stringify(obj)
    if (/["']#ff0000["']/i.test(str) || /["']ff0000["']/i.test(str)) return true
  }
  return false
}

function findArrayInJson(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (!data || typeof data !== 'object') return []
  const o = data as Record<string, unknown>
  const keys = ['list', 'data', 'result', 'items', 'records', 'templates', 'contents', 'rows']
  for (const k of keys) {
    const v = o[k]
    if (Array.isArray(v)) return v
  }
  const nested = walkForJsonArray(data)
  if (nested) return nested
  for (const v of Object.values(o)) {
    if (Array.isArray(v) && v.length && typeof v[0] === 'object') return v
  }
  return []
}

export function normalizeResponse(json: unknown): NormalizedItem[] {
  const arr = findArrayInJson(json)
  return arr.map(normalizeItem).filter((x): x is NormalizedItem => x != null)
}

/** 花瓣：对已归一化或 HTML 解析的列表统一做 pin_id 从标题剥离 */
export function postProcessHuabanItems(items: NormalizedItem[]): NormalizedItem[] {
  return items.map((it) => {
    const pinIdMatch = it.title.match(/^pin_id[：:]\s*(\d+)\s*(.*)/s)
    if (pinIdMatch) {
      const pinId = pinIdMatch[1]
      const rest = pinIdMatch[2].trim()
      return {
        ...it,
        pinId,
        title: rest || it.title,
      }
    }
    return it
  })
}

/** 按 id 去重，保留首次出现；若传入 requestedIds 则按该顺序排列（每个 id 只出现一次） */
function deduplicateById(items: NormalizedItem[], requestedIds?: string[]): NormalizedItem[] {
  const byId = new Map<string, NormalizedItem>()
  for (const it of items) {
    if (!byId.has(it.id)) byId.set(it.id, it)
  }
  if (requestedIds?.length) {
    const out: NormalizedItem[] = []
    const added = new Set<string>()
    for (const id of requestedIds) {
      if (added.has(id)) continue
      const it = byId.get(id)
      if (it) {
        added.add(id)
        out.push(it)
      }
    }
    for (const it of byId.values()) {
      if (!added.has(it.id)) out.push(it)
    }
    return out
  }
  return [...byId.values()]
}

function looksLikeHtml(text: string): boolean {
  const t = text.trimStart().slice(0, 80).toLowerCase()
  return t.startsWith('<!doctype') || t.startsWith('<html') || t.startsWith('<head')
}

/** 从 HTML 页面里尽量抽出列表（内嵌 JSON / Next / 常见卡片 DOM） */
function parseHtmlForItems(html: string, requestedIds: string[]): NormalizedItem[] {
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const byId = new Map<string, NormalizedItem>()

  const push = (
    id: string,
    title: string,
    thumbUrl: string | undefined,
    imageUrl: string | undefined,
    isUgc: boolean,
    raw: Record<string, unknown>,
    extra?: { pinId?: string; isCopyright?: boolean },
  ) => {
    if (!id || byId.has(id)) return
    byId.set(id, {
      id,
      title: title || `ID ${id}`,
      thumbUrl,
      imageUrl,
      isUgc,
      ...(extra?.pinId && { pinId: extra.pinId }),
      ...(extra?.isCopyright && { isCopyright: true }),
      raw,
    })
  }

  // Next.js
  const nextEl = doc.getElementById('__NEXT_DATA__')
  if (nextEl?.textContent) {
    try {
      const next = JSON.parse(nextEl.textContent) as unknown
      const items = normalizeResponse(next)
      for (const it of items) push(it.id, it.title, it.thumbUrl, it.imageUrl, it.isUgc, it.raw, { pinId: it.pinId, isCopyright: it.isCopyright })
    } catch {
      /* ignore */
    }
  }

  // 内联 script 里大块 JSON（含 list / templates）
  const scripts = doc.querySelectorAll('script:not([src])')
  for (const s of scripts) {
    const t = (s.textContent || '').trim()
    if (t.length < 50 || t.length > 800_000) continue
    if (!/["']ids["']|templates|preview|"id"\s*:\s*\d+/i.test(t)) continue
    // 从第一个 { 或 [ 尝试括号平衡解析
    for (const startChar of ['{', '['] as const) {
      const start = t.indexOf(startChar)
      if (start < 0) continue
      let depth = 0
      let inStr = false
      let esc = false
      const quote = '"'
      for (let i = start; i < t.length; i++) {
        const c = t[i]
        if (inStr) {
          if (esc) esc = false
          else if (c === '\\') esc = true
          else if (c === quote) inStr = false
          continue
        }
        if (c === quote || c === "'") {
          inStr = true
          continue
        }
        if (c === '{' || c === '[') depth++
        else if (c === '}' || c === ']') {
          depth--
          if (depth === 0) {
            const slice = t.slice(start, i + 1)
            try {
              const parsed = JSON.parse(slice) as unknown
              const items = normalizeResponse(parsed)
              for (const it of items) push(it.id, it.title, it.thumbUrl, it.imageUrl, it.isUgc, it.raw, { pinId: it.pinId, isCopyright: it.isCopyright })
            } catch {
              /* */
            }
            break
          }
        }
      }
    }
  }

  /** 从 div 全文里去掉 [ id 】 后，取内容名称（兼容有/无换行、有/无尾部 【】） */
  function parseTitleFromDivText(rawText: string, id: string): string {
    const afterId = rawText.replace(/\[\s*(\d+)\s*[\]】]\s*/g, '').trim()
    const noTail = afterId.replace(/\s*[\[\]【】\s]*$/g, '').trim()
    const firstLine = noTail.split(/\s*\n\s*/)[0]?.trim() || noTail
    if (firstLine.length >= 2 && firstLine.length <= 300 && !/^\d+$/.test(firstLine) && !/^ID\s+\d+$/.test(firstLine)) return firstLine
    const chineseRun = noTail.match(/[\u4e00-\u9fa5\w\s]{2,300}/)?.[0]?.trim()
    if (chineseRun && !/^\d+$/.test(chineseRun)) return chineseRun
    return `ID ${id}`
  }

  // 原版页面结构：ul#J_ul_content > li.li-content，每项为 img + div，div 内 【<font color="#FF0000">id</font>】 为版权素材，pin_id: 数字 后为标题
  const listContainer = doc.querySelector('#J_ul_content') || doc.querySelector('ul.ul-content')
  if (listContainer) {
    listContainer.querySelectorAll('li.li-content').forEach((li) => {
      const img = li.querySelector('img[src]')
      const src = img?.getAttribute('src') || undefined
      if (!src || src.includes('data:') || /favicon|logo|icon/i.test(src)) return
      const div = li.querySelector('div')
      if (!div) return
      const rawText = (div.textContent ?? div.innerText ?? '').trim().replace(/\s+/g, ' ')
      let id = ''
      let isCopyright = false
      const fontWithId = div.querySelector('font')
      if (fontWithId) {
        const fontText = (fontWithId.textContent ?? '').trim()
        if (/^\d+$/.test(fontText)) {
          id = fontText
          const color = (fontWithId.getAttribute('color') ?? '').trim().toLowerCase()
          if (color === '#ff0000' || color === 'ff0000' || color === 'red') isCopyright = true
        }
      }
      if (!id) {
        const idMatch = rawText.match(/【\s*(\d+)\s*[】\]]/)
        id = idMatch ? idMatch[1] : rawText.match(/\b(\d{6,})\b/)?.[1] ?? ''
      }
      if (!id) return

      let pinId: string | undefined
      const pinIdMatch = rawText.match(/(?:s_)?pin_id[：:]\s*(\d+)/i)
      if (pinIdMatch) pinId = pinIdMatch[1]

      let title = parseTitleFromDivText(rawText, id)
      if (pinId) {
        const afterPin = rawText.replace(/【\s*\d+\s*[】\]]\s*/g, '').replace(new RegExp(`(?:s_)?pin_id[：:]\\s*${pinId}\\s*`, 'gi'), '').trim()
        const chinese = afterPin.match(/[\u4e00-\u9fa5\w\s\-]+/)?.[0]?.trim()
        if (chinese && chinese.length >= 2 && chinese.length <= 300) title = chinese
      }

      push(id, title, src, src, false, { id, title, imageUrl: src, _from: 'html-ul-li', isCopyright }, { pinId, isCopyright })
    })
  }

  /** 从卡片节点内查找可能的内容名称文本（优先带语义的，再兜底整块文本） */
  function getTitleFromCard(el: Element, id: string): string {
    const titleSelectors = [
      '[title]',
      '.title', '.name', '.caption', '.label',
      '[class*="title"]', '[class*="name"]', '[class*="caption"]', '[class*="label"]',
      '[class*="Title"]', '[class*="Name"]',
      'h3', 'h4', 'h5',
      '.content-name', '.template-name', '.item-name',
      '.desc', '.description', '[class*="desc"]',
      'p', '[class*="text"]',
    ]
    for (const sel of titleSelectors) {
      const node = el.querySelector(sel)
      const text = node?.textContent?.trim()
      if (text && text.length > 0 && text.length < 500 && !/^\d+$/.test(text) && !text.startsWith('ID ')) return text
    }
    const withTitle = el.querySelector('[title]')
    const attrTitle = withTitle?.getAttribute('title')?.trim()
    if (attrTitle && attrTitle.length > 0 && attrTitle.length < 500) return attrTitle
    return `ID ${id}`
  }

  // DOM：带 data-id / data-template-id 的块 + 内图
  const dataSelectors = ['[data-template-id]', '[data-content-id]', '[data-id]', '[data-item-id]']
  for (const sel of dataSelectors) {
    doc.querySelectorAll(sel).forEach((el) => {
      const id =
        el.getAttribute('data-template-id') ||
        el.getAttribute('data-content-id') ||
        el.getAttribute('data-item-id') ||
        el.getAttribute('data-id')
      if (!id || !/^\d+$/.test(id)) return
      const img = el.querySelector('img[src]')
      const src = img?.getAttribute('src') || undefined
      const title = getTitleFromCard(el, id)
      push(id, title, src, src, false, { id, title, imageUrl: src, _from: 'html' })
    })
  }

  // a > img：从 href 猜 id，并从卡片容器或 a 附近找内容名称
  doc.querySelectorAll('a[href] img[src]').forEach((img) => {
    const a = img.closest('a[href]')
    if (!a) return
    const href = a.getAttribute('href') || ''
    const m =
      href.match(/[?&]ids=([^&]+)/i) ||
      href.match(/[?&]id=(\d+)/i) ||
      href.match(/\/(\d{6,})(?:\/|$|\?)/)
    let id = m ? (m[1]?.split(',')[0] || m[1]) : ''
    if (!id || !/^\d+$/.test(String(id))) return
    id = String(id)
    const src = img.getAttribute('src') || undefined
    if (!src || src.includes('data:') || /favicon|logo|icon/i.test(src)) return
    const linkTitle = a.getAttribute('title')?.trim()
    const card = a.closest('[class*="card"], [class*="item"], [class*="template"], [class*="content"], li, .list-item')
    const title = linkTitle && linkTitle.length < 500
      ? linkTitle
      : card
        ? getTitleFromCard(card, id)
        : `ID ${id}`
    push(id, title, src, src, false, { id, title, imageUrl: src, _from: 'html' })
  })

  /** 从 HTML 片段中尝试抽出内容名称（内联 JSON、data 属性、或 id 后的中文段落） */
  function extractTitleFromHtmlChunk(chunk: string, avoidId: string): string {
    const patterns = [
      /"(?:title|name|templateName|contentName|template_name|content_name)"\s*:\s*"((?:[^"\\]|\\.){2,200})"/,
      /'(?:title|name|templateName|contentName)'\s*:\s*'((?:[^'\\]|\\.){2,200})'/,
      /data-(?:title|name)=["']([^"']{2,200})["']/i,
      /<[^>]+class="[^"]*title[^"]*"[^>]*>([^<]{2,200})</i,
      /<[^>]+class="[^"]*name[^"]*"[^>]*>([^<]{2,200})</i,
    ]
    for (const re of patterns) {
      const match = chunk.match(re)
      const t = match?.[1]?.trim().replace(/\\"/g, '"')
      if (t && t.length >= 2 && t.length <= 200 && t !== avoidId && !/^\d+$/.test(t) && !/^ID\s+\d+$/.test(t)) return t
    }
    const afterId = chunk.replace(new RegExp(avoidId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[\\s\\S]{0,80}?[\\]】]?\\s*', 'i'), '')
    const chinese = afterId.match(/[\u4e00-\u9fa5\s]{2,150}/)?.[0]?.trim()
    if (chinese && chinese.length <= 150 && !/^\d+$/.test(chinese)) return chinese
    return `ID ${avoidId}`
  }

  // 正文里「ID 附近」的图片 URL（服务端渲染页常见），并尽量从同片段抽出内容名称
  for (const id of requestedIds) {
    if (byId.has(id)) continue
    const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const nearImg = new RegExp(
      `${esc}[\\s\\S]{0,1200}?(https?://[^"'\\s<>]+\\.(?:jpg|jpeg|png|gif|webp)[^"'\\s<>]*)`,
      'i',
    )
    const m = html.match(nearImg)
    if (m?.[1]) {
      const chunk = m[0]
      const title = extractTitleFromHtmlChunk(chunk, id)
      push(id, title, m[1], m[1], false, { id, title, imageUrl: m[1], _from: 'html-regex' })
    } else {
      const imgNear = new RegExp(
        `(https?://[^"'\\s<>]+\\.(?:jpg|jpeg|png|gif|webp)[^"'\\s<>]{0,80})[\\s\\S]{0,1200}?${esc}`,
        'i',
      )
      const m2 = html.match(imgNear)
      if (m2?.[1]) {
        const chunk = m2[0]
        const title = extractTitleFromHtmlChunk(chunk, id)
        push(id, title, m2[1], m2[1], false, { id, title, imageUrl: m2[1], _from: 'html-regex' })
      }
    }
  }

  // 兜底：对仍为「ID xxx」的项，在整段 HTML 里搜该 id 后出现的中文作为内容名称
  for (const [id, item] of byId) {
    if (item.title !== `ID ${id}`) continue
    const idx = html.indexOf(id)
    if (idx < 0) continue
    const segment = html.slice(idx + id.length, idx + id.length + 600)
    const nameMatch = segment.match(/[\u4e00-\u9fa5\s]{4,120}/)
    const found = nameMatch?.[0]?.trim()
    if (found && !/^\d+$/.test(found)) {
      byId.set(id, { ...item, title: found })
    }
  }

  // 按请求顺序排列：先 requestedIds，再其它
  const out: NormalizedItem[] = []
  for (const id of requestedIds) {
    const it = byId.get(id)
    if (it) out.push(it)
  }
  for (const it of byId.values()) {
    if (!requestedIds.includes(it.id)) out.push(it)
  }
  return out
}

/** 开发时走 Vite 代理；生产时请求该基地址（可与 vite proxy target 一致；部署到 Netlify/Vercel 时也可用环境变量 VITE_API_BASE 覆盖） */
const API_PREFIX = import.meta.env.DEV
  ? '/__api'
  : ((import.meta.env.VITE_API_BASE as string | undefined)?.trim().replace(/\/$/, '') ||
      'https://search-aladdin-lamp.hlgdata.com')

/** 稿定 = 模板接口；花瓣 = 花瓣文件接口 */
export type Platform = 'gaoding' | 'huaban'

/** 若已在 Network 里找到返回 JSON 的接口，在 .env 里设置 VITE_JSON_API=完整路径（可含 {ids}） */
const JSON_API_TEMPLATE = (import.meta.env.VITE_JSON_API as string | undefined)?.trim()

function buildUrl(platform: Platform, pageSize: number, ids: string[]): string {
  const idsStr = ids.join(',')

  if (JSON_API_TEMPLATE) {
    const q = new URLSearchParams({ ids: idsStr, page_size: String(pageSize) })
    const p = JSON_API_TEMPLATE.replace(/\{ids\}/g, idsStr)
    if (p.startsWith('http')) {
      const sep = p.includes('?') ? '&' : '?'
      return `${p}${sep}${q}`
    }
    const base = `${API_PREFIX}${p.startsWith('/') ? p : `/${p}`}`
    const sep = p.includes('?') ? '&' : '?'
    return `${base}${sep}${q}`
  }

  if (platform === 'huaban') {
    const q = new URLSearchParams({ ids: idsStr })
    return `${API_PREFIX}/common/huaban/file/ids?${q}`
  }
  const q = new URLSearchParams({ ids: idsStr, page_size: String(pageSize) })
  return `${API_PREFIX}/common/template/ids?${q}`
}

/** 与原版浏览器打开同地址，经代理后可用于 iframe 嵌入 */
export function previewPageUrl(platform: Platform, ids: string[], pageSize = 1000): string {
  if (platform === 'huaban') {
    const q = new URLSearchParams({ ids: ids.join(',') })
    return `${API_PREFIX}/common/huaban/file/ids?${q}`
  }
  const q = new URLSearchParams({ ids: ids.join(','), page_size: String(pageSize) })
  return `${API_PREFIX}/common/template/ids?${q}`
}

/** 原版页面完整 URL（新开标签用） */
export function originalPageUrl(platform: Platform, ids: string[], pageSize = 1000): string {
  const base = 'https://search-aladdin-lamp.hlgdata.com'
  if (platform === 'huaban') {
    return `${base}/common/huaban/file/ids?ids=${encodeURIComponent(ids.join(','))}`
  }
  return `${base}/common/template/ids?ids=${encodeURIComponent(ids.join(','))}&page_size=${pageSize}`
}

export type FetchSource = 'json' | 'html-parse'

export async function fetchTemplatesByIds(
  platform: Platform,
  ids: string[],
  pageSize = 1000,
): Promise<{ items: NormalizedItem[]; raw: unknown; source: FetchSource }> {
  if (!ids.length) return { items: [], raw: null, source: 'json' }
  const url = buildUrl(platform, pageSize, ids)

  const tryFetch = (init?: RequestInit) => fetch(url, init)

  // 1) 优先：要求 JSON（部分网关会按 Accept 分流）
  let res = await tryFetch({
    headers: {
      Accept: 'application/json, text/plain, */*',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  if (!res.ok) throw new Error(`请求失败 ${res.status}: ${res.statusText}`)

  let text = await res.text()
  const ct = res.headers.get('content-type') || ''

  if (!looksLikeHtml(text) && (ct.includes('json') || text.trimStart().startsWith('{') || text.trimStart().startsWith('['))) {
    try {
      const raw = JSON.parse(text) as unknown
      let items = deduplicateById(normalizeResponse(raw), ids)
      if (platform === 'huaban') items = postProcessHuabanItems(items)
      if (items.length) return { items, raw, source: 'json' }
    } catch {
      /* fall through */
    }
  }

  if (looksLikeHtml(text)) {
    const fromHtml = parseHtmlForItems(text, ids)
    if (fromHtml.length > 0) {
      let items = deduplicateById(fromHtml, ids)
      if (platform === 'huaban') items = postProcessHuabanItems(items)
      return { items, raw: { _htmlPreview: true, length: text.length }, source: 'html-parse' }
    }
    // 再试一次不带 XHR 头（有的站对 JSON 更友好）
    res = await tryFetch({ headers: { Accept: 'application/json' } })
    text = await res.text()
    if (!looksLikeHtml(text)) {
      try {
        const raw = JSON.parse(text) as unknown
        let items = deduplicateById(normalizeResponse(raw), ids)
        if (platform === 'huaban') items = postProcessHuabanItems(items)
        return { items, raw, source: 'json' }
      } catch {
        /* */
      }
    }
    const hint =
      url.startsWith('http') && !url.includes(window.location.host)
        ? `当前请求的 URL 是：${url}。若该地址在原版页中返回的是 HTML 而非 JSON，请在原版预览页 F12 → Network → 找到返回 JSON 的 XHR，把其完整 URL 配到环境变量 VITE_JSON_API，然后重新部署。`
        : `当前请求的 URL 是：${url}。部署到 Netlify/Vercel 时请在站点环境变量中设置 VITE_API_BASE 为内网 API 根地址（如 https://search-aladdin-lamp.hlgdata.com），保存后执行「Clear cache and deploy site」再试。`
    throw new Error(`接口返回的是网页 HTML，且未能从页面中解析出模板列表。${hint}`)
  }

  try {
    const raw = JSON.parse(text) as unknown
    let items = deduplicateById(normalizeResponse(raw), ids)
    if (platform === 'huaban') items = postProcessHuabanItems(items)
    return { items, raw, source: 'json' }
  } catch (e) {
    throw new Error(
      e instanceof Error ? e.message : String(e),
    )
  }
}
