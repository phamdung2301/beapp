// Tầng giao tiếp LLM chạy thẳng từ trình duyệt (BYOK — key của người học).
// Hỗ trợ 3 nhà cung cấp, tự nhận diện theo định dạng key:
//   - Google Gemini: key "AQ." (định dạng mới của Google Cloud API key)
//     hoặc "AIza" (AI Studio cũ) — dùng tầng OpenAI-compatible của Google.
//   - Groq: key "gsk_".
//   - Custom: endpoint khác tương thích OpenAI (Ollama, OpenRouter, vLLM…).
// Mỗi nhà cung cấp chứa được NHIỀU KEY (mỗi dòng 1 key ở Cài đặt). Khi request
// gặp 429 (hết quota) / 401 / 403 thì tự xoay sang key kế tiếp; nếu cấu hình
// provider "auto" thì khi hết sạch key Gemini sẽ đổ sang key Groq (và ngược lại).
// Vị trí xoay được ghi nhớ (sticky) để không đốt request vào key đang chết.
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

export const KEY_PROVIDERS = ['gemini', 'groq']

function keyMatches(provider, key) {
  if (provider === 'gemini') return /^AQ[./]/.test(key) || key.startsWith('AIza')
  if (provider === 'groq') return key.startsWith('gsk_')
  return false
}

// Danh sách key của 1 provider: lưu mới per-provider (cfg.keys) + key legacy
// (cfg.key của bản cũ) được nhận diện theo prefix để không mất dữ liệu cũ.
export function keysFor(provider, cfg) {
  const out = []
  const push = (k) => { const t = String(k || '').trim(); if (t && !out.includes(t)) out.push(t) }
  const per = cfg?.keys?.[provider]
  if (Array.isArray(per)) per.forEach(push)
  const legacy = (cfg?.key || '').trim()
  if (legacy && (provider === 'custom' || keyMatches(provider, legacy))) push(legacy)
  return out
}

export function maskKey(k) {
  const s = String(k || '').trim()
  return s.length <= 12 ? s : s.slice(0, 8) + '…' + s.slice(-4)
}

// Provider nào sẽ được dùng: chọn tường minh nếu có; "auto" thì ưu tiên provider
// đang có key (Gemini trước), rồi endpoint custom.
export function resolveProvider(cfg) {
  const p = (cfg?.provider || 'auto').trim()
  if (p && p !== 'auto' && PROVIDERS[p]) return p
  if (keysFor('gemini', cfg).length) return 'gemini'
  if (keysFor('groq', cfg).length) return 'groq'
  const legacy = (cfg?.key || '').trim()
  if (/^AQ[./]/.test(legacy) || legacy.startsWith('AIza')) return 'gemini'
  if (legacy.startsWith('gsk_')) return 'groq'
  const endpoint = cfg?.endpoint || ''
  if (endpoint.includes('generativelanguage.googleapis.com')) return 'gemini'
  if (endpoint.includes('api.groq.com')) return 'groq'
  return 'custom'
}

// Tên hiển thị cho các nơi cũ vẫn gọi detectProvider.
export const detectProvider = resolveProvider

// Đã cấu hình đủ để gọi AI chưa: có ít nhất 1 key ở provider nào đó,
// hoặc custom có endpoint (Ollama local không cần key).
export function hasConfig(cfg) {
  const p = resolveProvider(cfg)
  if (p === 'custom') return !!(cfg?.endpoint || '').trim()
  return keysFor('gemini', cfg).length > 0 || keysFor('groq', cfg).length > 0
}

export function baseOf(provider, cfg) {
  if (provider === 'custom') {
    return (cfg?.endpoint || '').trim().replace(/\/+$/, '').replace(/\/chat\/completions$/, '')
  }
  return PROVIDERS[provider].base
}

// Model per-provider: cfg.models[provider] đè lên mặc định; legacy cfg.model
// vẫn được nhận nếu modelFor không có gì khác.
export function modelFor(provider, cfg) {
  return (cfg?.models?.[provider] || '').trim()
    || PROVIDERS[provider]?.defaultModel
    || (cfg?.model || '').trim()
    || ''
}

// Vị trí xoay key được ghi nhớ theo provider (sticky): key nào sống thì giữ dùng,
// key nào chết thì lần sau bắt đầu từ key kế bên.
const ROTATE_KEY = 'beapp-llm-rotate-v1'
function loadRotate() { try { return JSON.parse(localStorage.getItem(ROTATE_KEY)) || {} } catch { return {} } }
function saveRotate(st) { try { localStorage.setItem(ROTATE_KEY, JSON.stringify(st)) } catch { /* bỏ qua */ } }

