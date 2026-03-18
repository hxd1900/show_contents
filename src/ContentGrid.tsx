import { useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { NormalizedItem } from './api'
import type { Platform } from './api'
import { getThumbUrl } from './utils'
import { styles } from './styles'
import { ContentCard } from './ContentCard'

export type ContentGridProps = {
  platform: Platform
  sortedItems: NormalizedItem[]
  cardSize: number
  simpleView: boolean
  selectedIds: Set<string>
  setSelectedIds: React.Dispatch<React.SetStateAction<Set<string>>>
  selectMode: boolean
  draggingId: string | null
  setDraggingId: (v: string | null) => void
  dropTargetId: string | null
  setDropTargetId: (v: string | null) => void
  dropInsertAfter: boolean
  setDropInsertAfter: (v: boolean) => void
  dragPosition: { x: number; y: number } | null
  setDragPosition: (v: { x: number; y: number } | null) => void
  dragStateRef: React.MutableRefObject<{
    fromId: string
    toId: string
    insertAfter: boolean
  } | null>
  pendingDropRef: React.MutableRefObject<{ targetId: string; insertAfter: boolean } | null>
  dropRafRef: React.MutableRefObject<number | null>
  emptyDragImageRef: React.RefObject<HTMLImageElement | null>
  commitDragOrder: (fromId: string, toId: string, insertAfter: boolean) => void
  displayTitle: (title: string, id: string) => string
  copyTitle: (item: NormalizedItem) => void
  copyId: (id: string) => void
  setLightbox: (item: NormalizedItem | null) => void
}

export function ContentGrid(props: ContentGridProps) {
  const {
    platform,
    sortedItems,
    cardSize,
    simpleView,
    selectedIds,
    setSelectedIds,
    selectMode,
    draggingId,
    setDraggingId,
    dropTargetId,
    setDropTargetId,
    dropInsertAfter,
    setDropInsertAfter,
    dragPosition,
    setDragPosition,
    dragStateRef,
    pendingDropRef,
    dropRafRef,
    emptyDragImageRef,
    commitDragOrder,
    displayTitle,
    copyTitle,
    copyId,
    setLightbox,
  } = props

  const gridRef = useRef<HTMLDivElement>(null)
  const [indicatorStyle, setIndicatorStyle] = useState<React.CSSProperties | null>(null)

  useLayoutEffect(() => {
    if (!draggingId || !dropTargetId || !gridRef.current) {
      setIndicatorStyle(null)
      return
    }
    const updateIndicator = () => {
      const el = gridRef.current?.querySelector(
        `[data-item-id="${dropTargetId}"]`,
      ) as HTMLElement | null
      if (el) {
        const rect = el.getBoundingClientRect()
        const gap = 6
        const lineWidth = 6
        const left = dropInsertAfter
          ? rect.right + gap / 2
          : Math.max(0, rect.left - lineWidth)
        const accent = platform === 'huaban' ? '#EB4251' : '#3459F2'
        setIndicatorStyle({
          position: 'fixed',
          left,
          top: rect.top,
          width: lineWidth,
          height: rect.height,
          background: accent,
          boxShadow: `0 0 12px ${accent}`,
          pointerEvents: 'none',
          zIndex: 9999,
          borderRadius: 3,
        })
        return
      }
      if (dragPosition) {
        const accent = platform === 'huaban' ? '#EB4251' : '#3459F2'
        setIndicatorStyle({
          position: 'fixed',
          left: dragPosition.x - 3,
          top: 0,
          width: 6,
          height: '100vh',
          background: accent,
          boxShadow: `0 0 12px ${accent}`,
          pointerEvents: 'none',
          zIndex: 9999,
          borderRadius: 3,
        })
      } else {
        setIndicatorStyle(null)
      }
    }
    updateIndicator()
    const id = requestAnimationFrame(updateIndicator)
    const t = setTimeout(updateIndicator, 100)
    return () => {
      cancelAnimationFrame(id)
      clearTimeout(t)
    }
  }, [draggingId, dropTargetId, dropInsertAfter, dragPosition])

  return (
    <>
      <div
        ref={gridRef}
        style={{
          ...styles.grid,
          gridTemplateColumns: `repeat(auto-fill, minmax(${cardSize}px, 1fr))`,
        }}
        onDragOver={(e) => {
          if (draggingId) {
            e.preventDefault()
            setDragPosition({ x: e.clientX, y: e.clientY })
          }
        }}
      >
        {sortedItems.map((item) => (
          <ContentCard
            key={item.id}
            platform={platform}
            item={item}
            simpleView={simpleView}
            isSelected={selectedIds.has(item.id)}
            isDragging={draggingId === item.id}
            selectMode={selectMode}
            displayTitleText={displayTitle(item.title, item.id)}
            displayTitle={displayTitle}
            onCardClick={(e) => {
              if ((e.target as HTMLElement).closest('[data-no-lightbox]')) return
              if (selectMode && selectedIds.size >= 0) {
                setSelectedIds((s) => {
                  const n = new Set(s)
                  if (n.has(item.id)) n.delete(item.id)
                  else n.add(item.id)
                  return n
                })
              } else if (!selectMode) {
                setLightbox(item)
              }
            }}
            onCopyTitle={() => copyTitle(item)}
            onCopyId={() => copyId(item.id)}
            onToggleSelect={() =>
              setSelectedIds((s) => {
                const n = new Set(s)
                if (n.has(item.id)) n.delete(item.id)
                else n.add(item.id)
                return n
              })
            }
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', item.id)
              e.dataTransfer.effectAllowed = 'move'
              if (emptyDragImageRef.current)
                e.dataTransfer.setDragImage(emptyDragImageRef.current, 0, 0)
              setDraggingId(item.id)
              setDropTargetId(null)
              setDropInsertAfter(false)
              setDragPosition({ x: e.clientX, y: e.clientY })
            }}
            onDragEnd={() => {
              if (dropRafRef.current != null) {
                cancelAnimationFrame(dropRafRef.current)
                dropRafRef.current = null
              }
              pendingDropRef.current = null
              const state = dragStateRef.current
              if (state) {
                commitDragOrder(state.fromId, state.toId, state.insertAfter)
                dragStateRef.current = null
              }
              setDraggingId(null)
              setDropTargetId(null)
              setDropInsertAfter(false)
              setDragPosition(null)
            }}
            onDragOver={(e) => {
              e.preventDefault()
              e.dataTransfer.dropEffect = 'move'
              if (draggingId) setDragPosition({ x: e.clientX, y: e.clientY })
              if (item.id === draggingId) return
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const insertAfter = e.clientX >= rect.left + rect.width / 2
              pendingDropRef.current = { targetId: item.id, insertAfter }
              if (dropRafRef.current == null) {
                dropRafRef.current = requestAnimationFrame(() => {
                  dropRafRef.current = null
                  const p = pendingDropRef.current
                  if (p) {
                    setDropTargetId(p.targetId)
                    setDropInsertAfter(p.insertAfter)
                  }
                })
              }
            }}
            onDrop={(e) => {
              e.preventDefault()
              if (dropRafRef.current != null) {
                cancelAnimationFrame(dropRafRef.current)
                dropRafRef.current = null
              }
              pendingDropRef.current = null
              const fromId = e.dataTransfer.getData('text/plain')
              if (!fromId || fromId === item.id) return
              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
              const insertAfter = e.clientX >= rect.left + rect.width / 2
              dragStateRef.current = null
              commitDragOrder(fromId, item.id, insertAfter)
              setDraggingId(null)
              setDropTargetId(null)
              setDropInsertAfter(false)
              setDragPosition(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                setLightbox(item)
              }
            }}
          />
        ))}
      </div>

      {indicatorStyle && createPortal(
        <div style={indicatorStyle} aria-hidden />,
        document.body,
      )}

      {draggingId && dragPosition && (() => {
        const it = sortedItems.find((i) => i.id === draggingId)
        if (!it) return null
        const ghostThumbUrl =
          it.thumbUrl && it.thumbUrl !== it.imageUrl
            ? it.thumbUrl
            : it.imageUrl
              ? getThumbUrl(it.imageUrl)
              : null
        const ghostShowBadge = simpleView && platform === 'huaban' && !!it.isCopyright
        return createPortal(
          <div
            style={{
              position: 'fixed',
              left: dragPosition.x,
              top: dragPosition.y,
              transform: 'translate(-50%, -50%)',
              width: cardSize,
              maxWidth: cardSize,
              pointerEvents: 'none',
              zIndex: 9998,
              ...styles.card,
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              opacity: 0.95,
            }}
          >
            <div style={{ ...styles.thumbWrap, position: ghostShowBadge ? 'relative' : undefined }}>
              {ghostThumbUrl ? (
                <img src={ghostThumbUrl} alt="" style={styles.thumb} />
              ) : (
                <div style={styles.thumbPlaceholder}>暂无预览图</div>
              )}
              {ghostShowBadge && (
                <span
                  style={{
                    position: 'absolute',
                    top: 4,
                    right: 4,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: '#EB4251',
                    color: '#fff',
                    fontSize: 11,
                    lineHeight: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                  }}
                >
                  ©
                </span>
              )}
            </div>
            {!simpleView && (
            <div style={styles.cardBody}>
              <div style={styles.cardName}>{displayTitle(it.title, it.id)}</div>
              <div style={styles.cardMetaCenter}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
                  <span style={styles.codeSmall}>内容ID：</span>
                  <code style={styles.codeSmall}>{it.id}</code>
                </div>
                {it.pinId && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                    PIN_ID：<code style={styles.codeSmall}>{it.pinId}</code>
                  </div>
                )}
              </div>
            </div>
            )}
          </div>,
          document.body,
        )
      })()}
    </>
  )
}
