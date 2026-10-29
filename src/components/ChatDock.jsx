import React, { useEffect, useState } from 'react'
import { TutorChat, loadChats, resolveChatScope, scopeLabel } from './TutorChat.jsx'

// Dock chat nổi: panel cố định bên phải, hội thoại không mất khi đổi bài.
// Mở bằng nút "Gia sư bám bài" ở từng phần, hoặc nút 💵 nổi góc phải dưới
// để mở lại các phiên gần nhất. Mobile: thành bottom-sheet.
export function ChatDock({ s, open, onToggle, onClose, onOpen }) {
  const [scope, setScope] = useState(null)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    const h = (e) => {
      const d = e.detail || {}
      setScope(`${d.kind}-${d.dayId}${d.kind === 'lab' && d.labId ? `-${d.labId}` : d.index !== undefined ? `-${d.index}` : ''}`)
      setTick(t => t + 1)
      onOpen?.()
    }
    window.addEventListener('beapp-open-chat', h)
    return () => window.removeEventListener('beapp-open-chat', h)
  }, [])
  useEffect(() => { if (open) setTick(t => t + 1) }, [open])

  const sessions = Object.entries(loadChats())
    .filter(([, v]) => v?.msgs?.length)
    .sort((a, b) => (b[1].at || 0) - (a[1].at || 0))
    .slice(0, 8)
  const cur = scope ? resolveChatScope(scope) : null

  return <>
    <button className={`dock-launch ${open ? 'on' : ''}`} title="Gia sư bám bài (Esc để đóng)" onClick={onToggle}>💬</button>
    <div className={`dock ${open ? 'open' : ''}`} role="dialog" aria-label="Gia sư bám bài">
      <div className="dock-head">
        <strong>💬 Gia sư bám bài</strong>
        <button className="btn ghost small" onClick={onClose}>Đóng ✕</button>
      </div>
      {sessions.length > 0 && <div className="dock-tabs">
        {sessions.map(([sc, v]) => <button key={sc} className={`chip ${sc === scope ? 'on' : ''}`} onClick={() => setScope(sc)}>{scopeLabel(sc)} · {v.msgs.length}</button>)}
      </div>}
      <div className="dock-body">
        {cur
          ? <TutorChat key={scope + ':' + tick} s={s} day={cur.day} kind={cur.kind} index={cur.index} lab={cur.lab} openedHints={cur.openedHints} />
          : <div className="dock-empty">
              <p>Chọn một phần bài học để hỏi gia sư: bấm nút <strong>"💬 Gia sư bám bài"</strong> ở bài tập, lab, khái niệm hoặc checkpoint.</p>
              {sessions.length
                ? <p className="mut">Các phiên gần nhất đã liệt kê ở trên — bấm để mở lại đúng chỗ đang dở.</p>
                : <p className="mut">Chưa có phiên nào. Cần API key? Vào Cài đặt → AI Gia sư, hoặc dùng "Sao chép bối cảnh" để hỏi ở AI ngoài.</p>}
            </div>}
      </div>
    </div>
  </>
}
