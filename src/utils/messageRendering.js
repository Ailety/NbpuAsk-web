import MarkdownIt from 'markdown-it'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  breaks: false,
})

const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, env, self) => self.renderToken(tokens, idx, options))

md.validateLink = (url) => {
  const normalized = String(url || '')
    .trim()
    .toLowerCase()
  return !/^(javascript|vbscript|file|data):/.test(normalized)
}

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx]
  token.attrSet('target', '_blank')
  token.attrSet('rel', 'noopener noreferrer')
  return defaultLinkOpen(tokens, idx, options, env, self)
}

export function isThinkingMessage(message) {
  return message?.sender === 'model' && message.thinking === true
}

export function getThinkingSeconds(message, now = Date.now()) {
  if (!message || message.sender !== 'model') return null

  const duration = Number(message.thinkingDurationSeconds)
  if (Number.isFinite(duration)) return Math.max(0, duration)

  if (!isThinkingMessage(message) || !message.thinkingStartTime) return null

  const startTime = Number(message.thinkingStartTime)
  if (!Number.isFinite(startTime)) return 0

  return Math.max(0, Math.floor((now - startTime) / 1000))
}

export function getThinkingTitle(message) {
  return message?.isStreaming ? '宁青千问正在思考……' : '宁青千问正在思考上个问题中……'
}

export function renderMessage(message) {
  if (message?.sender === 'user') {
    return renderPlainText(message.message)
  }

  return renderMarkdown(message?.message)
}

export function renderPlainText(text = '') {
  return escapeHtml(text).replace(/\n/g, '<br>')
}

export function renderMarkdown(text = '') {
  if (!text) return ''

  try {
    let processed = normalizeMarkdownText(text)
    processed = processed.replace(/\*\*\s+([^*]+?)\s+\*\*/g, '**$1**')
    let rendered = md.render(processed)

    rendered = rendered.replace(/\^\[(\d+)\]\^/g, '<sup class="footnote-ref">[$1]</sup>')
    rendered = rendered.replace(
      /(<pre\b[^>]*>[\s\S]*?<\/pre>|<code\b[^>]*>[\s\S]*?<\/code>)|(\*\*)/gi,
      (match, codeBlock, stars) => {
        if (codeBlock) return codeBlock
        if (stars) return ''
        return match
      },
    )

    return rendered
  } catch (error) {
    console.error('Markdown 渲染错误:', error)
    return renderPlainText(text)
  }
}

function normalizeMarkdownText(text) {
  return String(text)
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}
