import React, { useEffect, useRef } from 'react'
import { DAYS } from '../data/days.js'

// Knowledge Galaxy — chữ ký hero của BEApp: 30 ngày học là 30 node phát sáng
// trên 5 vòng quỹ đạo tuần. Kéo để xoay, bấm node để vào ngày đó.
// Theo threejs-web-3d: lazy import three, DPR cap, pause chồng (offscreen + tab ẩn
// + reduced-motion + nút dừng chuyển động), lerp mọi chuyển động, dispose đủ,
// không WebGL thì trả null (CSS aurora nền vẫn hiển thị). Canvas chỉ trang trí.

const WEEK_COLORS = ['#c6f24e', '#8b7cff', '#4ee0f2', '#ffb84e', '#ff7a9e']
const RADII = [2.6, 3.4, 4.2, 5.0, 5.8]

function GalaxyHost({ done, onSelect, paused }) {
  const host = useRef(null)
  const tip = useRef(null)
  const pause = useRef(paused)
  const selectRef = useRef(onSelect)
  useEffect(() => { pause.current = paused }, [paused])
  useEffect(() => { selectRef.current = onSelect }, [onSelect])

  useEffect(() => {
    const el = host.current
    if (!el) return
    // Escape hatch cho máy có driver GPU hỏng hoặc trình duyệt WebGL không ổn định
    if (new URLSearchParams(location.search).has('no3d')) return
    let disposed = false
    let cleanup = null
    // three lazy-load: chunk riêng, không nằm trong bundle chính
    import('three').then(THREE => {
      if (disposed) return
      let renderer
      try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }) }
      catch { return /* không WebGL → giữ CSS aurora */ }
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.75))
      renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%'
      el.appendChild(renderer.domElement)
      const scene = new THREE.Scene()
      const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100)
      camera.position.set(0, 2.4, 7.6)
      camera.lookAt(0, -0.2, 0)

      const world = new THREE.Group()
      scene.add(world)
      const geo = new THREE.SphereGeometry(0.095, 12, 12)
      const mats = WEEK_COLORS.map(c => new THREE.MeshBasicMaterial({ color: c }))
      const doneMat = new THREE.MeshBasicMaterial({ color: '#ffffff' })
      const nodes = []

      DAYS.forEach(d => {
        const week = (d.week || 1) - 1
        const ringDays = DAYS.filter(x => x.week === d.week)
        const idx = ringDays.findIndex(x => x.id === d.id)
        const angle = (idx / ringDays.length) * Math.PI * 2 + week * 0.5
        const r = RADII[week]
        const mesh = new THREE.Mesh(geo, mats[week])
        mesh.position.set(Math.cos(angle) * r, 0, Math.sin(angle) * r)
        mesh.userData = { dayId: d.id, title: d.title, baseScale: 1, phase: angle * 3 }
        if (done[d.id]) { mesh.material = doneMat; mesh.userData.baseScale = 1.35 }
        world.add(mesh)
        nodes.push(mesh)
      })

      // Vòng quỹ đạo mờ theo tuần
      const ringGeos = []
      RADII.forEach((r, w) => {
        const pts = []
        for (let i = 0; i <= 96; i++) {
          const a = (i / 96) * Math.PI * 2
          pts.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r))
        }
        const g = new THREE.BufferGeometry().setFromPoints(pts)
        ringGeos.push(g)
        const line = new THREE.LineLoop(g, new THREE.LineBasicMaterial({ color: WEEK_COLORS[w], transparent: true, opacity: 0.22 }))
        line.rotation.x = (w % 2 === 0 ? 1 : -1) * (0.06 + w * 0.035)
        world.add(line)
      })

      const resize = () => {
        const w = el.clientWidth || 1, h = el.clientHeight || 1
        renderer.setSize(w, h, false)
        camera.aspect = w / h
        camera.updateProjectionMatrix()
      }
      const ro = new ResizeObserver(resize); ro.observe(el)
      let visible = true
      const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting }); io.observe(el)

      // Tương tác: kéo xoay (lerp), hover raycast, bấm node → vào ngày
      let targetX = 0, targetY = 0.15, curX = 0, curY = 0.15, dragging = false, moved = 0
      let lastPX = 0, lastPY = 0, hover = null
      let pointerPX = -1, pointerPY = -1
      const toNDC = (px, py) => {
        const rect = el.getBoundingClientRect()
        return [(px - rect.left) / rect.width * 2 - 1, -((py - rect.top) / rect.height) * 2 + 1]
      }
      const down = e => { dragging = true; moved = 0; lastPX = e.clientX; lastPY = e.clientY }
      const move = e => {
        pointerPX = e.clientX; pointerPY = e.clientY
        if (dragging) {
          moved += Math.abs(e.clientX - lastPX) + Math.abs(e.clientY - lastPY)
          targetY += (e.clientX - lastPX) * 0.005
          targetX += (e.clientY - lastPY) * 0.0035
          targetX = Math.max(-0.7, Math.min(0.7, targetX))
          lastPX = e.clientX; lastPY = e.clientY
        }
      }
      const up = () => {
        dragging = false
        if (moved < 8 && hover && selectRef.current) selectRef.current(hover.userData.dayId)
      }
      const leave = () => { pointerPX = -1; if (tip.current) tip.current.style.display = 'none' }
      el.addEventListener('pointerdown', down)
      el.addEventListener('pointermove', move)
      window.addEventListener('pointerup', up)
      el.addEventListener('pointerleave', leave)

      const raycaster = new THREE.Raycaster()
      const ndc = new THREE.Vector2()
      const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches

      let frame = 0, last = performance.now(), drawLast = 0, drawCount = 0
      const render = now => {
        frame = requestAnimationFrame(render)
        if (now - drawLast < 33) return // cap ~30fps — WebGL trang trí không cần 60
        drawLast = now
        const dt = Math.min((now - last) / 1000, 1 / 30); last = now
        // Offscreen / tab ẩn: vẫn giữ loop nhưng bỏ qua công việc
        if (!visible || document.hidden) return
        const frozen = pause.current || reduced()
        if (!dragging && !frozen) targetY += dt * 0.09 // idle spin chậm
        curX += (targetX - curX) * 0.035 // lerp — "đắt" của chuyển động
        curY += (targetY - curY) * 0.035
        world.rotation.x = curX; world.rotation.y = curY
        // Node thở nhẹ + node hover phóng to (squash không cần, giữ trọng lượng)
        nodes.forEach(n => {
          const breathe = frozen ? 1 : 1 + Math.sin(now / 900 + n.userData.phase) * 0.06
          n.scale.setScalar((hover === n ? 1.9 : 1) * n.userData.baseScale * breathe)
        })
        // Hover: raycast mỗi frame khi có pointer trong canvas; tooltip chiếu vị trí node cùng frame
        const rayEl = renderer.domElement
        if (pointerPX >= 0 && !dragging) {
          const [nx, ny] = toNDC(pointerPX, pointerPY)
          ndc.set(nx, ny); raycaster.setFromCamera(ndc, camera)
          const hit = raycaster.intersectObjects(nodes)[0]?.object || null
          hover = hit
          rayEl.style.cursor = hit ? 'pointer' : 'grab'
          if (hit && tip.current) {
            const v = hit.position.clone().applyMatrix4(world.matrixWorld).project(camera)
            const rect = el.getBoundingClientRect()
            const px = (v.x * 0.5 + 0.5) * rect.width
            const py = (-v.y * 0.5 + 0.5) * rect.height
            hit.userData.px = px; hit.userData.py = py
            tip.current.textContent = `Ngày ${hit.userData.dayId} · ${hit.userData.title}`
            tip.current.style.display = 'block'
            tip.current.style.left = Math.min(rect.width - 40, Math.max(4, px)) + 'px'
            tip.current.style.top = Math.min(rect.height - 30, Math.max(4, py - 26)) + 'px'
          } else if (tip.current) tip.current.style.display = 'none'
        }
        drawCount++
        try { renderer.render(scene, camera) } catch { /* context lost — dừng vẽ, loop giữ nguyên */ }
      }
      renderer.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); cancelAnimationFrame(frame) })
      resize()
      frame = requestAnimationFrame(render)
      if (import.meta.env.DEV) window.__galaxy = { nodes, world, camera, project: n => n.position.clone().applyMatrix4(world.matrixWorld).project(camera), getStats: () => ({ drawCount, visible, curX: curX.toFixed(2), curY: curY.toFixed(2) }) }

      cleanup = () => {
        cancelAnimationFrame(frame)
        ro.disconnect(); io.disconnect()
        el.removeEventListener('pointerdown', down)
        el.removeEventListener('pointermove', move)
        window.removeEventListener('pointerup', up)
        el.removeEventListener('pointerleave', leave)
        geo.dispose(); doneMat.dispose(); mats.forEach(m => m.dispose())
        ringGeos.forEach(g => g.dispose())
        world.traverse(o => { if (o.material) o.material.dispose() })
        renderer.dispose(); renderer.domElement.remove()
      }
    }).catch(() => { /* import lỗi → giữ CSS */ })

    return () => { disposed = true; if (cleanup) cleanup() }
  }, [done]) // done đổi khi người học xong thêm ngày — dựng lại màu node

  return <div ref={host} className="galaxy" aria-hidden="true" style={{ position: 'absolute', inset: 0, cursor: 'grab' }}>
    <div ref={tip} style={{ display: 'none', position: 'absolute', zIndex: 5, background: '#0e1424', border: '1px solid var(--line)', borderRadius: 8, padding: '3px 9px', fontSize: 12, color: 'var(--ink)', pointerEvents: 'none', whiteSpace: 'nowrap' }} />
  </div>
}

export default function GalaxyHero(props) {
  return <GalaxyHost {...props} />
}
