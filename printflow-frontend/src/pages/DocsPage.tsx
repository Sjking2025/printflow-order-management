import { useEffect, useRef } from 'react'
import './LandingPage.css'

export default function DocsPage() {
  const headerRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const handleScroll = () => {
      if (headerRef.current) {
        if (window.scrollY > 50) {
          headerRef.current.classList.add('bg-background/90', 'backdrop-blur-xl', 'border-b', 'border-white/5')
        } else {
          headerRef.current.classList.remove('bg-background/90', 'backdrop-blur-xl', 'border-b', 'border-white/5')
        }
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <div className="landing-page overflow-x-hidden" style={{ backgroundColor: '#020617', minHeight: '100vh' }}>
      <header ref={headerRef} className="fixed top-0 left-0 w-full z-[100] px-margin-desktop py-stack-lg transition-all duration-700">
        <div className="max-w-container-max-width mx-auto flex justify-between items-center">
          <a href="/" className="font-display text-2xl font-black tracking-tighter text-white flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-secondary rounded-none rotate-45" />
            PRINTFLOW
          </a>
          <nav className="hidden md:flex gap-12 items-center">
            <a className="text-white/40 hover:text-white transition-all font-label-md text-label-md architectural py-1" href="/">Home</a>
            <a className="text-white/40 hover:text-white transition-all font-label-md text-label-md architectural py-1" href="/docs">Docs</a>
            <a className="text-white/40 hover:text-white transition-all font-label-md text-label-md architectural py-1" href="/contact">Contact</a>
          </nav>
        </div>
      </header>

      <main className="pt-40">
        <div className="max-w-container-max-width mx-auto px-margin-desktop py-20">
          <div className="max-w-4xl mx-auto">
            <span className="font-label-md text-label-md text-secondary architectural block mb-6 tracking-[0.5em]">DOCUMENTATION</span>
            <h1 className="font-headline-lg text-headline-lg text-white mb-12 architectural tracking-[0.3em]">Getting Started with PrintFlow.</h1>

            <div className="space-y-12">
              <div className="glass-hud p-8">
                <span className="material-symbols-outlined text-secondary text-3xl mb-4 block">rocket_launch</span>
                <h2 className="font-headline-md text-white mb-4 architectural tracking-[0.2em]">Quick Start Guide</h2>
                <p className="text-white/30 text-sm mb-6 leading-relaxed">
                  Set up your print shop in minutes. PrintFlow's intuitive interface gets you from zero to first order with minimal friction.
                </p>
                <ol className="space-y-3 text-white/40 text-[10px] font-black architectural">
                  <li className="flex items-start gap-4">
                    <span className="text-secondary mt-0.5">1.</span>
                    <span>Create your account with Google sign-in — no credit card required</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="text-secondary mt-0.5">2.</span>
                    <span>Set up your shop profile, upload hours, and configure closure modes</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="text-secondary mt-0.5">3.</span>
                    <span>Share your shop's unique order link with customers</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="text-secondary mt-0.5">4.</span>
                    <span>Receive orders with file attachments and per-document configurations</span>
                  </li>
                  <li className="flex items-start gap-4">
                    <span className="text-secondary mt-0.5">5.</span>
                    <span>Manage your queue with priority sorting and status transitions</span>
                  </li>
                </ol>
              </div>

              <div className="glass-hud p-8">
                <span className="material-symbols-outlined text-secondary text-3xl mb-4 block">queue</span>
                <h2 className="font-headline-md text-white mb-4 architectural tracking-[0.2em]">Order Queue Management</h2>
                <p className="text-white/30 text-sm mb-6 leading-relaxed">
                  Orders are automatically sorted by priority level: <strong className="text-white">CRITICAL</strong>, <strong className="text-white">HIGH</strong>, and <strong className="text-white">NORMAL</strong>. Accept, process, and complete orders with automatic lock timers to prevent conflicts.
                </p>
                <ul className="space-y-3 text-white/40 text-[10px] font-black architectural">
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> CRITICAL orders appear at the top with urgency indicators</li>
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Status flow: PENDING → ACCEPTED → PROCESSING → COMPLETED</li>
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Lock timers prevent simultaneous edits by multiple staff</li>
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Clarification chat for customer communication</li>
                </ul>
              </div>

              <div className="glass-hud p-8">
                <span className="material-symbols-outlined text-secondary text-3xl mb-4 block">description</span>
                <h2 className="font-headline-md text-white mb-4 architectural tracking-[0.2em]">File & Document Handling</h2>
                <p className="text-white/30 text-sm mb-6 leading-relaxed">
                  Customers can upload up to 5 documents per order with individual configuration. Files are securely stored in Cloudinary with automatic preview generation.
                </p>
                <ul className="space-y-3 text-white/40 text-[10px] font-black architectural">
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Supported formats: PDF, images (PNG, JPG, TIFF)</li>
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Per-document settings: copies, color mode, page size, binding</li>
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Automatic preview and download from owner dashboard</li>
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Copy modification window configurable per shop (1–30 min)</li>
                </ul>
              </div>

              <div className="glass-hud p-8">
                <span className="material-symbols-outlined text-secondary text-3xl mb-4 block">payments</span>
                <h2 className="font-headline-md text-white mb-4 architectural tracking-[0.2em]">Payments & Billing</h2>
                <p className="text-white/30 text-sm mb-6 leading-relaxed">
                  UPI-based payment system with dynamic QR code generation. Customers upload payment proof (screenshot) with UTR for verification.
                </p>
                <ul className="space-y-3 text-white/40 text-[10px] font-black architectural">
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Dynamic UPI QR code shown per order</li>
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Payment proof upload with UTR (transaction ID)</li>
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Owner verifies payment before processing</li>
                  <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">circle</span> Automatic price calculator with per-document costs</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="bg-background text-white py-24 border-t border-white/5">
        <div className="max-w-container-max-width mx-auto px-margin-desktop text-center">
          <p className="text-white/30 text-xs architectural leading-relaxed tracking-widest">© 2025 PRINTFLOW DIGITAL SYSTEMS // ALL RIGHTS RESERVED.</p>
        </div>
      </footer>
    </div>
  )
}
