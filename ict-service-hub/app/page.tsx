import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types/database'
import Link from 'next/link'
import { ArrowRight, Ticket, Search, Server, MonitorPlay, Video } from 'lucide-react'

export default async function RootPage() {
  const supabase = await createSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('role, is_active, is_suspended')
      .eq('id', user.id)
      .single()

    const profile = data as Pick<Profile, 'role' | 'is_active' | 'is_suspended'> | null

    if (!profile || !profile.is_active || profile.is_suspended) {
      redirect('/auth/suspended')
    }

    if (['ict_staff', 'ict_admin', 'super_admin'].includes(profile.role)) {
      redirect('/admin')
    }

    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-user-hero text-slate-900 flex flex-col font-sans relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-[1200px] h-full pointer-events-none">
        <div className="absolute -top-[100px] -right-[100px] w-[500px] h-[500px] rounded-full bg-navy-200/40 blur-3xl mix-blend-multiply" />
        <div className="absolute top-[30%] -left-[150px] w-[600px] h-[600px] rounded-full bg-gold-200/40 blur-3xl mix-blend-multiply" />
      </div>

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center animate-fade-in">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-navy-900 flex items-center justify-center shadow-card-md">
            <Server className="w-5 h-5 text-gold-400" />
          </div>
          <span className="text-xl font-bold tracking-tight text-navy-900">
            ICT Service Hub
          </span>
        </div>
        <Link 
          href="/auth/login"
          className="text-sm font-semibold text-navy-900 hover:text-navy-700 transition-colors px-4 py-2 bg-white/50 backdrop-blur-md rounded-lg border border-slate-200 shadow-sm"
        >
          Staff / User Login
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow container mx-auto px-6 flex flex-col justify-center items-center text-center pb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/60 border border-slate-200 shadow-sm backdrop-blur-md mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <span className="flex h-2 w-2 rounded-full bg-gold-500 animate-pulse-gold"></span>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Diocese of Kalookan</span>
        </div>
        
        <h1 className="font-display text-5xl md:text-7xl font-bold text-navy-950 max-w-4xl leading-[1.1] mb-6 tracking-tight animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Seamless tech support for our <span className="text-transparent bg-clip-text bg-gradient-to-r from-navy-600 to-gold-600">pastoral mission</span>.
        </h1>
        
        <p className="text-lg text-slate-600 max-w-2xl mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Submit a service request or track an existing ticket instantly. Our dedicated ICT team is here to ensure smooth operations across all parishes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <Link 
            href="/guest/submit-ticket" 
            className="group relative flex items-center justify-center gap-2 bg-navy-900 text-white px-8 py-4 rounded-xl font-semibold shadow-card-md hover:bg-navy-800 transition-all hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <Ticket className="w-5 h-5 text-gold-400" />
            <span>Submit a Ticket</span>
            <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
          
          <Link 
            href="/guest/track-ticket" 
            className="group flex items-center justify-center gap-2 bg-white text-navy-900 border border-slate-200 px-8 py-4 rounded-xl font-semibold shadow-sm hover:shadow-card-md hover:border-slate-300 transition-all hover:-translate-y-0.5"
          >
            <Search className="w-5 h-5 text-navy-500" />
            <span>Track Status</span>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl animate-fade-in" style={{ animationDelay: '0.5s' }}>
          {[
            { icon: Server, title: "Infrastructure & Systems", desc: "Network support, software installation, and system maintenance." },
            { icon: MonitorPlay, title: "Live Streaming", desc: "Technical setup and coverage for diocesan events and masses." },
            { icon: Video, title: "Media Services", desc: "Professional photography and videography requests." }
          ].map((feature, i) => (
            <div key={i} className="bg-white/70 backdrop-blur-md border border-white/40 p-6 rounded-2xl shadow-card flex flex-col items-center text-center hover:-translate-y-1 transition-transform cursor-default">
              <div className="w-12 h-12 rounded-full bg-navy-50 flex items-center justify-center mb-4 text-navy-600">
                <feature.icon className="w-6 h-6" />
              </div>
              <h3 className="text-slate-900 font-semibold mb-2">{feature.title}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  )
}
