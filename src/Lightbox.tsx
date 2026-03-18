import { useEffect, useRef, useState } from 'react'
import type { NormalizedItem, Platform } from './api'
import { styles } from './styles'

export type LightboxProps = {
  lightbox: NormalizedItem
  onClose: () => void
  onCopyTitle: () => void
  onCopyId: () => void
  onCopyPinId?: () => void
  displayTitle: () => string
  platform: Platform
  gaodingContentUrl: (id: string, isUgc: boolean) => string
  originalPageUrl: (platform: Platform, ids: string[], pageSize: number) => string
}

export function Lightbox(props: LightboxProps) {
  const {
    lightbox,
    onClose,
    onCopyTitle,
    onCopyId,
    onCopyPinId,
    displayTitle,
    platform,
    gaodingContentUrl,
    originalPageUrl,
  } = props
  const [bigImageLoaded, setBigImageLoaded] = useState(false)
  const [imageWidth, setImageWidth] = useState<number | null>(null)
  const imageWrapRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setBigImageLoaded(false)
    setImageWidth(null)
  }, [lightbox.id])
  const hasBigImage = lightbox.imageUrl && lightbox.imageUrl !== lightbox.thumbUrl

  const measureImageWidth = () => {
    if (imageWrapRef.current) setImageWidth(imageWrapRef.current.offsetWidth)
  }

  return (
    <div
      style={styles.overlay}
      role="dialog"
      aria-modal
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div style={styles.lightbox} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'inline-block', maxWidth: '100%', width: imageWidth ?? undefined }}>
        {lightbox.imageUrl || lightbox.thumbUrl ? (
          <div ref={imageWrapRef} style={{ position: 'relative', minHeight: 120 }}>
            {hasBigImage && lightbox.thumbUrl ? (
              <>
                <img
                  src={lightbox.thumbUrl}
                  alt=""
                  style={{
                    ...styles.lightboxImg,
                    display: 'block',
                    opacity: bigImageLoaded ? 0 : 1,
                    transition: 'opacity 0.2s ease',
                  }}
                  onLoad={measureImageWidth}
                />
                <img
                  src={lightbox.imageUrl}
                  alt=""
                  style={{
                    ...styles.lightboxImg,
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    opacity: bigImageLoaded ? 1 : 0,
                    transition: 'opacity 0.2s ease',
                  }}
                  onLoad={() => {
                    setBigImageLoaded(true)
                    measureImageWidth()
                  }}
                />
              </>
            ) : (
              <img
                src={lightbox.imageUrl || lightbox.thumbUrl}
                alt=""
                style={styles.lightboxImg}
                onLoad={measureImageWidth}
              />
            )}
          </div>
        ) : (
          <div style={styles.lightboxPlaceholder}>无大图</div>
        )}
        <div style={{ ...styles.lightboxCaption, maxWidth: imageWidth ?? undefined, minWidth: 0 }}>
          <div
            style={{ ...styles.lightboxName, display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6 }}
            title="点击复制"
            onClick={(e) => {
              e.stopPropagation()
              onCopyTitle()
            }}
            role="button"
          >
            <span style={{ flex: '1 1 auto', minWidth: 0 }}>{displayTitle()}</span>
            {lightbox.isCopyright && (
              <span
                style={{
                  fontSize: 10,
                  padding: '1px 6px',
                  borderRadius: 4,
                  background: 'var(--danger-soft)',
                  color: 'var(--danger)',
                  fontWeight: 600,
                  flexShrink: 0,
                }}
              >
                版权素材
              </span>
            )}
          </div>
          <div style={styles.lightboxIdRow}>
            <span style={{ marginRight: 4 }}>内容ID</span>
            <code
              style={{ ...styles.code, cursor: 'pointer' }}
              title="点击复制"
              onClick={(e) => {
                e.stopPropagation()
                onCopyId()
              }}
              role="button"
            >
              {lightbox.id}
            </code>
            <a
              href={
                platform === 'gaoding'
                  ? gaodingContentUrl(lightbox.id, lightbox.isUgc)
                  : originalPageUrl(platform, [lightbox.id], 1000)
              }
              target="_blank"
              rel="noreferrer"
              style={styles.btnMiniLink}
              onClick={(e) => e.stopPropagation()}
            >
              大内容打开
            </a>
          </div>
          {lightbox.pinId && (
            <div style={{ ...styles.lightboxIdRow, marginTop: 4 }}>
              <span style={{ marginRight: 4 }}>PIN_ID</span>
              <code
                style={{ ...styles.code, cursor: 'pointer' }}
                title="点击复制"
                onClick={(e) => {
                  e.stopPropagation()
                  onCopyPinId?.()
                }}
                role="button"
              >
                {lightbox.pinId}
              </code>
              <a
                href={`https://huaban.com/pins/${lightbox.pinId}`}
                target="_blank"
                rel="noreferrer"
                style={styles.btnMiniLink}
                onClick={(e) => e.stopPropagation()}
              >
                在花瓣打开
              </a>
            </div>
          )}
        </div>
        </div>
      </div>
    </div>
  )
}
