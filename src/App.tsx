import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { fetchTemplatesByIds, originalPageUrl, previewPageUrl, type NormalizedItem, type Platform } from './api'
import { ContentGrid } from './ContentGrid'
import { HeaderToolbar } from './HeaderToolbar'
import { Lightbox } from './Lightbox'
import { styles } from './styles'
import {
  displayTitle,
  loadStoredPrefs,
  normalizeIdsToCommaSeparated,
  parseIdsFromInput,
  parseIdsFromSearch,
  parsePlatformFromSearch,
  saveStoredPrefs,
  setUrlParams,
} from './utils'

const PLATFORMS: { value: Platform; label: string }[] = [
  { value: 'gaoding', label: '稿定' },
  { value: 'huaban', label: '花瓣' },
]

const SORT_OPTIONS: { value: 'default' | 'newest' | 'oldest' | 'manual'; label: string }[] = [
  { value: 'default', label: '默认排序' },
  { value: 'newest', label: '从新到旧' },
  { value: 'oldest', label: '从旧到新' },
  { value: 'manual', label: '手动排序' },
]

/** 稿定 UGC 大内容打开链接（materials-ugc） */
const GAODING_UGC_URL_TEMPLATE =
  'https://market.gaoding.com/content/side/cms-v2/contents/materials-ugc?querys=%7B%22page_num%22%3A1%2C%22page_size%22%3Anull%2C%22auth_id%22%3Anull%2C%22category_and%22%3Anull%2C%22category_ids%22%3Anull%2C%22content_ids%22%3Anull%2C%22copyright_status%22%3Anull%2C%22format%22%3Anull%2C%22has_origin%22%3Anull%2C%22has_tag%22%3Anull%2C%22initiators%22%3Anull%2C%22name%22%3Anull%2C%22source_types%22%3Anull%2C%22status%22%3Anull%2C%22tag_and%22%3Anull%2C%22tags%22%3Anull%2C%22type%22%3Anull%2C%22provider_ids%22%3Anull%2C%22designer_ids%22%3Anull%2C%22data_range_start%22%3Anull%2C%22data_range_end%22%3Anull%2C%22content_tag_group_ids%22%3Anull%2C%22authorization_property%22%3Anull%2C%22sort_column%22%3Anull%2C%22sort_type%22%3Anull%2C%22has_content_group%22%3Anull%2C%22csp_content_type%22%3Anull%2C%22_compact%22%3A%5B%22content_ids%22%2C%22195838478%22%5D%2C%22ugc_publish_type%22%3Anull%2C%22source_user_id%22%3Anull%2C%22source_org_id%22%3Anull%2C%22audit_crc_status%22%3Anull%2C%22audit_cqc_status%22%3Anull%2C%22relate_tools%22%3Anull%2C%22style%22%3Anull%2C%22ratio_id%22%3Anull%2C%22ugc_user_deleted%22%3Anull%2C%22source_channel_ids%22%3Anull%2C%22ugc_source_ai_id%22%3Anull%2C%22ugc_source_id%22%3Anull%2C%22relate_template_id%22%3Anull%2C%22aigc_label%22%3Anull%22content_biz_type_primary%22%3Anull%2C%22content_biz_type_second%22%3Anull%2C%22extend_parent_ids%22%3Anull%7D'

