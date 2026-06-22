"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="flex flex-col justify-center items-center w-5 h-5 gap-1.5">
      <span className={`block h-0.5 w-5 rounded-full transition-all duration-300 bg-current ${open ? "rotate-45 translate-y-2" : ""}`} />
      <span className={`block h-0.5 w-5 rounded-full transition-all duration-300 bg-current ${open ? "opacity-0" : ""}`} />
      <span className={`block h-0.5 w-5 rounded-full transition-all duration-300 bg-current ${open ? "-rotate-45 -translate-y-2" : ""}`} />
    </div>
  );
}

export function GuestNavbar() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => { setSidebarOpen(false); }, [pathname]);

  useEffect(() => {
    document.body.style.overflow = sidebarOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  return (
    <>
      <header className="bg-white border-b border-slate-100 sticky top-0 z-50">
        <div className="container mx-auto px-6 py-6 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3 group">
            <Image 
              src="/coat-of-arms.png" 
              alt="Diocese of Kalookan Coat of Arms" 
              width={48} 
              height={48} 
              className="object-contain"
            />
            <div className="hidden sm:flex flex-col">
              <span className="text-xs font-semibold tracking-wider text-slate-500 uppercase leading-tight mb-0.5">
                Diocese of Kalookan
              </span>
              <span className="text-lg font-bold tracking-tight text-brand-700 leading-tight group-hover:text-brand-800 transition-colors">
                ICT Service Hub
              </span>
            </div>
          </Link>
          
          {/* Desktop Nav */}
          <div className="hidden sm:flex gap-6 items-center">
            <Link href="/guest/track-ticket" className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors">Track Ticket</Link>
            <Link href="/guest/submit-ticket" className="text-sm font-semibold text-slate-600 hover:text-brand-600 transition-colors">Submit Ticket</Link>
          </div>

          {/* Mobile Hamburger */}
          <button onClick={() => setSidebarOpen((o) => !o)} aria-label="Toggle menu"
            className="sm:hidden flex items-center justify-center h-10 w-10 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors">
            <HamburgerIcon open={sidebarOpen} />
          </button>
        </div>
      </header>

      {/* Overlay */}
      <div onClick={() => setSidebarOpen(false)}
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm sm:hidden transition-opacity duration-300 ${sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"}`}
      />

      {/* Mobile Sidebar */}
      <aside className={`fixed top-0 right-0 h-full w-72 z-50 bg-white border-l border-slate-200 flex flex-col shadow-2xl transform transition-transform duration-300 ease-in-out sm:hidden ${sidebarOpen ? "translate-x-0" : "translate-x-full"}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <Image src="/coat-of-arms.png" alt="Logo" width={32} height={32} />
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Diocese of Kalookan</div>
              <div className="text-brand-700 font-bold text-sm leading-none mt-0.5">ICT Service Hub</div>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} aria-label="Close menu"
            className="h-8 w-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            ✕
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          <Link href="/guest/track-ticket" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:text-brand-700 hover:bg-brand-50 transition-colors">
            🔍 Track Ticket
          </Link>
          <Link href="/guest/submit-ticket" className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-slate-600 hover:text-brand-700 hover:bg-brand-50 transition-colors">
            ➕ Submit Ticket
          </Link>
        </nav>
      </aside>
    </>
  );
}
