import { createSupabaseServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Profile } from '@/types/database'
import Link from 'next/link'
import Image from 'next/image'
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
    <div className="min-h-screen bg-white text-slate-900 flex flex-col font-sans relative overflow-hidden">

      {/* Header */}
      <header className="relative z-10 container mx-auto px-6 py-6 flex justify-between items-center animate-fade-in">
        <div className="flex items-center gap-3">
          <Image 
            src="/coat-of-arms.png" 
            alt="Diocese of Kalookan Coat of Arms" 
            width={48} 
            height={48} 
            className="object-contain"
          />
          <div className="hidden sm:flex flex-col">
            <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
              Diocese of Kalookan
            </span>
            <span className="text-lg font-bold tracking-tight text-brand-700 leading-tight">
              ICT Service Hub
            </span>
          </div>
        </div>
        <Link 
          href="/auth/login"
          className="text-sm font-semibold text-brand-700 hover:text-brand-900 transition-colors px-4 py-2 bg-white rounded-lg border border-slate-200 shadow-sm"
        >
          Staff / User Login
        </Link>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-grow container mx-auto px-6 flex flex-col justify-center items-center text-center pb-24">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200 shadow-sm mt-8 mb-8 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <span className="flex h-2 w-2 rounded-full bg-brand-500 animate-pulse-gold"></span>
          <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Diocese of Kalookan</span>
        </div>
        
        <h1 className="font-display text-5xl md:text-7xl font-bold text-brand-900 max-w-4xl leading-[1.1] mb-6 tracking-tight animate-fade-in" style={{ animationDelay: '0.2s' }}>
          Seamless tech support for our <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-500 to-brand-700">pastoral mission</span>.
        </h1>
        
        <p className="text-lg text-slate-600 max-w-2xl mb-12 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          Submit a service request or track an existing ticket instantly. Our dedicated ICT team is here to ensure smooth operations across all parishes.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto animate-fade-in" style={{ animationDelay: '0.4s' }}>
          <Link 
            href="/guest/submit-ticket" 
            className="group relative flex items-center justify-center gap-2 bg-brand-600 text-white px-8 py-4 rounded-xl font-semibold shadow-card-md hover:bg-brand-700 transition-all hover:-translate-y-0.5 overflow-hidden"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-[100%] group-hover:translate-x-[100%] transition-transform duration-700" />
            <Ticket className="w-5 h-5 text-brand-200" />
            <span>Submit a Ticket</span>
            <ArrowRight className="w-4 h-4 ml-1 opacity-70 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
          </Link>
          
          <Link 
            href="/guest/track-ticket" 
            className="group flex items-center justify-center gap-2 bg-white text-brand-700 border border-slate-200 px-8 py-4 rounded-xl font-semibold shadow-sm hover:shadow-card-md hover:border-slate-300 transition-all hover:-translate-y-0.5"
          >
            <Search className="w-5 h-5 text-brand-500" />
            <span>Track Status</span>
          </Link>
        </div>

        {/* Feature Highlights */}
        <div className="mt-28 w-full max-w-5xl flex flex-col items-center animate-fade-in" style={{ animationDelay: '0.5s' }}>
          <h2 className="text-2xl md:text-3xl font-bold text-brand-900 tracking-tight mb-3 ">
            What the ICT Service Hub Provides
          </h2>
          <p className="text-slate-600 max-w-xl mb-12 text-sm md:text-base leading-relaxed">
            We offer a variety of support services to parishes, ministries, and offices across the Diocese of Kalookan, from infrastructure and system support to streaming and media services.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
            {[
              { icon: Server, title: "Infrastructure & Systems", desc: "Network support, software installation, and system maintenance." },
              { icon: MonitorPlay, title: "Live Streaming", desc: "Technical setup and coverage for diocesan events and masses." },
              { icon: Video, title: "Media Services", desc: "Professional photography and videography requests." }
            ].map((feature, i) => (
              <div key={i} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-card flex flex-col items-center text-center hover:-translate-y-1 transition-transform cursor-default">
                <div className="w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center mb-4 text-brand-600">
                  <feature.icon className="w-6 h-6" />
                </div>
                <h3 className="text-slate-900 font-semibold mb-2">{feature.title}</h3>
                <p className="text-slate-600 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
