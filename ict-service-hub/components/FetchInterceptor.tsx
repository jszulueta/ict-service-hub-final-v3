'use client'

import { useEffect } from 'react'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'

export function FetchInterceptor() {
  useEffect(() => {
    // We only want to intercept fetch in the browser
    if (typeof window === 'undefined') return

    const originalFetch = window.fetch
    
    // Counter to handle concurrent requests
    let activeRequests = 0

    const startProgress = () => {
      if (activeRequests === 0) {
        NProgress.start()
      }
      activeRequests++
    }

    const stopProgress = () => {
      activeRequests = Math.max(0, activeRequests - 1)
      if (activeRequests === 0) {
        NProgress.done()
      }
    }

    window.fetch = async function (...args) {
      startProgress()
      try {
        const response = await originalFetch.apply(this, args)
        return response
      } finally {
        stopProgress()
      }
    }

    return () => {
      // Restore original fetch on unmount
      window.fetch = originalFetch
    }
  }, [])

  return null
}
