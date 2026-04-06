import { useState } from 'react'
import { SaveConfig } from '../../wailsjs/go/main/App'

const PROVIDERS = [
  {
    id: 'groq',
    name: 'Groq',
    label: 'free · fastest',
    model: 'llama-3.1-8b-instant',
  },
  {
    id: 'openai',
    name: 'OpenAI',
    label: 'paid',
    model: 'gpt-4o-mini',
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    label: 'paid',
    model: 'claude-sonnet-4-20250514',
  },
]

function Setup({ onComplete }) {
  const [provider, setProvider] = useState('groq')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const selectedProvider = PROVIDERS.find(p => p.id === provider)

  const handleStart = async () => {
    if (!apiKey.trim()) {
      setError('API key is required')
      return
    }
    setError('')
    setLoading(true)

    try {
      const ok = await SaveConfig(provider, apiKey.trim(), selectedProvider.model)
      if (ok) {
        onComplete()
      } else {
        setError('Failed to save config. Check file permissions.')
      }
    } catch (err) {
      setError('Unexpected error. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleStart()
  }

  return (
    <div className="setup">
      <div className="setup-header">
        <h1 className="setup-title">ai assistant</h1>
        <p className="setup-subtitle">Choose provider &amp; paste API key</p>
      </div>

      <div className="setup-providers">
        {PROVIDERS.map(p => (
          <button
            key={p.id}
            className={`provider-btn${provider === p.id ? ' selected' : ''}`}
            onClick={() => setProvider(p.id)}
          >
            <span className="provider-name">{p.name}</span>
            <span className="provider-label">{p.label}</span>
          </button>
        ))}
      </div>

      <div className="setup-input-group">
        <input
          type="password"
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="paste your API key..."
          className="setup-input"
          autoFocus
        />
      </div>

      {error && <div className="setup-error">✗ {error}</div>}

      <button
        className="start-btn"
        onClick={handleStart}
        disabled={loading}
      >
        {loading ? 'Saving...' : 'Start'}
      </button>
    </div>
  )
}

export default Setup
