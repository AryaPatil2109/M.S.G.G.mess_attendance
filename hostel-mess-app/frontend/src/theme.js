// Colour themes. The choice is remembered in this browser.
// To change the theme everyone sees first, change DEFAULT_THEME below.
export const DEFAULT_THEME = 'green'

export const THEMES = [
  { id: 'green', name: 'Forest Green', desc: 'Dark green sidebar, green accent', side: '#0f2d1e', accent: '#15803d', bg: '#f6f8f6' },
  { id: 'blue', name: 'Corporate Blue', desc: 'White sidebar, blue accent', side: '#ffffff', accent: '#2563eb', bg: '#f4f6f9' },
  { id: 'graphite', name: 'Graphite', desc: 'Black and white, minimal', side: '#ffffff', accent: '#18181b', bg: '#fafafa' },
  { id: 'teal', name: 'Teal', desc: 'Dark sidebar, teal accent', side: '#0f172a', accent: '#0f766e', bg: '#f6f8f8' },
  { id: 'indigo', name: 'Indigo', desc: 'Dark sidebar, indigo accent', side: '#0f172a', accent: '#4f46e5', bg: '#f8fafc' },
]

export function getTheme() {
  try {
    const t = localStorage.getItem('messmate-theme-v2')
    if (THEMES.some((x) => x.id === t)) return t
  } catch {
    /* storage not available */
  }
  return DEFAULT_THEME
}

export function applyTheme(id) {
  document.documentElement.dataset.theme = id
  try {
    localStorage.setItem('messmate-theme-v2', id)
  } catch {
    /* storage not available */
  }
}