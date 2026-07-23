import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { enableMapSet } from 'immer'
import './index.css'
import App from './App.tsx'
import { useStore } from './store'
import { getInitialTasks } from './lib/mockData'

// Enable Immer's MapSet plugin so Set/Map instances (e.g. loadingIds: Set<string>)
// can be mutated inside Immer produce() callbacks.
enableMapSet()

// ---- Dark mode hydration ----
// Read persisted preference before first render to avoid flash of wrong theme.
const savedTheme = localStorage.getItem('theme')
const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
const isDark = savedTheme === 'dark' || (savedTheme === null && prefersDark)

if (isDark) {
  document.documentElement.classList.add('dark')
}

// ---- Seed the store with 1000 mock tasks ----
// Done before rendering so the board is immediately populated.
useStore.setState((state) => {
  state.tasks = getInitialTasks()
  state.isDarkMode = isDark
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
