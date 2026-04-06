import { useState, useRef } from 'react'
import { Ask } from '../../wailsjs/go/main/App'

function Input({ setMessages, loading, setLoading }) {
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const inputRef = useRef(null)

  const handleSend = async () => {
    const trimmed = query.trim()
    if (!trimmed || loading) return

    setHistory(prev => [trimmed, ...prev])
    setHistIdx(-1)
    setMessages(prev => [...prev, { type: 'user', content: trimmed }])
    setQuery('')
    setLoading(true)

    try {
      const suggestions = await Ask(trimmed)
      setMessages(prev => [...prev, { type: 'assistant', suggestions }])
    } catch (err) {
      const msg = typeof err === 'string'
        ? err
        : (err?.message || 'Failed to get suggestions. Check your API key.')
      setMessages(prev => [...prev, { type: 'error', content: msg }])
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      return
    }

    // History navigation
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (history.length === 0) return
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      setQuery(history[next])
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (histIdx <= 0) {
        setHistIdx(-1)
        setQuery('')
        return
      }
      const next = histIdx - 1
      setHistIdx(next)
      setQuery(history[next])
    }
  }

  return (
    <div className="input-area">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={e => { setQuery(e.target.value); setHistIdx(-1) }}
        onKeyDown={handleKeyDown}
        placeholder="ask something... (↑↓ for history)"
        disabled={loading}
        className="input-field"
        autoFocus
      />
      <button
        onClick={handleSend}
        disabled={loading || !query.trim()}
        className="send-btn"
        title="Send (Enter)"
      >
        ↵
      </button>
    </div>
  )
}

export default Input