/** 稿定非 UGC 大内容打开链接（materials） */
const GAODING_MATERIALS_URL_TEMPLATE =
  'https://market.gaoding.com/content/side/cms-v2/contents/materials?querys=%7B%22page_num%22%3A1%2C%22page_size%22%3Anull%2C%22auth_id%22%3Anull%2C%22category_and%22%3Anull%2C%22category_ids%22%3Anull%2C%22content_ids%22%3Anull%2C%22copyright_status%22%3Anull%2C%22format%22%3Anull%2C%22has_origin%22%3Anull%2C%22has_tag%22%3Anull%2C%22initiators%22%3Anull%2C%22name%22%3Anull%2C%22source_types%22%3Anull%2C%22status%22%3Anull%2C%22tag_and%22%3Anull%2C%22tags%22%3Anull%2C%22type%22%3Anull%2C%22provider_ids%22%3Anull%2C%22designer_ids%22%3Anull%2C%22data_range_start%22%3Anull%2C%22data_range_end%22%3Anull%2C%22content_tag_group_ids%22%3Anull%2C%22authorization_property%22%3Anull%2C%22sort_column%22%3Anull%2C%22sort_type%22%3Anull%2C%22has_content_group%22%3Anull%2C%22csp_content_type%22%3Anull%2C%22_compact%22%3A%5B%22content_ids%22%2C%22196450574%22%5D%2C%22ugc_publish_type%22%3Anull%2C%22source_user_id%22%3Anull%2C%22source_org_id%22%3Anull%2C%22audit_crc_status%22%3Anull%2C%22audit_cqc_status%22%3Anull%2C%22relate_tools%22%3Anull%2C%22style%22%3Anull%2C%22ratio_id%22%3Anull%2C%22ugc_user_deleted%22%3Anull%2C%22source_channel_ids%22%3Anull%2C%22ugc_source_ai_id%22%3Anull%2C%22ugc_source_id%22%3Anull%2C%22relate_template_id%22%3Anull%2C%22aigc_label%22%3Anull%2C%22content_biz_type_primary%22%3Anull%2C%22content_biz_type_second%22%3Anull%2C%22extend_parent_ids%22%3Anull%7D'

function gaodingContentUrl(contentId: string, isUgc: boolean): string {
  const tpl = isUgc ? GAODING_UGC_URL_TEMPLATE : GAODING_MATERIALS_URL_TEMPLATE
  const placeholder = isUgc ? '195838478' : '196450574'
  return tpl.replace(new RegExp(placeholder, 'g'), contentId)
}

const storedPrefs = loadStoredPrefs()

