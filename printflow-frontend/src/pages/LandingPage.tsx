import { useEffect, useRef } from 'react'
import './LandingPage.css'

export default function LandingPage() {
  const loaderRef = useRef<HTMLDivElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const scrollSectionRef = useRef<HTMLElement>(null)
  const heroImgRef = useRef<HTMLImageElement>(null)
  const observerRef = useRef<IntersectionObserver | null>(null)

  useEffect(() => {
    const loadPct = document.getElementById('load-pct')
    let pct = 0
    const interval = setInterval(() => {
      pct += Math.floor(Math.random() * 15) + 5
      if (pct >= 100) {
        pct = 100
        clearInterval(interval)
        setTimeout(() => {
          if (loaderRef.current) {
            loaderRef.current.style.opacity = '0'
            setTimeout(() => {
              loaderRef.current!.style.display = 'none'
              document.querySelectorAll('.reveal-assemble').forEach(el => observerRef.current?.observe(el))
            }, 1000)
          }
        }, 400)
      }
      if (loadPct) loadPct.innerText = String(pct).padStart(2, '0') + '%'
    }, 80)

    const handleScroll = () => {
      const scrolled = window.pageYOffset
      if (headerRef.current) {
        if (scrolled > 50) {
          headerRef.current.classList.add('bg-background/90', 'backdrop-blur-xl', 'py-6', 'border-b', 'border-white/5')
        } else {
          headerRef.current.classList.remove('bg-background/90', 'backdrop-blur-xl', 'py-6', 'border-b', 'border-white/5')
        }
      }
      if (scrollSectionRef.current) {
        const sectionTop = scrollSectionRef.current.offsetTop
        const movement = (scrolled - sectionTop) * 0.2
        scrollSectionRef.current.style.backgroundPosition = `center ${50 + movement}%`
      }
      if (heroImgRef.current && scrolled < 1000) {
        heroImgRef.current.style.transform = `scale(${1.05 + scrolled * 0.0001}) translateY(${scrolled * 0.1}px)`
      }
    }
    window.addEventListener('scroll', handleScroll)

    const observerOptions = { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) entry.target.classList.add('active')
      })
    }, observerOptions)

    document.querySelectorAll('.btn-magnetic').forEach(btn => {
      const el = btn as HTMLElement
      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        const x = e.clientX - rect.left - rect.width / 2
        const y = e.clientY - rect.top - rect.height / 2
        el.style.transform = `translate(${x * 0.25}px, ${y * 0.25}px)`
        el.style.boxShadow = `${-x * 0.1}px ${-y * 0.1}px 40px rgba(254, 107, 0, 0.2)`
      }
      const onLeave = () => {
        el.style.transform = 'translate(0px, 0px)'
        el.style.boxShadow = ''
      }
      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
    })

    document.querySelectorAll('.glass-hud').forEach(card => {
      const el = card as HTMLElement
      const onMove = (e: MouseEvent) => {
        const rect = el.getBoundingClientRect()
        const x = (e.clientX - rect.left) / rect.width - 0.5
        const y = (e.clientY - rect.top) / rect.height - 0.5
        el.style.transform = `perspective(1000px) rotateY(${x * 4}deg) rotateX(${-y * 4}deg) translateZ(10px)`
      }
      const onLeave = () => {
        el.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0px)'
      }
      el.addEventListener('mousemove', onMove)
      el.addEventListener('mouseleave', onLeave)
    })

    return () => {
      clearInterval(interval)
      window.removeEventListener('scroll', handleScroll)
      observerRef.current?.disconnect()
    }
  }, [])

  return (
    <div className="landing-page overflow-x-hidden" style={{ backgroundColor: '#020617' }}>
      <div className="noise-overlay" />
      <div className="scanner" />

      <div id="loader" ref={loaderRef} style={{
        position: 'fixed', inset: 0, background: '#020617', zIndex: 10000,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        transition: 'opacity 1s cubic-bezier(0.85, 0, 0.15, 1)'
      }}>
        <div style={{ position: 'relative' }}>
          <div className="loader-ring" />
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span className="font-display font-black text-white text-xl tracking-tighter">PF</span>
          </div>
        </div>
        <div className="mt-8 flex flex-col items-center gap-2">
          <span className="architectural text-[10px] text-primary-fixed/40" style={{ letterSpacing: '0.8em' }}>System Initializing</span>
          <span className="font-mono text-secondary text-2xl" id="load-pct">00%</span>
        </div>
      </div>

      <header ref={headerRef} className="fixed top-0 left-0 w-full z-[100] px-margin-desktop py-stack-lg transition-all duration-700" id="main-header">
        <div className="max-w-container-max-width mx-auto flex justify-between items-center">
          <div className="font-display text-2xl font-black tracking-tighter text-white flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-secondary rounded-none rotate-45 animate-pulse" />
            PRINTFLOW
          </div>
          <nav className="hidden md:flex gap-12 items-center">
            <a className="text-white/40 hover:text-white transition-all font-label-md text-label-md architectural py-1 relative group" href="#features">
              Features
              <span className="absolute bottom-0 left-0 w-0 h-[1px] bg-secondary transition-all group-hover:w-full" />
            </a>
            <a className="text-white/40 hover:text-white transition-all font-label-md text-label-md architectural py-1" href="#pricing">Pricing</a>
            <a className="text-white/40 hover:text-white transition-all font-label-md text-label-md architectural py-1" href="/docs">Docs</a>
            <a className="text-white/40 hover:text-white transition-all font-label-md text-label-md architectural py-1" href="/contact">Contact</a>
          </nav>
          <div className="flex items-center gap-8">
            <a href="/login" className="hidden md:block text-white/40 font-bold font-label-md text-label-md hover:text-white transition-all uppercase tracking-[0.3em]">Login</a>
            <a href="/login" className="bg-secondary text-white px-8 py-3 rounded-none shimmer-border btn-magnetic font-label-md text-label-md uppercase tracking-[0.4em] shadow-2xl shadow-secondary/20">Get Started</a>
          </div>
        </div>
      </header>

      <main>
        <section className="relative h-screen flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <img
              ref={heroImgRef}
              alt="Hero Cinematic"
              className="w-full h-full object-cover scale-105"
              id="hero-img"
              src="https://lh3.googleusercontent.com/aida/ADBb0uhehREqoZbxLel4MGRW_S8K8NeUH8e8LXHK3RmG3_XpSgZWZ2uCPOVeoYcOcoZ612G0dBQSKdYzDQ01lzM1ai0qp7elmPHDtg5RHyYuXUuEXsJZ_cRGkQmW0y1kPFfkVkbWDfPOZI1wu0AulecTCOk833j8Q4cswvLNHlXi97OK0nZxHgvsNlVHpapz9hcldgQ_Yy-k1uLRAvxxLAzvwgNifyqkYU_4Yqfvc0bD09jyVq6R1AOicUTYe4c"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-background via-background/80 to-transparent" />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[#020617]/40" />
          </div>
          <div className="relative z-10 max-w-container-max-width mx-auto px-margin-desktop w-full text-center">
            <div className="max-w-6xl mx-auto">
              <span className="inline-block font-label-md text-label-md text-secondary tracking-[1em] uppercase mb-stack-lg reveal-assemble stagger-1">Digital Order Management</span>
              <h1 className="font-display text-[80px] md:text-[140px] mb-stack-lg leading-[0.8] text-white text-glow reveal-assemble stagger-2">
                Streamline Your<br /><span className="text-transparent bg-clip-text bg-gradient-to-r from-white via-primary-fixed-dim to-white/20">Print Shop.</span>
              </h1>
              <p className="font-body-lg text-body-lg mb-stack-xl text-primary-fixed/40 max-w-2xl mx-auto architectural tracking-[0.2em] reveal-assemble stagger-3">
                Smart Queue // Customer Portal // Real-time Tracking
              </p>
              <div className="flex flex-wrap justify-center gap-10 reveal-assemble stagger-4">
                <a href="/login" className="bg-white text-black px-12 py-5 font-black text-xs architectural btn-magnetic flex items-center gap-4 hover:bg-secondary hover:text-white transition-colors">
                  Get Started
                  <span className="material-symbols-outlined text-sm">login</span>
                </a>
                <a href="#features" className="glass-hud text-white px-12 py-5 font-black text-xs architectural border border-white/10 hover:border-white/30 transition-all">
                  Learn More
                </a>
              </div>
            </div>
          </div>
          <div className="absolute bottom-16 left-1/2 -translate-x-1/2 flex flex-col items-center gap-4 opacity-30">
            <span className="architectural text-[9px] tracking-[0.6em]">Explore Features</span>
            <div className="w-[1px] h-12 bg-gradient-to-b from-white to-transparent" />
          </div>
        </section>

        <section ref={scrollSectionRef} className="relative min-h-screen py-40 overflow-hidden parallax-bg" id="scroll-section" style={{
          backgroundImage: "linear-gradient(to right, #020617, rgba(2, 6, 23, 0.85)), url('https://lh3.googleusercontent.com/aida/ADBb0ugHM33lF_EbeTfgJlNy7q70-yqO4lqcjvzhLyes0LxPhNm0YUo6Q7wMIHOxKFbP9eUq_0WnPNqAZgW9mENfuNIhIImhLUQZi89MYnMVJMx1EeB_suno5GqwsfsplSKCNcsrf20TYWBwYRKIAh3NrnQaU6soHBJzhXbA0Bzwf7u6YTus5zmxi-0dorKkSRdiJ7tZsnjfQjn4kv9RoLHfDxQ_js6qv4hnjJ4XytM4kZEgZJDeVjVjPKec8Xg')"
        }}>
          <div className="max-w-container-max-width mx-auto px-margin-desktop relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
              <div className="reveal-assemble">
                <span className="font-label-md text-label-md text-secondary architectural mb-6 block tracking-[0.5em]">Priority Queue v1.0</span>
                <h2 className="font-headline-lg text-headline-lg text-white mb-stack-lg architectural">Smart Order <br />Queue.</h2>
                <p className="text-primary-fixed/50 font-body-lg text-body-lg mb-stack-xl max-w-lg leading-relaxed">
                  Prioritize print jobs with a real-time queue sorted by urgency. CRITICAL, HIGH, and NORMAL levels ensure nothing falls through the cracks.
                </p>
                <div className="space-y-4">
                  <div className="glass-hud p-6 flex items-center gap-8 group">
                    <div className="w-16 h-16 bg-secondary/5 flex items-center justify-center border border-secondary/20">
                      <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'wght' 200" }}>priority_high</span>
                    </div>
                    <div>
                      <h4 className="text-white architectural text-xs font-black tracking-[0.3em]">Priority Levels</h4>
                      <p className="text-white/30 text-[10px] mt-2 font-mono uppercase">CRITICAL / HIGH / NORMAL</p>
                    </div>
                  </div>
                  <div className="glass-hud p-6 flex items-center gap-8 group">
                    <div className="w-16 h-16 bg-secondary/5 flex items-center justify-center border border-secondary/20">
                      <span className="material-symbols-outlined text-secondary text-4xl" style={{ fontVariationSettings: "'wght' 200" }}>sync</span>
                    </div>
                    <div>
                      <h4 className="text-white architectural text-xs font-black tracking-[0.3em]">Status Tracking</h4>
                      <p className="text-white/30 text-[10px] mt-2 font-mono uppercase">Real-time Order Updates</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="relative reveal-assemble stagger-2">
                <div className="aspect-square glass-hud p-1 relative overflow-hidden">
                  <div className="absolute inset-0 data-grid-thin opacity-20" />
                  <div className="h-full w-full border border-white/5 flex flex-col items-center justify-center p-12 text-center">
                    <div className="text-[140px] font-black text-white/5 leading-none tracking-tighter mb-4">100+</div>
                    <p className="text-secondary architectural text-lg font-black">Orders Daily</p>
                    <div className="w-48 h-[1px] bg-white/10 my-8" />
                    <p className="text-white/20 font-mono text-[10px] uppercase">Real-time Status Updates</p>
                  </div>
                  <div className="absolute top-4 left-4 w-6 h-6 border-t border-l border-secondary" />
                  <div className="absolute top-4 right-4 w-6 h-6 border-t border-r border-secondary" />
                  <div className="absolute bottom-4 left-4 w-6 h-6 border-b border-l border-secondary" />
                  <div className="absolute bottom-4 right-4 w-6 h-6 border-b border-r border-secondary" />
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="py-40 bg-background relative border-t border-white/5">
          <div className="max-w-container-max-width mx-auto px-margin-desktop">
            <div className="flex flex-col md:flex-row md:items-end justify-between mb-24 gap-8 reveal-assemble">
              <div className="max-w-2xl">
                <h2 className="font-headline-lg text-headline-lg text-white mb-6 architectural tracking-[0.3em]">The Complete Platform.</h2>
                <p className="text-white/30 text-body-lg architectural text-sm tracking-[0.1em]">Everything you need to manage your print shop.</p>
              </div>
              <div className="glass-hud px-6 py-2 border border-secondary/20">
                <span className="text-secondary font-black text-[10px] architectural tracking-[0.4em]">Platform Beta</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 auto-rows-[350px]">
              <div className="md:col-span-8 md:row-span-2 glass-hud p-12 flex flex-col justify-between group relative overflow-hidden reveal-assemble">
                <div className="absolute -right-20 -top-20 w-80 h-80 bg-secondary/5 rounded-full blur-[100px]" />
                <div>
                  <div className="flex justify-between items-start mb-16">
                    <div>
                      <h3 className="font-headline-md text-white mb-4 architectural tracking-[0.2em]">Owner Dashboard</h3>
                      <p className="text-white/30 max-w-sm text-sm uppercase tracking-wider">Complete visibility into your print shop operations.</p>
                    </div>
                    <span className="material-symbols-outlined text-white/5 text-[100px]" style={{ fontVariationSettings: "'wght' 100" }}>dashboard</span>
                  </div>
                  <div className="glass-hud p-10 bg-white/5">
                    <div className="flex justify-between items-end mb-8">
                      <div>
                        <span className="text-secondary architectural text-[10px] block mb-2 tracking-[0.5em]">Shop Status</span>
                        <span className="text-white font-mono text-5xl font-black">Online</span>
                      </div>
                      <div className="text-right">
                        <span className="text-green-500 font-mono text-xs flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-ping" />
                          ACTIVE
                        </span>
                      </div>
                    </div>
                    <div className="h-1 w-full bg-white/5 mb-10 overflow-hidden">
                      <div className="h-full bg-secondary w-[84%] shadow-[0_0_20px_rgba(254,107,0,0.8)]" />
                    </div>
                    <div className="grid grid-cols-3 gap-12">
                      <div>
                        <div className="text-white/20 architectural text-[9px] mb-2">Today's Revenue</div>
                        <div className="text-white font-bold text-xl">$2,450</div>
                      </div>
                      <div>
                        <div className="text-white/20 architectural text-[9px] mb-2">Active Orders</div>
                        <div className="text-white font-bold text-xl">12</div>
                      </div>
                      <div>
                        <div className="text-white/20 architectural text-[9px] mb-2">Uptime</div>
                        <div className="text-white font-bold text-xl">99.9%</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="md:col-span-4 md:row-span-1 glass-hud p-10 flex flex-col justify-between group reveal-assemble stagger-1">
                <div>
                  <div className="w-16 h-16 bg-white/5 flex items-center justify-center mb-8 shimmer-border">
                    <span className="material-symbols-outlined text-secondary text-4xl">shopping_cart</span>
                  </div>
                  <h3 className="font-headline-md text-white mb-4 architectural text-lg tracking-[0.2em]">Customer Portal</h3>
                  <p className="text-white/30 text-sm architectural tracking-wider">Place orders, upload files, and track progress.</p>
                </div>
                <div className="text-white/10 text-[9px] architectural font-black">Self-Service</div>
              </div>
              <div className="md:col-span-4 md:row-span-1 bg-secondary p-10 flex flex-col justify-between group reveal-assemble stagger-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <div className="relative z-10 h-full flex flex-col justify-between">
                  <h3 className="font-headline-md text-white architectural tracking-[0.2em]">Clarification Chat</h3>
                  <div className="flex flex-wrap gap-4">
                    <div className="px-4 py-2 border border-white/20 bg-black/10 backdrop-blur-sm text-[9px] architectural font-black">Real-time Messaging</div>
                    <div className="px-4 py-2 border border-white/20 bg-black/10 backdrop-blur-sm text-[9px] architectural font-black">5 Docs Per Order</div>
                  </div>
                </div>
                <span className="material-symbols-outlined absolute -right-4 -bottom-4 text-white/10 text-[180px] rotate-12 group-hover:rotate-0 transition-transform duration-1000">forum</span>
              </div>
              <div className="md:col-span-12 glass-hud p-12 flex flex-col md:flex-row items-center gap-16 reveal-assemble stagger-3">
                <div className="flex-1">
                  <h3 className="font-headline-md text-white mb-6 architectural tracking-[0.3em]">File Management</h3>
                  <p className="text-white/30 text-lg leading-relaxed uppercase text-sm tracking-widest">Upload up to 5 documents per order with per-file configuration. Secure Cloudinary storage, automatic preview generation, and version tracking.</p>
                </div>
                <div className="shrink-0">
                  <a href="/login" className="bg-white text-black px-12 py-5 font-black text-xs architectural btn-magnetic flex items-center gap-4 hover:bg-secondary hover:text-white transition-colors">
                    Try It Free
                    <span className="material-symbols-outlined">arrow_forward</span>
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 bg-background border-y border-white/5">
          <div className="max-w-container-max-width mx-auto px-margin-desktop">
            <p className="text-center architectural text-[10px] text-white/20 mb-16 tracking-[1.5em]">Trusted By Industry Leaders</p>
            <div className="flex flex-wrap justify-center items-center gap-x-24 gap-y-12 opacity-10 hover:opacity-40 transition-opacity duration-1000">
              <div className="font-black text-2xl architectural">Xerox_Core</div>
              <div className="font-black text-2xl architectural">Heidelberg_Link</div>
              <div className="font-black text-2xl architectural">Canon_Optic</div>
              <div className="font-black text-2xl architectural">Konica_Neural</div>
              <div className="font-black text-2xl architectural">Ricoh_Flow</div>
            </div>
          </div>
        </section>

        <section id="pricing" className="py-40 bg-background border-t border-white/5">
          <div className="max-w-container-max-width mx-auto px-margin-desktop">
            <div className="text-center mb-24 reveal-assemble">
              <span className="font-label-md text-label-md text-secondary architectural block mb-6 tracking-[0.5em]">PRICING</span>
              <h2 className="font-headline-lg text-headline-lg text-white mb-6 architectural tracking-[0.3em]">Simple, Transparent Pricing.</h2>
              <p className="text-white/30 text-body-lg text-sm max-w-xl mx-auto architectural tracking-[0.1em]">No hidden fees. Start free, scale as you grow.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="glass-hud p-10 flex flex-col justify-between group reveal-assemble stagger-1">
                <div>
                  <h3 className="font-headline-md text-white mb-2 architectural tracking-[0.2em]">Starter</h3>
                  <p className="text-white/30 text-[10px] architectural mb-8 uppercase tracking-widest">For small shops</p>
                  <div className="mb-8">
                    <span className="text-white font-display text-5xl font-black">Free</span>
                  </div>
                  <ul className="space-y-4 text-white/40 text-[10px] font-black architectural">
                    <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">check</span> Up to 50 orders/month</li>
                    <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">check</span> Priority queue access</li>
                    <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">check</span> Basic file management</li>
                    <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">check</span> Email support</li>
                  </ul>
                </div>
                <a href="/login" className="mt-10 block w-full text-center border border-white/20 text-white py-4 font-black text-xs architectural hover:bg-white/5 transition-all uppercase tracking-[0.3em]">
                  Get Started
                </a>
              </div>
              <div className="bg-secondary p-10 flex flex-col justify-between group reveal-assemble stagger-2 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent" />
                <div className="relative z-10">
                  <h3 className="font-headline-md text-white mb-2 architectural tracking-[0.2em]">Professional</h3>
                  <p className="text-white/60 text-[10px] architectural mb-8 uppercase tracking-widest">For growing businesses</p>
                  <div className="mb-8">
                    <span className="text-white font-display text-5xl font-black">$29</span>
                    <span className="text-white/60 text-sm architectural">/month</span>
                  </div>
                  <ul className="space-y-4 text-white/70 text-[10px] font-black architectural">
                    <li className="flex items-center gap-3"><span className="material-symbols-outlined text-sm">check</span> Unlimited orders</li>
                    <li className="flex items-center gap-3"><span className="material-symbols-outlined text-sm">check</span> Priority queue + analytics</li>
                    <li className="flex items-center gap-3"><span className="material-symbols-outlined text-sm">check</span> Advanced file management</li>
                    <li className="flex items-center gap-3"><span className="material-symbols-outlined text-sm">check</span> Priority support</li>
                    <li className="flex items-center gap-3"><span className="material-symbols-outlined text-sm">check</span> Custom branding</li>
                  </ul>
                </div>
                <a href="/login" className="mt-10 block w-full text-center bg-white text-black py-4 font-black text-xs architectural hover:bg-white/90 transition-all uppercase tracking-[0.3em] relative z-10">
                  Start Trial
                </a>
              </div>
              <div className="glass-hud p-10 flex flex-col justify-between group reveal-assemble stagger-3">
                <div>
                  <h3 className="font-headline-md text-white mb-2 architectural tracking-[0.2em]">Enterprise</h3>
                  <p className="text-white/30 text-[10px] architectural mb-8 uppercase tracking-widest">For large print houses</p>
                  <div className="mb-8">
                    <span className="text-white font-display text-5xl font-black">$99</span>
                    <span className="text-white/60 text-sm architectural">/month</span>
                  </div>
                  <ul className="space-y-4 text-white/40 text-[10px] font-black architectural">
                    <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">check</span> Unlimited orders + users</li>
                    <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">check</span> Full analytics suite</li>
                    <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">check</span> API access</li>
                    <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">check</span> Dedicated account manager</li>
                    <li className="flex items-center gap-3"><span className="text-secondary material-symbols-outlined text-sm">check</span> Custom integrations</li>
                  </ul>
                </div>
                <a href="/login" className="mt-10 block w-full text-center border border-white/20 text-white py-4 font-black text-xs architectural hover:bg-white/5 transition-all uppercase tracking-[0.3em]">
                  Contact Sales
                </a>
              </div>
            </div>
          </div>
        </section>

        <section className="relative py-60 overflow-hidden bg-background">
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(254,107,0,0.15),_transparent_70%)]" />
            <div className="absolute inset-0 data-grid-thin opacity-10" />
          </div>
          <div className="relative z-10 max-w-container-max-width mx-auto px-margin-desktop text-center reveal-assemble">
            <div className="max-w-5xl mx-auto">
              <h2 className="font-display text-[80px] md:text-[120px] text-white mb-12 leading-[0.8] architectural tracking-tighter">Ready to<br />Streamline?</h2>
              <p className="font-body-lg text-body-lg mb-20 text-white/30 max-w-2xl mx-auto architectural tracking-[0.2em] text-sm">
                No Credit Card // Secure Cloud // 5-min Setup
              </p>
              <div className="flex flex-col sm:flex-row justify-center gap-10">
                <a href="/login" className="bg-secondary text-white px-20 py-8 font-black text-sm architectural btn-magnetic shadow-[0_0_60px_rgba(254,107,0,0.4)] hover:shadow-secondary/60">
                  Start Free Trial
                </a>
                <a href="#features" className="glass-hud text-white px-20 py-8 font-black text-sm architectural border border-white/10 hover:bg-white/5 transition-all">
                  View Demo
                </a>
              </div>
              <div className="mt-20 flex items-center justify-center gap-16 text-white/20 font-black architectural text-[9px] tracking-[0.5em]">
                <span className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-secondary" /> No Credit Card</span>
                <span className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-secondary" /> Google Sign-in</span>
                <span className="flex items-center gap-3"><span className="w-1.5 h-1.5 bg-secondary" /> 5-min Setup</span>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-background text-white py-24 border-t border-white/5 relative z-10">
        <div className="max-w-container-max-width mx-auto px-margin-desktop">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-20 mb-32">
            <div className="md:col-span-1">
              <div className="font-display text-2xl font-black tracking-tighter mb-10 architectural text-white">PRINTFLOW</div>
              <p className="text-white/30 text-xs architectural leading-relaxed tracking-widest">Digital order management for modern print shops. Streamline your workflow, delight your customers.</p>
            </div>
            <div>
              <h5 className="font-black text-white mb-10 architectural text-[10px] tracking-[0.6em] text-secondary">Platform</h5>
              <ul className="space-y-5 text-white/30 text-[10px] font-black architectural">
                <li><a className="hover:text-white transition-colors" href="#">Queue System</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Customer Portal</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Owner Dashboard</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-black text-white mb-10 architectural text-[10px] tracking-[0.6em] text-secondary">Resources</h5>
              <ul className="space-y-5 text-white/30 text-[10px] font-black architectural">
                <li><a className="hover:text-white transition-colors" href="#">Documentation</a></li>
                <li><a className="hover:text-white transition-colors" href="#">API Reference</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Status</a></li>
              </ul>
            </div>
            <div>
              <h5 className="font-black text-white mb-10 architectural text-[10px] tracking-[0.6em] text-secondary">Company</h5>
              <ul className="space-y-5 text-white/30 text-[10px] font-black architectural">
                <li><a className="hover:text-white transition-colors" href="#">About</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Blog</a></li>
                <li><a className="hover:text-white transition-colors" href="#">Contact</a></li>
              </ul>
            </div>
          </div>
          <div className="pt-12 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-10">
            <p className="text-white/10 text-[9px] architectural font-black">© 2025 PRINTFLOW DIGITAL SYSTEMS // ALL RIGHTS RESERVED.</p>
            <div className="flex gap-12 text-white/10 text-[9px] architectural font-black">
              <a className="hover:text-white" href="#">Terms</a>
              <a className="hover:text-white" href="#">Privacy</a>
              <a className="hover:text-white" href="#">Status</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
