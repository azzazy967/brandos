import { create } from 'zustand'

type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  resolved: 'light' | 'dark'
  setTheme: (theme: Theme) => void
}

function getSystemTheme(): 'light' | 'dark' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function resolve(theme: Theme): 'light' | 'dark' {
  return theme === 'system' ? getSystemTheme() : theme
}

function applyTheme(resolved: 'light' | 'dark') {
  document.documentElement.classList.toggle('dark', resolved === 'dark')
}

const stored = (localStorage.getItem('brandos_theme') as Theme) ?? 'system'
const initial = resolve(stored)
applyTheme(initial)

export const useThemeStore = create<ThemeState>()((set) => ({
  theme: stored,
  resolved: initial,

  setTheme: (theme) => {
    const resolved = resolve(theme)
    localStorage.setItem('brandos_theme', theme)
    applyTheme(resolved)
    set({ theme, resolved })
  },
}))

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  const state = useThemeStore.getState()
  if (state.theme === 'system') {
    const resolved = getSystemTheme()
    applyTheme(resolved)
    useThemeStore.setState({ resolved })
  }
})
