import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

// Pings the backend once per page the visitor opens, so the admin
// dashboard can show "someone was on the site" without any cookies
// or personal data collected.
export function useTrackVisit() {
  const location = useLocation()

  useEffect(() => {
    fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: location.pathname }),
    }).catch(() => {
      // Visit logging is best-effort — never interrupt the visitor's experience.
    })
  }, [location.pathname])
}
