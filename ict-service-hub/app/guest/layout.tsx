import { GuestNavbar } from '@/components/ui'

export default function GuestLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-slate-900 font-sans flex flex-col">
      <GuestNavbar />
      <main className="flex-grow">
        {children}
      </main>
    </div>
  )
}
