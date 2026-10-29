// Tầng giao tiếp LLM chạy thẳng từ trình duyệt (BYOK — key của người học).
// Hỗ trợ 3 nhà cung cấp, tự nhận diện theo định dạng key:
//   - Google Gemini: key "AQ." (định dạng mới của Google Cloud API key)
//     hoặc "AIza" (AI Studio cũ) — dùng tầng OpenAI-compatible của Google.
//   - Groq: key "gsk_".
//   - Custom: endpoint khác tương thích OpenAI (Ollama, OpenRouter, vLLM…).
// Toàn bộ request đi đúng 1 giao thức /chat/completions, có stream SSE,
// có fallback không stream khi endpoint từ chối stream:true.

export const PROVIDERS = {
  gemini: {
    label: 'Google Gemini',
    base: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-2.5-flash',
    keyHint: 'Key bắt đầu bằng “AQ.” (Google Cloud) hoặc “AIza” (AI Studio)',
    console: 'https://aistudio.google.com/apikey',
  },
  groq: {
    label: 'Groq',
    base: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyHint: 'Key bắt đầu bằng “gsk_”',
    console: 'https://console.groq.com/keys',
  },
  custom: {
    label: 'Endpoint khác (OpenAI-compatible)',
    base: '',
    defaultModel: '',
    keyHint: 'Nhập endpoint dạng …/v1/chat/completions',
    console: '',
  },
}

// Provider nhận diện từ cfg.provider, nếu "auto" thì đoán theo key rồi endpoint.
export function detectProvider(cfg) {
  const p = (cfg?.provider || 'auto').trim()
  const key = (cfg?.key || '').trim()
  const endpoint = cfg?.endpoint || ''
  if (p && p !== 'auto' && PROVIDERS[p]) return p
  if (/^AQ[./]/.test(key) || key.startsWith('AIza')) return 'gemini'
  if (key.startsWith('gsk_')) return 'groq'
  if (endpoint.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (endpoint.includes('api.groq.com')) return 'groq'
  return 'custom'
}

export function baseOf(provider, cfg) {
  if (provider === 'custom') {
    return (cfg?.endpoint || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '')
  }
  return PROVIDERS[provider].base
}

export function defaultModelFor(provider, cfg) {
  return (cfg?.model || '').trim() || PROVIDERS[provider]?.defaultModel || ''
}

function buildHeaders(provider, key) {
  const h = { 'Content-Type': 'application/json' }
  if (key) {
    h['Authorization'] = `Bearer ${key}`
    // Key "AQ." mới của Google Cloud nhận x-goog-api-key trên endpoint native;
    // tầng OpenAI-compat nhận Bearer. Gửi cả hai để không kén định dạng key.
    if (provider === 'gemini') h['x-goog-api-key'] = key
  }
  return h
}

export function friendlyError(status, body) {
  const t = String(body || '').replace(/\s+/g, ' ').slice(0, 300)
  if (status === 401 || status === 403) return `Key bị từ chối (HTTP ${status}). Kiểm tra key còn hạn, đúng loại key cho provider, và API tương ứng đã được bật. Chi tiết: ${t}`
  if (status === 404) return `Không tìm thấy model hoặc endpoint (HTTP 404). Bấm “Kiểm tra key & tải danh sách model” ở Cài đặt để lấy đúng tên model. Chi tiết: ${t}`
  if (status === 429) return `Vượt giới hạn tốc độ hoặc hết hạn mức miễn phí (HTTP 429). Chờ một lát rồi thử lại. Chi tiết: ${t}`
  if (status >= 500) return `Lỗi phía nhà cung cấp (HTTP ${status}). Thử lại sau. Chi tiết: ${t}`
  return `Lỗi HTTP ${status}. Chi tiết: ${t}`
}

async function readPlain(res, onDelta) {
  const data = await res.json()
  const content = data.choices?.[0]?.message?.content || ''
  if (content) onDelta?.(content)
  return content
}

async function readSSE(res, onDelta) {
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = '', out = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    let i
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim()
      buf = buf.slice(i + 1)
      if (!line.startsWith('data:')) continue
      const payload = line.slice(5).trim()
      if (payload === '[DONE]') continue
      try {
        const j = JSON.parse(payload)
        const delta = j.choices?.[0]?.delta?.content || j.choices?.[0]?.message?.content || ''
        if (delta) { out += delta; onDelta?.(delta) }
      } catch { /* dòng dở dang giữa các chunk — bỏ qua */ }
    }
  }
  return out
}

