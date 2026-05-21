import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOwnerQueue } from '../../hooks/useOwnerQueue'
import Card from '../../components/ui/Card'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'

export default function QueuePage() {
  const { data, isLoading, isError, refetch } = useOwnerQueue()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load queue" onRetry={() => refetch()} />

  const orders = data?.items || []
  const filtered = search
    ? orders.filter((o: any) =>
        o.orderNumber?.toLowerCase().includes(search.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(search.toLowerCase())
      )
    : orders

  return (
    <div className="space-y-stack-lg">
      <div className="hidden md:flex justify-between items-center w-full bg-surface border-b border-outline-variant pb-2">
        <nav className="flex gap-stack-md">
          <a href="#" className="text-on-surface-variant hover:bg-surface-container-high transition-colors px-2 py-1 rounded font-label-md text-label-md">Dashboard</a>
          <a href="#" className="text-secondary-container font-bold border-b-2 border-secondary-container pb-1 font-label-md text-label-md px-2 py-1">Orders</a>
          <a href="#" className="text-on-surface-variant hover:bg-surface-container-high transition-colors px-2 py-1 rounded font-label-md text-label-md">Inventory</a>
          <a href="#" className="text-on-surface-variant hover:bg-surface-container-high transition-colors px-2 py-1 rounded font-label-md text-label-md">Customers</a>
        </nav>
        <div className="flex items-center gap-stack-md">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-4 py-1 border border-outline-variant rounded bg-surface focus:border-primary focus:ring-0 text-sm w-64 h-8 outline-none"
              placeholder="Search orders..."
            />
          </div>
          <button className="text-primary hover:bg-surface-container-high transition-colors p-1 rounded-full">
            <span className="material-symbols-outlined">notifications</span>
          </button>
          <button className="text-primary hover:bg-surface-container-high transition-colors p-1 rounded-full">
            <span className="material-symbols-outlined">account_circle</span>
          </button>
        </div>
      </div>

      <div className="bg-surface-container-high border-b border-outline-variant px-margin-desktop py-stack-sm flex justify-between items-center -mx-margin-mobile md:-mx-margin-desktop px-margin-mobile md:px-margin-desktop">
        <div className="flex items-center gap-stack-sm">
          <span className="material-symbols-outlined text-outline">build</span>
          <span className="font-body-sm text-body-sm text-on-surface-variant">Machine 2: Maintenance Mode Active</span>
        </div>
        <span className="font-label-md text-label-md text-primary bg-primary-fixed px-2 py-1 rounded">Est. 45m</span>
      </div>

      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-stack-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Priority Queue</h2>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Managing {orders.length} active jobs across 3 terminals.</p>
        </div>
        <div className="flex gap-stack-sm">
          <button className="btn-outline">
            <span className="material-symbols-outlined text-[18px]">pause</span> Hold Selected
          </button>
          <button className="btn-primary">
            <span className="material-symbols-outlined text-[18px]">play_arrow</span> Process Batch
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
        <div className="lg:col-span-8 flex flex-col gap-stack-md">
          <div className="bg-surface border-2 border-secondary-container rounded-lg p-stack-lg relative overflow-hidden shadow-sm"
            style={{ boxShadow: '0 0 10px rgba(254, 107, 0, 0.3)', animation: 'pulse-glow 2s infinite' }}>
            <div className="absolute top-0 right-0 bg-secondary-container text-on-secondary-container font-label-md text-label-md px-3 py-1 rounded-bl-lg flex items-center gap-1">
              <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>warning</span>
              URGENT EXPEDITE
            </div>
            <div className="flex justify-between items-start mb-stack-md">
              <div className="flex items-center gap-stack-md">
                <input type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary w-5 h-5 cursor-pointer" />
                <div>
                  <h3 className="font-body-lg text-body-lg text-primary font-bold">#ORD-9042 - Acme Corp Brochures</h3>
                  <span className="font-body-sm text-body-sm text-on-surface-variant">Due in 2 hours &middot; Terminal 1</span>
                </div>
              </div>
              <span className="bg-error-container text-on-error-container font-label-md text-label-md px-2 py-1 rounded-full">Pre-Press</span>
            </div>
            <div className="grid grid-cols-3 gap-stack-md mb-stack-md border-y border-surface-variant py-stack-sm">
              <div>
                <span className="block font-label-md text-label-md text-on-surface-variant mb-1">Specs</span>
                <span className="block font-body-sm text-body-sm">100lb Gloss, Full Color, Tri-fold</span>
              </div>
              <div>
                <span className="block font-label-md text-label-md text-on-surface-variant mb-1">Quantity</span>
                <span className="block font-body-sm text-body-sm">5,000</span>
              </div>
              <div>
                <span className="block font-label-md text-label-md text-on-surface-variant mb-1">Operator</span>
                <span className="block font-body-sm text-body-sm">Unassigned</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2 w-1/2">
                <span className="font-label-md text-label-md text-outline">Progress</span>
                <div className="w-full bg-surface-variant rounded-full h-2">
                  <div className="bg-secondary-container h-2 rounded-full" style={{ width: '15%' }}></div>
                </div>
              </div>
              <button className="text-primary font-label-md text-label-md hover:underline">View Details</button>
            </div>
          </div>

          {filtered.slice(0, 5).map((order: any, i: number) => (
            <div key={order.id} className="bg-surface border border-outline-variant rounded-lg p-stack-md hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/owner/orders/${order.id}`)}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-stack-md w-1/2">
                  <input type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary w-5 h-5 cursor-pointer" onClick={(e) => e.stopPropagation()} />
                  <div className={`w-10 h-10 rounded flex items-center justify-center flex-shrink-0 ${i % 2 === 0 ? 'bg-primary-fixed' : 'bg-surface-variant'}`}>
                    <span className={`material-symbols-outlined ${i % 2 === 0 ? 'text-primary' : 'text-outline'}`}>
                      {i % 2 === 0 ? 'description' : 'photo_prints'}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-body-md text-body-md font-semibold text-primary">#{order.orderNumber || `ORD-${9000 + i}`}</h4>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">{order.customerName || 'Customer'} &middot; {order.documentCount || 1} document(s)</p>
                  </div>
                </div>
                <div className="flex items-center gap-stack-lg">
                  <div className="hidden sm:block text-right">
                    <span className="block font-label-md text-label-md text-on-surface-variant">Status</span>
                    <span className={`font-label-md text-label-md px-2 py-1 rounded-full text-xs ${
                      i === 0 ? 'bg-surface-tint text-on-primary' : 'bg-surface-variant text-on-surface-variant'
                    }`}>
                      {i === 0 ? 'Printing' : 'Queued'}
                    </span>
                  </div>
                  <button className="text-outline hover:text-primary transition-colors" onClick={(e) => e.stopPropagation()}>
                    <span className="material-symbols-outlined">more_vert</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-4 flex flex-col gap-stack-md">
          <Card>
            <h3 className="font-label-md text-label-md text-on-surface-variant mb-stack-md uppercase tracking-wider">Context: Acme Corp</h3>
            <div className="flex items-center gap-stack-sm mb-stack-md">
              <div className="w-12 h-12 rounded-full bg-primary-fixed-dim flex items-center justify-center text-primary font-bold text-lg">AC</div>
              <div>
                <h4 className="font-body-md text-body-md font-semibold text-primary">Acme Corp</h4>
                <span className="font-body-sm text-body-sm text-secondary-container">Premium Tier Client</span>
              </div>
            </div>
            <div className="space-y-stack-sm">
              <div className="flex justify-between items-center font-body-sm text-body-sm">
                <span className="text-on-surface-variant">Total Lifetime Value</span>
                <span className="font-semibold text-primary">$42,500</span>
              </div>
              <div className="flex justify-between items-center font-body-sm text-body-sm">
                <span className="text-on-surface-variant">Avg. Turnaround Req</span>
                <span className="font-semibold text-primary">24 Hours</span>
              </div>
              <div className="flex justify-between items-center font-body-sm text-body-sm">
                <span className="text-on-surface-variant">Active Balance</span>
                <span className="font-semibold text-primary">$1,200</span>
              </div>
            </div>
            <button className="mt-stack-md w-full border border-outline text-primary font-label-md text-label-md h-10 rounded hover:bg-surface-container-lowest transition-colors">View Full Profile</button>
          </Card>

          <Card>
            <h3 className="font-label-md text-label-md text-on-surface-variant mb-stack-md uppercase tracking-wider">Recent History (Acme Corp)</h3>
            <ul className="space-y-stack-sm">
              {[
                { icon: 'check_circle', label: 'Business Cards Batch 4', sub: 'Completed 2 days ago' },
                { icon: 'warning', label: 'Annual Report 2023', sub: 'Delayed (Paper Shortage) • 1 wk ago' },
                { icon: 'check_circle', label: 'Trade Show Banners', sub: 'Completed 2 wks ago' },
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-stack-sm py-2 border-b border-surface-variant last:border-0">
                  <span className="material-symbols-outlined text-outline text-sm mt-1">{item.icon}</span>
                  <div>
                    <p className="font-body-sm text-body-sm text-primary">{item.label}</p>
                    <p className="font-label-md text-label-md text-on-surface-variant text-xs">{item.sub}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      <style>{`
        @keyframes pulse-glow {
          0% { box-shadow: 0 0 10px rgba(254, 107, 0, 0.3); }
          50% { box-shadow: 0 0 15px rgba(254, 107, 0, 0.8); }
          100% { box-shadow: 0 0 10px rgba(254, 107, 0, 0.3); }
        }
      `}</style>
    </div>
  )
}
