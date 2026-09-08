import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

function scrollToTop(): void {
  window.scrollTo(0, 0)
  document.documentElement.scrollTop = 0
  document.body.scrollTop = 0
}

/** Resetează scroll-ul la navigare (SPA); hash-urile (#catalog etc.) rămân funcționale. */
export function ScrollToTop() {
  const { pathname, hash } = useLocation()

  useEffect(() => {
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual'
    }
  }, [])

  useEffect(() => {
    if (hash) {
      const id = hash.replace(/^#/, '')
      requestAnimationFrame(() => {
        const target = document.getElementById(id)
        if (target) {
          target.scrollIntoView({ block: 'start' })
          return
        }
        scrollToTop()
      })
      return
    }
    scrollToTop()
  }, [pathname, hash])

  return null
}
