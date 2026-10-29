import React from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import './styles.css'
import { registerSW } from 'virtual:pwa-register'

const updateSW = registerSW({
  onNeedRefresh() { window.dispatchEvent(new CustomEvent('beapp-update')) },
  onOfflineReady() {},
})

window.__beappUpdateSW = updateSW
createRoot(document.getElementById('root')).render(<React.StrictMode><App /></React.StrictMode>)
