import { WindowMinimise, Quit } from '../../wailsjs/runtime/runtime'
import { SetAlwaysOnTop, SaveTheme } from '../../wailsjs/go/main/App'
import { useState } from 'react'

const PROVIDER_LABELS = {
  groq: 'Groq',
  openai: 'GPT',
  anthropic: 'Claude',
}

function TitleBar({ theme, onToggleTheme, onClearChat, onToggleSettings, hasMessages, provider, inSettings }) {
  const [pinned, setPinned] = useState(false)

  const handlePin = () => {
    const next = !pinned
    setPinned(next)
    SetAlwaysOnTop(next)
  }

  const handleThemeToggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    onToggleTheme(next)
    SaveTheme(next)
  }

  return (
    <div className="titlebar">
      <div className="titlebar-left">
        <span className="titlebar-title">ai assistant</span>
        {provider && (
          <span className="provider-badge">{PROVIDER_LABELS[provider] || provider}</span>
        )}
      </div>

      <div className="titlebar-controls">
        {/* Theme toggle */}
        <button
          className="titlebar-btn"
          onClick={handleThemeToggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? '☀' : '☾'}
        </button>

        {/* Clear chat — only when chat has messages and not in settings */}
        {hasMessages && !inSettings && (
          <button
            className="titlebar-btn titlebar-clear"
            onClick={onClearChat}
            title="Clear chat"
          >
            ⌫
          </button>
        )}

        {/* Settings toggle */}
        <button
          className={`titlebar-btn${inSettings ? ' titlebar-btn-active' : ''}`}
          onClick={onToggleSettings}
          title={inSettings ? 'Back to chat' : 'Settings'}
        >
          {inSettings ? '✕' : '⚙'}
        </button>

        {/* Pin */}
        <button
          className={`titlebar-btn${pinned ? ' titlebar-btn-active' : ''}`}
          onClick={handlePin}
          title={pinned ? 'Unpin window' : 'Pin on top'}
        >
          ⊕
        </button>

        {/* Minimize */}
        <button className="titlebar-btn" onClick={WindowMinimise} title="Minimize">
          ─
        </button>

        {/* Close */}
        <button className="titlebar-btn titlebar-close" onClick={Quit} title="Close">
          ✕
        </button>
      </div>
    </div>
  )
}

export default TitleBar
