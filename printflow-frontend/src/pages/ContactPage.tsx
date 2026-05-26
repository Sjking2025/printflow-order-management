import { useState, useEffect, useRef } from 'react'
import './LandingPage.css'

export default function ContactPage() {
  const headerRef = useRef<HTMLElement>(null)
  const [submitted, setSubmitted] = useState(false)

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitted(true)
  }

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
            <span className="font-label-md text-label-md text-secondary architectural block mb-6 tracking-[0.5em]">CONTACT</span>
            <h1 className="font-headline-lg text-headline-lg text-white mb-6 architectural tracking-[0.3em]">Get in Touch.</h1>
            <p className="text-white/30 text-body-lg text-sm mb-16 max-w-xl architectural tracking-[0.1em]">
              Have a question about PrintFlow? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div>
                {submitted ? (
                  <div className="glass-hud p-10 text-center">
                    <span className="material-symbols-outlined text-secondary text-6xl block mb-6">check_circle</span>
                    <h2 className="font-headline-md text-white mb-4 architectural tracking-[0.2em]">Message Sent!</h2>
                    <p className="text-white/30 text-sm architectural">Thank you for reaching out. Our team will get back to you within 24 hours.</p>
                    <button
                      onClick={() => setSubmitted(false)}
                      className="mt-8 bg-secondary text-white px-8 py-3 font-black text-xs architectural uppercase tracking-[0.3em]"
                    >
                      Send Another
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                      <label className="block text-white/40 text-[10px] font-black architectural mb-2 tracking-[0.3em] uppercase">Name</label>
                      <input
                        required
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-secondary/50 transition-colors"
                        placeholder="Your name"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 text-[10px] font-black architectural mb-2 tracking-[0.3em] uppercase">Email</label>
                      <input
                        required
                        type="email"
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-secondary/50 transition-colors"
                        placeholder="you@company.com"
                      />
                    </div>
                    <div>
                      <label className="block text-white/40 text-[10px] font-black architectural mb-2 tracking-[0.3em] uppercase">Subject</label>
                      <select className="w-full bg-white/5 border border-white/10 text-white/60 px-4 py-3 text-sm outline-none focus:border-secondary/50 transition-colors">
                        <option>General Inquiry</option>
                        <option>Technical Support</option>
                        <option>Sales & Pricing</option>
                        <option>Partnership</option>
                        <option>Feature Request</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white/40 text-[10px] font-black architectural mb-2 tracking-[0.3em] uppercase">Message</label>
                      <textarea
                        required
                        rows={5}
                        className="w-full bg-white/5 border border-white/10 text-white px-4 py-3 text-sm outline-none focus:border-secondary/50 transition-colors resize-none"
                        placeholder="How can we help?"
                      />
                    </div>
                    <button
                      type="submit"
                      className="w-full bg-secondary text-white py-4 font-black text-xs architectural uppercase tracking-[0.3em] hover:opacity-90 transition-all"
                    >
                      Send Message
                    </button>
                  </form>
                )}
              </div>

              <div className="space-y-6">
                <div className="glass-hud p-8">
                  <span className="material-symbols-outlined text-secondary text-2xl mb-4 block">mail</span>
                  <h3 className="text-white architectural text-xs font-black tracking-[0.3em] mb-2">Email</h3>
                  <p className="text-white/30 text-[10px] font-mono">hello@printflow.dev</p>
                </div>
                <div className="glass-hud p-8">
                  <span className="material-symbols-outlined text-secondary text-2xl mb-4 block">globe</span>
                  <h3 className="text-white architectural text-xs font-black tracking-[0.3em] mb-2">Location</h3>
                  <p className="text-white/30 text-[10px] font-mono">Sector 7, Digital Infrastructure Zone</p>
                </div>
                <div className="glass-hud p-8">
                  <span className="material-symbols-outlined text-secondary text-2xl mb-4 block">support</span>
                  <h3 className="text-white architectural text-xs font-black tracking-[0.3em] mb-2">Support Hours</h3>
                  <p className="text-white/30 text-[10px] font-mono">Mon–Fri, 9 AM – 6 PM IST</p>
                </div>
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
