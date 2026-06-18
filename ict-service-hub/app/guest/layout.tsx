import Link from 'next/link'
import { Server } from 'lucide-react'

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-liturgical-cream text-slate-900 font-sans flex flex-col">
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-8 h-8 rounded-lg bg-navy-900 flex items-center justify-center shadow-sm group-hover:bg-navy-800 transition-colors">
              <Server className="w-4 h-4 text-gold-400" />
            </div>
            <span className="font-bold tracking-tight text-navy-900">ICT Service Hub</span>
          </Link>
          <div className="flex gap-4 items-center">
            <Link href="/guest/track-ticket" className="text-sm font-medium text-slate-600 hover:text-navy-600 transition-colors">Track Ticket</Link>
            <Link href="/guest/submit-ticket" className="text-sm font-medium text-slate-600 hover:text-navy-600 transition-colors">Submit Ticket</Link>
          </div>
        </div>
      </header>
      <main className="flex-grow">
        {children}
      </main>
    </div>
  )
}
