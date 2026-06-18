import Link from 'next/link'
import { Server } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-liturgical-white font-sans flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 container mx-auto px-6 py-6 flex justify-between items-center animate-fade-in">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center shadow-card-md">
            <Server className="w-5 h-5 text-gold-400" />
          </div>
          <span className="text-xl font-bold tracking-tight text-navy-900 hidden sm:inline">
            ICT Service Hub
          </span>
        </Link>
        <Link 
          href="/"
          className="text-sm font-semibold text-navy-900 hover:text-navy-700 transition-colors px-4 py-2 bg-white/50 backdrop-blur-md rounded-lg border border-slate-200 shadow-sm"
        >
          Guest Page
        </Link>
      </header>
      
      <main className="flex-grow flex flex-col">
        {children}
      </main>
    </div>
  )
}