// Gửi 1 hội thoại. messages: [{role, content}]. opts: {signal, onDelta, maxTokens, temperature}.
export async function chatCompletion(cfg, messages, opts = {}) {
  const { signal, onDelta, maxTokens = 900, temperature = 0.4 } = opts
  const provider = detectProvider(cfg)
  const key = (cfg?.key || '').trim()
  if (!key && provider !== 'custom') throw new Error('Chưa có API key. Vào Cài đặt → AI Gia sư để nhập key (AQ./AIza của Google hoặc gsk_ của Groq).')
  const base = baseOf(provider, cfg)
  if (!base) throw new Error('Endpoint trống. Vào Cài đặt → AI Gia sư, chọn provider hoặc nhập endpoint.')
  const model = defaultModelFor(provider, cfg)
  if (!model) throw new Error('Chưa chọn model. Nhập tên model ở Cài đặt hoặc bấm “Kiểm tra key & tải danh sách model”.')
  const body = { model, messages, temperature, max_tokens: maxTokens }
  let res
  try {
    res = await fetch(base + '/chat/completions', {
      method: 'POST',
      headers: buildHeaders(provider, key),
      body: JSON.stringify({ ...body, stream: true }),
      signal,
    })
  } catch (e) {
    if (e?.name === 'AbortError') throw e
    throw new Error('Không kết nối được endpoint (mạng hoặc CORS). Chi tiết: ' + (e.message || e))
  }
  if (!res.ok) {
    const txt = await res.text().catch(() => '')
    // Endpoint không nhận stream:true → thử lại 1 lần không stream.
    if (res.status === 400 && !signal?.aborted) {
      try {
        const r2 = await fetch(base + '/chat/completions', {
          method: 'POST',
          headers: buildHeaders(provider, key),
          body: JSON.stringify(body),
          signal,
        })
        if (r2.ok) return await readPlain(r2, onDelta)
      } catch { /* rơi xuống throw bên dưới */ }
    }
    throw new Error(friendlyError(res.status, txt))
  }
  const ct = res.headers.get('content-type') || ''
  if (!res.body || !ct.includes('event-stream')) return readPlain(res, onDelta)
  return readSSE(res, onDelta)
}

// Lọc bỏ model không dùng cho chat (embedding, tts, imagen, guard…).
const BAD_MODEL = /embed|embedding|whisper|tts|imagen|veo|video|audio|live|aqa|rerank|guard|moderation/i

// GET /models để đổ vào ô chọn model — xử lý chỗ provider "kén config":
// người học bấm 1 nút là thấy đúng những model key của mình chạy được.
export async function listModels(cfg) {
  const provider = detectProvider(cfg)
  const base = baseOf(provider, cfg)
  if (!base) throw new Error('Endpoint trống.')
  const h = buildHeaders(provider, (cfg?.key || '').trim())
  delete h['Content-Type']
  let res = await fetch(base + '/models', { headers: h }).catch(() => null)
  if (provider === 'gemini' && (!res || !res.ok)) {
    // Fallback sang API native của Google (v1beta/models) cho key AQ. chưa được tầng compat nhận.
    const r2 = await fetch('https://generativelanguage.googleapis.com/v1beta/models', { headers: h }).catch(() => null)
    if (r2 && r2.ok) {
      const data = await r2.json()
      const ids = (data.models || [])
        .filter(m => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map(m => (m.name || '').replace(/^models\//, ''))
      return ids.filter(id => id && !BAD_MODEL.test(id)).sort()
    }
  }
  if (!res) throw new Error('Không kết nối được endpoint lấy danh sách model (mạng hoặc CORS).')
  if (!res.ok) throw new Error(friendlyError(res.status, await res.text().catch(() => '')))
  const data = await res.json()
  const ids = (data.data || data.models || []).map(m => (m.id || m.name || '').replace(/^models\//, ''))
  const chat = ids.filter(id => id && !BAD_MODEL.test(id))
  if (!chat.length) throw new Error('Endpoint trả về danh sách model nhưng không có model chat nào dùng được.')
  return chat.sort()
}
