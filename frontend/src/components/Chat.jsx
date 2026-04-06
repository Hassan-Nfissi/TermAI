import { useEffect, useRef } from 'react'
import Card from './Card.jsx'

function Chat({ messages, loading }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  return (
    <div className="chat-area">
      {messages.length === 0 && !loading && (
        <div className="chat-empty">
          <span>describe what you want to do</span>
          <span className="chat-empty-hint">e.g. "remove a directory" or "find large files"</span>
        </div>
      )}

      {messages.map((msg, i) => {
        if (msg.type === 'user') {
          return (
            <div key={i} className="message-row message-user">
              <div className="user-bubble">{msg.content}</div>
            </div>
          )
        }

        if (msg.type === 'assistant') {
          return (
            <div key={i} className="message-row message-assistant">
              {msg.suggestions.map((s, j) => (
                <Card key={j} suggestion={s} />
              ))}
            </div>
          )
        }

        if (msg.type === 'error') {
          return (
            <div key={i} className="message-row message-error">
              ✗ {msg.content}
            </div>
          )
        }

        return null
      })}

      {loading && (
        <div className="message-row message-assistant">
          <div className="loading">
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="dot"></span>
            <span className="loading-text">thinking...</span>
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  )
}

export default Chat
