import { useCallback, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import type { NormalizedItem } from './api'
import type { Platform } from './api'
import { getThumbUrl, stripPinIdFromTitle } from './utils'
import { styles } from './styles'

const IMAGE_LOAD_TIMEOUT_MS = 12000
const MAX_IMAGE_RETRIES = 3

/** 仅当元素进入视口时再加载图片 */
function useInView(rootMargin = '400px'): [React.RefObject<HTMLDivElement | null>, boolean] {
  const ref = useRef<HTMLDivElement>(null)
  const [inView, setInView] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    if (inView) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setInView(true)
      },
      { rootMargin, threshold: 0.01 },
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [rootMargin, inView])
  return [ref, inView]
}

/** 卡片缩略图：进入视口后加载，失败自动重试最多 3 次；简化视图下花瓣版权角标 ©️ */
function CardThumb(props: {
  item: NormalizedItem
  stylesRecord: Record<string, React.CSSProperties>
  showCopyrightBadge?: boolean
}) {
  const { item, stylesRecord, showCopyrightBadge } = props
  const [wrapRef, inView] = useInView()
  const [retryCount, setRetryCount] = useState(0)
  const [failed, setFailed] = useState(false)
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const cardImgUrl = item.imageUrl
    ? item.thumbUrl && item.thumbUrl !== item.imageUrl
      ? item.thumbUrl
      : getThumbUrl(item.imageUrl)
    : item.thumbUrl || null

  const tryAgain = useCallback(() => {
    setFailed(false)
    setRetryCount(0)
  }, [])

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
    }
  }, [])

  const handleLoad = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setFailed(false)
  }, [])

  const handleError = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setRetryCount((c) => {
      if (c + 1 >= MAX_IMAGE_RETRIES) {
        setFailed(true)
        return c
      }
      return c + 1
    })
  }, [])

  useEffect(() => {
    if (!inView || !cardImgUrl || failed) return
    timeoutRef.current = setTimeout(() => {
      timeoutRef.current = null
      setRetryCount((c) => {
        if (c + 1 >= MAX_IMAGE_RETRIES) setFailed(true)
        return c + 1 >= MAX_IMAGE_RETRIES ? c : c + 1
      })
    }, IMAGE_LOAD_TIMEOUT_MS)
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
        timeoutRef.current = null
      }
    }
  }, [inView, cardImgUrl, failed, retryCount])

  return (
    <div ref={wrapRef as React.RefObject<HTMLDivElement>} style={{ ...stylesRecord.thumbWrap, position: showCopyrightBadge ? 'relative' : undefined }}>
      {!inView ? (
        <div style={stylesRecord.thumbSkeleton} aria-hidden data-no-lightbox />
      ) : failed ? (
        <div style={stylesRecord.thumbFailed} data-no-lightbox>
          <span style={stylesRecord.thumbFailedText}>加载失败</span>
          <button
            type="button"
            style={stylesRecord.thumbRetryBtn}
            onClick={(e) => {
              e.stopPropagation()
              tryAgain()
            }}
          >
            重新加载
          </button>
        </div>
      ) : cardImgUrl ? (
        <>
          <img
            key={retryCount}
            src={cardImgUrl}
            alt=""
            style={stylesRecord.thumb}
            loading="lazy"
            onLoad={handleLoad}
            onError={handleError}
          />
          {showCopyrightBadge && (
            <span
              data-no-lightbox
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
              title="版权素材"
            >
              ©
            </span>
          )}
        </>
      ) : (
        <div style={stylesRecord.thumbPlaceholder}>暂无预览图</div>
      )}
    </div>
  )
}

export type ContentCardProps = {
  platform: Platform
  item: NormalizedItem
  simpleView: boolean
  isSelected: boolean
  isDragging: boolean
  selectMode: boolean
  displayTitleText: string
  /** 用于花瓣：去掉标题中的【id】后再展示 */
  displayTitle: (title: string, id: string) => string
  onCardClick: (e: React.MouseEvent) => void
  onCopyTitle: () => void
  onCopyId: () => void
  onToggleSelect: () => void
  onDragStart: (e: React.DragEvent) => void
  onDragEnd: () => void
  onDragOver: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onKeyDown: (e: React.KeyboardEvent) => void
}

export function ContentCard(props: ContentCardProps) {
  const {
    platform,
    item,
    simpleView,
    isSelected,
    isDragging,
    selectMode,
    displayTitleText,
    displayTitle: displayTitleFn,
    onCardClick,
    onCopyTitle,
    onCopyId,
    onToggleSelect,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop,
    onKeyDown,
  } = props

  const isHuaban = platform === 'huaban'
  const { displayTitle: huabanDisplayTitle, pinId: huabanPinId } = isHuaban
    ? stripPinIdFromTitle(item.title)
    : { displayTitle: displayTitleText, pinId: undefined as string | undefined }
  const titleToShow = isHuaban ? displayTitleFn(huabanDisplayTitle, item.id) : displayTitleText
  const pinIdToShow = item.pinId ?? huabanPinId

  return (
    <motion.article
      key={item.id}
      data-item-id={item.id}
      layout={isDragging ? false : 'position'}
      transition={{ type: 'tween', duration: 0.2, ease: 'easeOut' }}
      style={{
        ...styles.card,
        ...(isSelected ? styles.cardSelected : {}),
        ...(isDragging ? styles.cardDragging : {}),
        ...(!isDragging ? { cursor: 'grab' } : { cursor: 'grabbing' }),
        transition: 'box-shadow 0.2s ease-out, opacity 0.2s ease-out',
      }}
      onClick={onCardClick}
      draggable
      onDragStart={(e: unknown) => onDragStart(e as React.DragEvent)}
      onDragEnd={() => onDragEnd()}
      onDragOver={(e: unknown) => onDragOver(e as React.DragEvent)}
      onDrop={(e: unknown) => onDrop(e as React.DragEvent)}
      role="button"
      tabIndex={0}
      onKeyDown={onKeyDown}
    >
      {selectMode && (
        <div style={styles.cardActions}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onToggleSelect}
            onClick={(e) => e.stopPropagation()}
            data-no-lightbox
            className="card-checkbox"
            style={styles.cardCheckbox}
            aria-label="多选"
          />
        </div>
      )}
      <CardThumb
        item={item}
        stylesRecord={styles}
        showCopyrightBadge={simpleView && platform === 'huaban' && !!item.isCopyright}
      />
      {!simpleView && (
      <div style={styles.cardBody}>
        <div
          style={{
            ...styles.cardName,
            display: 'block',
            marginBottom: 8,
          }}
          title="点击复制"
          onClick={(e) => {
            e.stopPropagation()
            onCopyTitle()
          }}
          role="button"
          tabIndex={0}
        >
          <span
            style={{
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {titleToShow}
            {item.isCopyright && <span style={styles.copyrightTag}> 版权素材</span>}
          </span>
        </div>
        <div style={styles.cardMetaCenter}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{ ...styles.codeSmall, flexShrink: 0 }}>内容ID：</span>
            <code
              style={styles.codeSmall}
              title="点击复制"
              onClick={(e) => {
                e.stopPropagation()
                onCopyId()
              }}
              role="button"
              tabIndex={0}
            >
              {item.id}
            </code>
          </div>
          {pinIdToShow && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ ...styles.codeSmall, flexShrink: 0 }}>PIN_ID：</span>
              <code style={styles.codeSmall}>{pinIdToShow}</code>
            </div>
          )}
        </div>
      </div>
      )}
    </motion.article>
  )
}
