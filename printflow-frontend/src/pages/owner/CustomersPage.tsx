import { useOwnerCustomers } from '../../hooks/useOwnerQueue'
import Spinner from '../../components/ui/Spinner'
import ErrorState from '../../components/ui/ErrorState'
import { formatDate } from '../../utils/formatDate'

export default function CustomersPage() {
  const { data: customers, isLoading, isError, refetch } = useOwnerCustomers()

  if (isLoading) return <Spinner size="lg" className="mt-20" />
  if (isError) return <ErrorState message="Failed to load customers" onRetry={() => refetch()} />

  const list = Array.isArray(customers) ? customers : []

  return (
    <div className="space-y-stack-lg">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-primary">Customers</h2>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {list.length} customer{list.length !== 1 ? 's' : ''} have placed orders at your shop.
          </p>
        </div>
      </div>

      {list.length === 0 ? (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-xl text-center">
          <span className="material-symbols-outlined text-outline text-5xl mb-4">group_off</span>
          <p className="font-body-md text-body-md text-on-surface-variant">No customers yet. Orders will appear here once customers start placing them.</p>
        </div>
      ) : (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-outline-variant bg-surface-container-low">
                <th className="text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider p-stack-md">Customer</th>
                <th className="text-left font-label-md text-label-md text-on-surface-variant uppercase tracking-wider p-stack-md hidden sm:table-cell">Email</th>
                <th className="text-center font-label-md text-label-md text-on-surface-variant uppercase tracking-wider p-stack-md">Orders</th>
                <th className="text-right font-label-md text-label-md text-on-surface-variant uppercase tracking-wider p-stack-md hidden md:table-cell">Last Order</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.customerId} className="border-b border-outline-variant hover:bg-surface-container-low transition-colors">
                  <td className="p-stack-md">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center font-bold text-primary shrink-0">
                        {c.customerName?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p className="font-body-md text-body-md font-semibold text-on-surface">{c.customerName}</p>
                        <p className="font-label-md text-label-md text-on-surface-variant sm:hidden">{c.customerEmail || ''}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-stack-md hidden sm:table-cell">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">{c.customerEmail || '—'}</span>
                  </td>
                  <td className="p-stack-md text-center">
                    <span className="inline-flex items-center justify-center bg-primary-container text-primary font-bold font-body-md text-body-md rounded-full min-w-[32px] h-8 px-2">
                      {c.orderCount}
                    </span>
                  </td>
                  <td className="p-stack-md text-right hidden md:table-cell">
                    <span className="font-body-sm text-body-sm text-on-surface-variant">
                      {c.latestOrderDate ? formatDate(c.latestOrderDate) : '—'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}