export default function App() {
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const fromStorage = storedPrefs.theme
    if (fromStorage) return fromStorage
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark'
  })
  const [platform, setPlatform] = useState<Platform>(() => {
    const fromStorage = storedPrefs.platform
    if (fromStorage) return fromStorage
    return parsePlatformFromSearch()
  })
  const [idsInputByPlatform, setIdsInputByPlatform] = useState<Record<Platform, string>>(() => {
    const fromUrl = parseIdsFromSearch()
    const fromPlatform = parsePlatformFromSearch()
    const urlStr = fromUrl.length ? normalizeIdsToCommaSeparated(fromUrl) : ''
    return {
      gaoding: storedPrefs.idsInputGaoding ?? (fromPlatform === 'gaoding' ? urlStr : ''),
      huaban: storedPrefs.idsInputHuaban ?? (fromPlatform === 'huaban' ? urlStr : ''),
    }
  })
  const idsInput = idsInputByPlatform[platform]
  const setIdsInput = useCallback(
    (value: string | ((prev: string) => string)) => {
      setIdsInputByPlatform((prev) => ({
        ...prev,
        [platform]: typeof value === 'function' ? value(prev[platform]) : value,
      }))
    },
    [platform],
  )
  const [items, setItems] = useState<NormalizedItem[]>([])
  const [lastLoadedIds, setLastLoadedIds] = useState<string[]>(() => parseIdsFromSearch())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [lightbox, setLightbox] = useState<NormalizedItem | null>(null)
  const [filter, setFilter] = useState('')
  const [embedOriginal, setEmbedOriginal] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [cardSize, setCardSize] = useState(() => storedPrefs.cardSize ?? 168)
  const [toast, setToast] = useState<{ message: string } | null>(null)
  const [sortMode, setSortMode] = useState<'default' | 'newest' | 'oldest' | 'manual'>('default')
  const [manualOrderIds, setManualOrderIds] = useState<string[]>(
    () => storedPrefs.manualOrderIds ?? [],
  )
  const [removedIds, setRemovedIds] = useState<Set<string>>(() => new Set())
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set())
  const [selectMode, setSelectMode] = useState(false)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [dropInsertAfter, setDropInsertAfter] = useState(false)
  const [dragPosition, setDragPosition] = useState<{ x: number; y: number } | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [simpleView, setSimpleView] = useState(false)
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false)
  const sortDropdownRef = useRef<HTMLDivElement>(null)
  const isFirstPlatformRef = useRef(true)
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const dragStateRef = useRef<{ fromId: string; toId: string; insertAfter: boolean } | null>(null)
  const emptyDragImageRef = useRef<HTMLImageElement | null>(null)
  const pendingDropRef = useRef<{ targetId: string; insertAfter: boolean } | null>(null)
  const dropRafRef = useRef<number | null>(null)

  const showToast = useCallback((message: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    setToast({ message })
    toastTimerRef.current = setTimeout(() => {
      setToast(null)
      toastTimerRef.current = null
    }, 1500)
  }, [])

  /** 判断是否为网络不可达（需内网），用于提示友好文案 */
  const isNetworkError = useCallback((e: unknown) => {
    const msg = (e instanceof Error ? e.message : String(e)).toLowerCase()
    return (
      /failed to fetch|networkerror|load failed|network request failed/i.test(msg) ||
      /err_network|err_connection|cors|timeout|无法访问|连接|refused/i.test(msg)
    )
  }, [])

  const ids = useMemo(() => parseIdsFromInput(idsInput), [idsInput])

  const idsMatchLastLoad = useMemo(() => {
    if (ids.length !== lastLoadedIds.length) return false
    const a = [...ids].sort()
    const b = [...lastLoadedIds].sort()
    return a.every((id, i) => id === b[i])
  }, [ids, lastLoadedIds])

  const load = useCallback(async () => {
    setError(null)
    setLoading(true)
    setUrlParams(ids, platform)
    setEmbedOriginal(false)
    try {
      const { items: list } = await fetchTemplatesByIds(platform, ids, 1000)
      setItems(list)
      setLastLoadedIds([...ids])
      setRemovedIds(new Set())
    } catch (e) {
      setItems([])
      setError(isNetworkError(e) ? '需连公司内网才能打开哦' : (e instanceof Error ? e.message : String(e)))
    } finally {
      setLoading(false)
    }
  }, [ids, platform, isNetworkError])

  useEffect(() => {
    if (isFirstPlatformRef.current) {
      isFirstPlatformRef.current = false
      return
    }
    if (ids.length > 0) void load()
  }, [platform])

  useEffect(() => {
    const fromUrl = parseIdsFromSearch()
    const fromPlatform = parsePlatformFromSearch()
    setPlatform(fromPlatform)
    if (fromUrl.length) {
      setIdsInputByPlatform((prev) => ({
        ...prev,
        [fromPlatform]: normalizeIdsToCommaSeparated(fromUrl),
      }))
      void (async () => {
        setLoading(true)
        setError(null)
        try {
          const { items: list } = await fetchTemplatesByIds(fromPlatform, fromUrl, 1000)
          setItems(list)
          setLastLoadedIds([...fromUrl])
          setRemovedIds(new Set())
        } catch (e) {
          setError(isNetworkError(e) ? '需连公司内网才能打开哦' : (e instanceof Error ? e.message : String(e)))
        } finally {
          setLoading(false)
        }
      })()
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  useEffect(() => {
    saveStoredPrefs({
      theme,
      platform,
      cardSize,
      manualOrderIds,
      idsInputGaoding: idsInputByPlatform.gaoding,
      idsInputHuaban: idsInputByPlatform.huaban,
    })
  }, [theme, platform, cardSize, manualOrderIds, idsInputByPlatform])

  const visibleItems = useMemo(() => items.filter((it) => !removedIds.has(it.id)), [items, removedIds])
  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return visibleItems
    return visibleItems.filter(
      (it) =>
        it.id.toLowerCase().includes(q) ||
        it.title.toLowerCase().includes(q),
    )
  }, [visibleItems, filter])
  const sortedItems = useMemo(() => {
    if (sortMode === 'default') return filtered
    if (sortMode === 'newest') return [...filtered].sort((a, b) => Number(b.id) - Number(a.id))
    if (sortMode === 'oldest') return [...filtered].sort((a, b) => Number(a.id) - Number(b.id))
    const order = new Map(manualOrderIds.map((id, i) => [id, i]))
    return [...filtered].sort((a, b) => {
      const ai = order.has(a.id) ? order.get(a.id)! : 9999
      const bi = order.has(b.id) ? order.get(b.id)! : 9999
      return ai - bi
    })
  }, [filtered, sortMode, manualOrderIds])

  const originalLink = originalPageUrl(platform, ids, 1000)

  const copyTitle = useCallback((item: NormalizedItem) => {
    void navigator.clipboard.writeText(displayTitle(item.title, item.id)).then(() => showToast('已复制内容'))
  }, [showToast])
  const copyId = useCallback((id: string) => {
    void navigator.clipboard.writeText(id).then(() => showToast('已复制ID'))
  }, [showToast])
  const copyPinId = useCallback((pinId: string) => {
    void navigator.clipboard.writeText(pinId).then(() => showToast('已复制 PIN_ID'))
  }, [showToast])

  const commitDragOrder = useCallback((fromId: string, toId: string, insertAfter: boolean) => {
    if (!fromId || !toId || fromId === toId) return
    const currentOrder = sortedItems.map((i) => i.id)
    if (!currentOrder.includes(fromId) || !currentOrder.includes(toId)) return
    const next = currentOrder.filter((id) => id !== fromId)
    let insertIdx = next.indexOf(toId)
    if (insertIdx < 0) return
    if (insertAfter) insertIdx = Math.min(insertIdx + 1, next.length)
    next.splice(insertIdx, 0, fromId)
    setManualOrderIds(next)
    setSortMode('manual')
  }, [sortedItems])

  useEffect(() => {
    dragStateRef.current = draggingId && dropTargetId && draggingId !== dropTargetId
      ? { fromId: draggingId, toId: dropTargetId, insertAfter: dropInsertAfter }
      : null
  }, [draggingId, dropTargetId, dropInsertAfter])

  useEffect(() => {
    if (emptyDragImageRef.current) return
    const img = new Image()
    img.src = 'data:image/gif;base64,R0lGOODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'
    emptyDragImageRef.current = img
  }, [])

  useEffect(() => {
    if (!sortDropdownOpen) return
    const onDocClick = (e: MouseEvent) => {
      if (sortDropdownRef.current && !sortDropdownRef.current.contains(e.target as Node)) setSortDropdownOpen(false)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [sortDropdownOpen])

  const sortLabel = SORT_OPTIONS.find((o) => o.value === sortMode)?.label ?? '默认排序'

  return (
    <div style={styles.layout} data-platform={platform}>
      <header style={styles.header}>
        <HeaderToolbar
          originalLink={originalLink}
          showSettings={showSettings}
          setShowSettings={setShowSettings}
          theme={theme}
          setTheme={setTheme}
          showToast={showToast}
        />

        <div style={styles.toolbar}>
          <div style={styles.toolbarBlock}>
            <div style={styles.toolbarFirstRow}>
              <div style={styles.platformGroup} role="group" aria-label="选择平台">
                {PLATFORMS.map(({ value, label }) => {
                  const selected = platform === value
                  const fillColor = selected ? (value === 'gaoding' ? '#3459F2' : '#EB4251') : undefined
                  return (
                    <label
                      key={value}
                      className={`platform-option ${selected ? 'platform-option--selected' : ''}`}
                      data-platform={value}
                      style={{
                        ...styles.platformOption,
                        ...(selected && fillColor
                          ? { border: `1px solid ${fillColor}`, background: fillColor, color: '#fff' }
                          : {}),
                      }}
                    >
                      <input
                        type="radio"
                        name="platform"
                        value={value}
                        checked={selected}
                        onChange={() => setPlatform(value)}
                        className="platform-radio-sr"
                        aria-label={label}
                      />
                      <span>{label}</span>
                    </label>
                  )
                })}
              </div>
              <label htmlFor="ids-input" style={styles.idsLabelInline}>
                选择平台，输入内容ID（支持空格、大小写逗号分隔符，回车加载）
              </label>
            </div>
            <textarea
              id="ids-input"
              style={styles.textarea}
              value={idsInput}
              onChange={(e) => setIdsInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && ids.length > 0) {
                  e.preventDefault()
                  setIdsInput(normalizeIdsToCommaSeparated(ids))
                  void load()
                }
              }}
              placeholder={platform === 'huaban' ? '例如：918835315，918833210 918831736' : '例如：195838478，195796713 195800744'}
              rows={2}
              aria-label="选择平台，输入内容ID（支持空格、大小写逗号分隔符，回车加载）"
            />
          </div>
        </div>

        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}
      </header>

      <main style={styles.main}>
        {embedOriginal && ids.length > 0 && (
          <div style={styles.embedWrap}>
            <p style={styles.embedHint}>
              以下为内网原版预览页（嵌入）。要恢复增强网格需在 Network 中找到 JSON 接口并配置{' '}
              <code style={styles.code}>VITE_JSON_API</code>。
            </p>
            <iframe
              title="原版预览"
              src={import.meta.env.DEV ? previewPageUrl(platform, ids, 1000) : originalLink}
              style={styles.embedFrame}
            />
          </div>
        )}

        {!embedOriginal && loading && items.length === 0 && !error && (
          <div style={{ ...styles.skeletonGrid, gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))` }}>
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} style={styles.skeletonCard} />
            ))}
          </div>
        )}

        {!embedOriginal && (ids.length === 0 || !idsMatchLastLoad || (!loading && items.length === 0 && !error)) && (
          <div style={styles.empty}>
            {ids.length === 0 ? (
              <>输入ID后回车加载内容</>
            ) : !idsMatchLastLoad ? (
              <>输入已变更，按回车加载</>
            ) : (
              <>暂无内容</>
            )}
            <div style={styles.emptyMeta}>共 0 条内容</div>
          </div>
        )}

        {!embedOriginal && items.length > 0 && ids.length > 0 && idsMatchLastLoad && (
          <>
            <div style={styles.mainToolbar}>
              <button type="button" style={styles.toolbarControl} onClick={() => { setSelectMode((v) => !v); if (selectMode) setSelectedIds(new Set()) }}>{selectMode ? '取消选择' : '选择'}</button>
              {selectMode && selectedIds.size > 0 && (
                <div style={styles.batchBar}>
                  <span style={styles.batchCount}>已选 {selectedIds.size} 项</span>
                  <button type="button" style={styles.toolbarControl} onClick={() => setSelectedIds(new Set(sortedItems.map((i) => i.id)))}>全选</button>
                  <button type="button" style={styles.toolbarControl} onClick={() => setSelectedIds((s) => new Set(sortedItems.filter((i) => !s.has(i.id)).map((i) => i.id)))}>反选</button>
                  <button
                    type="button"
                    style={styles.btnDanger}
                    onClick={() => setShowDeleteConfirm(true)}
                  >
                    {selectedIds.size >= 2 ? '批量删除' : '删除'}
                  </button>
                  <button
                    type="button"
                    style={styles.toolbarControl}
                    onClick={() => {
                      void navigator.clipboard
                        .writeText(Array.from(selectedIds).join(','))
                        .then(() => showToast('已复制所选 ID'))
                    }}
                  >
                    复制所选 ID
                  </button>
                  <button type="button" className="btn-platform" style={styles.btnPrimaryBar} onClick={() => { const url = `${window.location.origin}${window.location.pathname}?ids=${Array.from(selectedIds).join(',')}&platform=${platform}`; void navigator.clipboard.writeText(url).then(() => showToast('已复制预览链接')) }}>生成链接</button>
                </div>
              )}
              <div style={styles.mainToolbarRight}>
                <div ref={sortDropdownRef} style={{ position: 'relative' }}>
                  <button
                    type="button"
                    style={styles.sortDropdownTrigger}
                    onClick={(e) => { e.stopPropagation(); setSortDropdownOpen((v) => !v) }}
                    aria-label="排序方式"
                    aria-expanded={sortDropdownOpen}
                    aria-haspopup="listbox"
                  >
                    {sortLabel}
                    <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', fontSize: 10, opacity: 0.8 }}>▼</span>
                  </button>
                  {sortDropdownOpen && (
                    <div style={styles.sortDropdownPanel} role="listbox">
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          role="option"
                          aria-selected={sortMode === opt.value}
                          className="sort-dropdown-option"
                          style={{
                            ...styles.sortDropdownOption,
                            ...(sortMode === opt.value ? { background: 'var(--surface-hover)', fontWeight: 600 } : {}),
                          }}
                          onClick={(e) => { e.stopPropagation(); setSortMode(opt.value); setSortDropdownOpen(false) }}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  style={styles.filterInput}
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  placeholder="筛选 ID 或标题…"
                  aria-label="筛选 ID 或标题"
                />
                <div style={styles.zoomRow}>
                  <button type="button" style={styles.zoomBtn} onClick={() => setCardSize((s) => Math.max(120, s - 24))} aria-label="缩小卡片">－</button>
                  <button type="button" style={styles.zoomBtn} onClick={() => setCardSize((s) => Math.min(280, s + 24))} aria-label="放大卡片">＋</button>
                  <button
                    type="button"
                    style={{ ...styles.toolbarControl, whiteSpace: 'nowrap' }}
                    onClick={() => setSimpleView((v) => !v)}
                    aria-label={simpleView ? '详细' : '简化'}
                  >
                    {simpleView ? '详细' : '简化'}
                  </button>
                </div>
              </div>
            </div>
            <div style={styles.metaRow}>
              <div style={styles.meta}>
                {ids.length !== new Set(ids).size
                  ? <>共输入 <strong>{ids.length}</strong> 个ID，去重后共 <strong>{items.length}</strong> 条</>
                  : <>共 <strong>{visibleItems.length}</strong> 条</>}
                {removedIds.size > 0 && <>，已删除 <strong>{removedIds.size}</strong> 条，当前共 <strong>{visibleItems.length}</strong> 条</>}
                {filter.trim() ? `，筛选后 ${sortedItems.length} 条` : ''}
              </div>
            </div>
            <ContentGrid
              platform={platform}
              sortedItems={sortedItems}
              cardSize={cardSize}
              simpleView={simpleView}
              selectedIds={selectedIds}
              setSelectedIds={setSelectedIds}
              selectMode={selectMode}
              draggingId={draggingId}
              setDraggingId={setDraggingId}
              dropTargetId={dropTargetId}
              setDropTargetId={setDropTargetId}
              dropInsertAfter={dropInsertAfter}
              setDropInsertAfter={setDropInsertAfter}
              dragPosition={dragPosition}
              setDragPosition={setDragPosition}
              dragStateRef={dragStateRef}
              pendingDropRef={pendingDropRef}
              dropRafRef={dropRafRef}
              emptyDragImageRef={emptyDragImageRef}
              commitDragOrder={commitDragOrder}
              displayTitle={displayTitle}
              copyTitle={copyTitle}
              copyId={copyId}
              setLightbox={setLightbox}
            />
          </>
        )}

      </main>

      <button
        type="button"
        style={styles.backToTop}
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        aria-label="返回顶部"
      >
        ↑
      </button>

      {lightbox && (
        <Lightbox
          lightbox={lightbox}
          onClose={() => setLightbox(null)}
          onCopyTitle={() => copyTitle(lightbox)}
          onCopyId={() => copyId(lightbox.id)}
          onCopyPinId={lightbox.pinId ? () => copyPinId(lightbox.pinId!) : undefined}
          displayTitle={() => displayTitle(lightbox.title, lightbox.id)}
          platform={platform}
          gaodingContentUrl={gaodingContentUrl}
          originalPageUrl={originalPageUrl}
        />
      )}

      {showDeleteConfirm && selectedIds.size > 0 && (
        <div
          style={styles.overlay}
          role="dialog"
          aria-modal
          aria-labelledby="delete-confirm-title"
          onClick={() => setShowDeleteConfirm(false)}
          onKeyDown={(e) => e.key === 'Escape' && setShowDeleteConfirm(false)}
        >
          <div style={styles.deleteConfirmModal} onClick={(e) => e.stopPropagation()}>
            <p id="delete-confirm-title" style={styles.deleteConfirmText}>
              确认删除{selectedIds.size}个内容？
            </p>
            <div style={styles.deleteConfirmActions}>
              <button type="button" style={styles.toolbarControl} onClick={() => setShowDeleteConfirm(false)}>取消</button>
              <button
                type="button"
                style={styles.btnDanger}
                onClick={() => {
                  setRemovedIds((prev) => { const next = new Set(prev); selectedIds.forEach((id) => next.add(id)); return next })
                  setSelectedIds(new Set())
                  setSelectMode(false)
                  setShowDeleteConfirm(false)
                }}
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div style={styles.toast} role="status">
          {toast.message}
        </div>
      )}
    </div>
  )
}
