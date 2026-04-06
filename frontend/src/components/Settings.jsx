import { useState, useEffect } from 'react'
import { LoadConfig, SaveSettings } from '../../wailsjs/go/main/App'

const PROVIDERS = [
  { id: 'groq',      name: 'Groq',      label: 'free · fastest', model: 'llama-3.1-8b-instant'   },
  { id: 'openai',    name: 'OpenAI',    label: 'paid',           model: 'gpt-4o-mini'             },
  { id: 'anthropic', name: 'Anthropic', label: 'paid',           model: 'claude-sonnet-4-20250514' },
]

function Settings({ onBack, onSaved, onThemePreview, currentTheme }) {
  const [provider, setProvider]   = useState('groq')
  const [apiKey,   setApiKey]     = useState('')
  const [model,    setModel]      = useState('llama-3.1-8b-instant')
  const [theme,    setTheme]      = useState(currentTheme || 'dark')
  const [error,    setError]      = useState('')
  const [saving,   setSaving]     = useState(false)
  const [saved,    setSaved]      = useState(false)
  const [loaded,   setLoaded]     = useState(false)

  useEffect(() => {
    LoadConfig().then(cfg => {
      if (cfg.provider) setProvider(cfg.provider)
      if (cfg.api_key)  setApiKey(cfg.api_key)
      if (cfg.model)    setModel(cfg.model)
      setTheme(cfg.theme || currentTheme || 'dark')
      setLoaded(true)
    }).catch(() => setLoaded(true))
  }, [])

  const handleProviderChange = (pid) => {
    setProvider(pid)
    const p = PROVIDERS.find(x => x.id === pid)
    if (p) setModel(p.model)
  }

  const handleThemeChange = (t) => {
    setTheme(t)
    onThemePreview(t)
  }

  const handleSave = async () => {
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }
    if (!model.trim()) {
      setError('Model name is required')
      return
    }
    setError('')
    setSaving(true)
    try {
      const ok = await SaveSettings(provider, apiKey.trim(), model.trim(), theme)
      if (ok) {
        setSaved(true)
        setTimeout(() => {
          setSaved(false)
          onSaved({ provider, theme })
        }, 900)
      } else {
        setError('Failed to save. Check file permissions.')
      }
    } catch {
      setError('Unexpected error.')
    } finally {
      setSaving(false)
    }
  }

  if (!loaded) {
    return (
      <div className="settings-loading">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </div>
    )
  }

  return (
    <div className="settings">
      <div className="settings-body">

        {/* Provider */}
        <div className="settings-section">
          <label className="settings-label">Provider</label>
          <div className="setup-providers">
            {PROVIDERS.map(p => (
              <button
                key={p.id}
                className={`provider-btn${provider === p.id ? ' selected' : ''}`}
                onClick={() => handleProviderChange(p.id)}
              >
                <span className="provider-name">{p.name}</span>
                <span className="provider-label">{p.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Model */}
        <div className="settings-section">
          <label className="settings-label">Model</label>
          <input
            type="text"
            value={model}
            onChange={e => setModel(e.target.value)}
            className="setup-input"
            placeholder="model name"
            spellCheck={false}
          />
          <span className="settings-hint">Change for custom or newer models</span>
        </div>

        {/* API Key */}
        <div className="settings-section">
          <label className="settings-label">API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            className="setup-input"
            placeholder="paste your API key..."
          />
        </div>

        {/* Theme */}
        <div className="settings-section">
          <label className="settings-label">Theme</label>
          <div className="theme-toggle">
            <button
              className={`theme-btn${theme === 'dark' ? ' selected' : ''}`}
              onClick={() => handleThemeChange('dark')}
            >
              ☾ Dark
            </button>
            <button
              className={`theme-btn${theme === 'light' ? ' selected' : ''}`}
              onClick={() => handleThemeChange('light')}
            >
              ☀ Light
            </button>
          </div>
        </div>

        {error && <div className="setup-error">✗ {error}</div>}

        <button
          className={`start-btn${saved ? ' saved' : ''}`}
          onClick={handleSave}
          disabled={saving || saved}
        >
          {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </div>
    </div>
  )
}

export default Settings
