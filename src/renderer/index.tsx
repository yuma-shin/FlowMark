import ReactDom from 'react-dom/client'
import React from 'react'

import { AppRoutes } from './routes'
import { AppProvider } from './contexts/AppContext'
import './i18n'

import './globals.css'

// ブラウザのデフォルトコンテキストメニューを無効化
document.addEventListener('contextmenu', e => e.preventDefault())

const root = ReactDom.createRoot(document.querySelector('app') as HTMLElement)
root.render(
  <React.StrictMode>
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  </React.StrictMode>
)

// React マウント後にローディング画面を非表示にする
document.getElementById('loading-screen')?.remove()
