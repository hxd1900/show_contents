import { styles } from './styles'

export type HeaderToolbarProps = {
  originalLink: string
  showSettings: boolean
  setShowSettings: (v: boolean | ((s: boolean) => boolean)) => void
  theme: 'dark' | 'light'
  setTheme: (t: 'dark' | 'light' | ((prev: 'dark' | 'light') => 'dark' | 'light')) => void
  showToast: (message: string) => void
}

export function HeaderToolbar(props: HeaderToolbarProps) {
  const { originalLink, showSettings, setShowSettings, theme, setTheme, showToast } = props

  const handleShareLink = () => {
    void navigator.clipboard.writeText(window.location.href).then(() => showToast('链接已复制'))
  }

  return (
    <div style={styles.headerTop}>
      <h1 style={styles.title}>内容预览</h1>
      <div style={styles.headerActions}>
        <button
          type="button"
          style={styles.btnGhost}
          onClick={handleShareLink}
          aria-label="分享链接"
        >
          分享链接
        </button>
        <div style={{ position: 'relative' }}>
          <button
            type="button"
            style={styles.btnGhost}
            onClick={() => setShowSettings((s) => !s)}
            aria-label="选项"
            aria-haspopup="true"
            aria-expanded={showSettings}
          >
            选项
          </button>
          {showSettings && (
            <>
              <div
                style={styles.settingsBackdrop}
                onClick={() => setShowSettings(false)}
                aria-hidden
              />
              <div style={styles.settingsDropdown}>
                <button
                  type="button"
                  className="settings-item"
                  style={styles.settingsItem}
                  onClick={() => {
                    setTheme((t) => (t === 'dark' ? 'light' : 'dark'))
                    setShowSettings(false)
                  }}
                >
                  {theme === 'dark' ? '浅色模式' : '深色模式'}
                </button>
                <a
                  href={originalLink}
                  target="_blank"
                  rel="noreferrer"
                  className="settings-item"
                  style={{ ...styles.settingsItem, textDecoration: 'none' }}
                  onClick={() => setShowSettings(false)}
                >
                  打开原版页面
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