// Key đang được "chỉ định" tiếp theo của provider (để Cài đặt hiển thị).
export function activeKeyIndex(provider) {
  const r = loadRotate()
  return r[provider]
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
  if (status === 429) return `Key này hết quota hoặc vượt giới hạn tốc độ (HTTP 429)${'' }. Chờ một lát hoặc để app xoay sang key khác. Chi tiết: ${t}`
  if (status === 401 || status === 403) return `Key bị từ chối (HTTP ${status}). Kiểm tra key còn hạn, đúng loại key cho provider, và API tương ứng đã được bật. Chi tiết: ${t}`
  if (status === 404) return `Không tìm thấy model hoặc endpoint (HTTP 404). Bấm “Kiểm tra key & tải danh sách model” ở Cài đặt để lấy đúng tên model. Chi tiết: ${t}`
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

// Một lần gọi API với ĐÚNG 1 key. Ném lỗi kèm cờ e.rotate=true khi lỗi nằm ở key
// (429 hết quota, 401/403 key chết) — tín hiệu để tầng trên xoay sang key khác.
async function attempt(provider, base, model, key, messages, { signal, onDelta, maxTokens = 900, temperature = 0.4 }) {
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
    // Endpoint không nhận stream:true → thử lại 1 lần không stream (cùng key).
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
    const err = new Error(friendlyError(res.status, txt))
    err.rotate = res.status === 429 || res.status === 401 || res.status === 403
    err.status = res.status
    throw err
  }
  const ct = res.headers.get('content-type') || ''
  if (!res.body || !ct.includes('event-stream')) return readPlain(res, onDelta)
  return readSSE(res, onDelta)
}

// Gửi 1 hội thoại. messages: [{role, content}]. opts: {signal, onDelta, maxTokens, temperature}.
// Thứ tự thử: provider chính (theo cfg.provider, "auto" = Gemini trước) → từng key của
// provider đó bắt đầu từ vị trí xoay đã ghi nhớ → nếu "auto" và hết sạch key thì đổ
// sang provider khác đang có key. Lỗi không liên quan key (400, mạng) thì dừng ngay.
export async function chatCompletion(cfg, messages, opts = {}) {
  const primary = resolveProvider(cfg)
  const providerOrder = [primary]
  if ((cfg?.provider || 'auto') === 'auto') {
    for (const p of ['gemini', 'groq', 'custom']) {
      if (providerOrder.includes(p)) continue
      if (keysFor(p, cfg).length || (p === 'custom' && (cfg?.endpoint || '').trim())) providerOrder.push(p)
    }
  }
  const rotate = loadRotate()
  let lastErr = null
  for (const provider of providerOrder) {
    const base = baseOf(provider, cfg)
    if (!base) { lastErr = new Error('Endpoint trống. Vào Cài đặt → AI Gia sư, chọn provider hoặc nhập endpoint.'); continue }
    const model = modelFor(provider, cfg)
    if (!model) { lastErr = new Error('Chưa có model cho ' + PROVIDERS[provider].label + '. Nhập ở Cài đặt hoặc bấm “Kiểm tra key & tải danh sách model”.'); continue }
    const keys = keysFor(provider, cfg)
    if (provider !== 'custom' && !keys.length) continue
    // Thứ tự key: bắt đầu từ vị trí đã ghi nhớ, xoay vòng qua hết danh sách.
    const start = keys.length ? ((rotate[provider] || 0) % keys.length) : 0
    const order = keys.map((_, i) => keys[(start + i) % keys.length])
    for (let i = 0; i < order.length; i++) {
      const key = order[i]
      try {
        const content = await attempt(provider, base, model, key, messages, opts)
        if (keys.length) { rotate[provider] = keys.indexOf(key); saveRotate(rotate) }
        return content
      } catch (e) {
        if (e?.name === 'AbortError') throw e
        lastErr = e
        if (e?.rotate && keys.length) {
          // Key này chết/hết quota: ghi nhớ để lần sau bỏ qua, thử key kế tiếp.
          rotate[provider] = (keys.indexOf(key) + 1) % keys.length
          saveRotate(rotate)
          continue
        }
        throw e // lỗi không liên quan key (400 sai model, mạng…) — xoay cũng vô ích
      }
    }
  }
  throw lastErr || new Error('Chưa cấu hình API key. Vào Cài đặt → AI Gia sư để nhập key (AQ./AIza của Google hoặc gsk_ của Groq).')
}

// Lọc bỏ model không dùng cho chat (embedding, tts, imagen, guard…).
const BAD_MODEL = /embed|embedding|whisper|tts|imagen|veo|video|audio|live|aqa|rerank|guard|moderation/i

// Lấy danh sách model với ĐÚNG 1 key (dùng cho nút kiểm tra từng key).
export async function listModelsForKey(cfg, provider, key) {
  const base = baseOf(provider, cfg)
  if (!base) throw new Error('Endpoint trống.')
  const h = buildHeaders(provider, key)
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
      const list = ids.filter(id => id && !BAD_MODEL.test(id))
      if (list.length) return list.sort()
      throw new Error('Key kết nối được nhưng không có model chat nào dùng được.')
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

export async function listModels(cfg, provider = resolveProvider(cfg)) {
  const keys = keysFor(provider, cfg)
  if (provider !== 'custom' && !keys.length) throw new Error('Chưa có key cho ' + PROVIDERS[provider].label + '.')
  return listModelsForKey(cfg, provider, keys[0] || '')
}

// Kiểm tra TỪNG key của một provider: trả về trạng thái từng key để Cài đặt
// hiển thị key nào sống, key nào hết quota. Không xoay vị trí đã ghi nhớ.
export async function checkKeys(cfg, provider) {
  const keys = keysFor(provider, cfg)
  const out = []
  for (const k of keys) {
    try {
      const ids = await listModelsForKey(cfg, provider, k)
      out.push({ key: maskKey(k), ok: true, n: ids.length, detail: `${ids.length} model chat khả dụng, ví dụ: ${ids.slice(0, 3).join(', ')}` })
    } catch (e) {
      out.push({ key: maskKey(k), ok: false, detail: String(e.message || e).slice(0, 160) })
    }
  }
  return out
}
