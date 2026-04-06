import { useState, useEffect } from 'react'
import { IsConfigured, LoadConfig } from '../wailsjs/go/main/App'
import Setup from './components/Setup.jsx'
import Settings from './components/Settings.jsx'
import TitleBar from './components/TitleBar.jsx'
import Chat from './components/Chat.jsx'
import Input from './components/Input.jsx'

function App() {
  const [configured, setConfigured] = useState(null)
  const [screen, setScreen] = useState('chat') // 'chat' | 'settings'
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(false)
  const [theme, setTheme] = useState('dark')
  const [provider, setProvider] = useState('groq')

  useEffect(() => {
    IsConfigured()
      .then(ok => {
        setConfigured(ok)
        if (ok) {
          LoadConfig().then(cfg => {
            if (cfg.theme) setTheme(cfg.theme)
            if (cfg.provider) setProvider(cfg.provider)
          }).catch(() => {})
        }
      })
      .catch(() => setConfigured(false))
  }, [])

  const clearChat = () => setMessages([])

  const handleToggleTheme = (newTheme) => {
    setTheme(newTheme)
  }

  const handleSettingsSaved = (cfg) => {
    if (cfg.theme) setTheme(cfg.theme)
    if (cfg.provider) setProvider(cfg.provider)
    setScreen('chat')
  }

  if (configured === null) {
    return (
      <div className="app-loading" data-theme="dark">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
    )
  }

  if (!configured) {
    return <Setup onComplete={() => { setConfigured(true); setScreen('chat') }} />
  }

  return (
    <div className="app" data-theme={theme}>
      <TitleBar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onClearChat={clearChat}
        onToggleSettings={() => setScreen(s => s === 'settings' ? 'chat' : 'settings')}
        hasMessages={messages.length > 0}
        provider={provider}
        inSettings={screen === 'settings'}
      />

      {screen === 'chat' ? (
        <>
          <Chat messages={messages} loading={loading} />
          <Input
            setMessages={setMessages}
            loading={loading}
            setLoading={setLoading}
          />
        </>
      ) : (
        <Settings
          onBack={() => setScreen('chat')}
          onSaved={handleSettingsSaved}
          onThemePreview={setTheme}
          currentTheme={theme}
        />
      )}
    </div>
  )
}

export default App
