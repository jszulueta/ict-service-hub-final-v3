import Link from 'next/link'
import Image from 'next/image'
import { Server } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen bg-liturgical-white font-sans flex flex-col">
      {/* Header */}
      <header className="absolute top-0 left-0 right-0 z-10 container mx-auto px-6 py-6 flex justify-between items-center animate-fade-in">
        <Link href="/" className="flex items-center gap-3">
          <Image 
            src="/coat-of-arms.png" 
            alt="Diocese of Kalookan Coat of Arms" 
            width={48} 
            height={48} 
            className="object-contain"
          />
          <div className="flex flex-col hidden sm:flex">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Diocese of Kalookan
            </span>
            <span className="text-lg font-bold tracking-tight text-brand-700 leading-tight">
              ICT Service Hub
            </span>
          </div>
        </Link>
        <Link 
          href="/"
          className="text-sm font-semibold text-brand-700 hover:text-brand-900 transition-colors px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm"
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
