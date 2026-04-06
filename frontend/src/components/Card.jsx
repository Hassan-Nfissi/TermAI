import { useState } from 'react'
import { CopyToClipboard } from '../../wailsjs/go/main/App'

function Card({ suggestion }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    if (copied) return
    await CopyToClipboard(suggestion.command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="card" onClick={handleCopy} title="Click to copy">
      <div className="card-content">
        <span className="card-command">{suggestion.command}</span>
        <span className="card-description">{suggestion.description}</span>
      </div>
      <div className={`card-copy${copied ? ' copied' : ''}`}>
        {copied ? '✓' : '⎘'}
      </div>
    </div>
  )
}

export default Card
