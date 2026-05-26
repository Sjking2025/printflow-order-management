import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { 
  getNotifications, 
  markAsRead, 
  markAllAsRead, 
  Notification 
} from '../../services/notifications.service'
import { useAuthStore } from '../../store/auth.store'

export default function NotificationsPage() {
  const [filter, setFilter] = useState<'ALL' | 'UNREAD'>('ALL')
  const queryClient = useQueryClient()
  const user = useAuthStore((s) => s.user)
  const isOwner = user?.role === 'OWNER'

  const { data, isLoading } = useQuery({
    queryKey: ['notifications', filter],
    queryFn: () => getNotifications(1, 50, filter === 'UNREAD'),
  })

  const notifications = data?.items || []

  const markReadMutation = useMutation({
    mutationFn: markAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] })
    }
  })

  const markAllReadMutation = useMutation({
    mutationFn: markAllAsRead,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      queryClient.invalidateQueries({ queryKey: ['unreadNotifications'] })
    }
  })

  const handleNotificationClick = (notification: Notification) => {
    if (notification.status !== 'READ') {
      markReadMutation.mutate(notification.id)
    }
  }

  const getIconForType = (type: string) => {
    switch (type) {
      case 'NEW_ORDER': return 'assignment_add'
      case 'CLARIFICATION_REPLIED': return 'forum'
      case 'DELAYED': return 'warning'
      case 'WAITING_CLARIFICATION': return 'contact_support'
      case 'COMPLETED': return 'task_alt'
      case 'ACCEPTED': return 'thumb_up'
      case 'IN_PROGRESS': return 'print'
      case 'CANCELLED': return 'cancel'
      default: return 'notifications'
    }
  }

  const getIconColorForType = (type: string) => {
    switch (type) {
      case 'NEW_ORDER': return 'bg-tertiary-container text-on-tertiary-container'
      case 'CLARIFICATION_REPLIED': return 'bg-secondary-container text-on-secondary-container'
      case 'DELAYED': return 'bg-error-container text-on-error-container'
      case 'WAITING_CLARIFICATION': return 'bg-secondary-fixed text-on-secondary-fixed-variant'
      case 'COMPLETED': return 'bg-primary-fixed text-on-primary-fixed-variant'
      case 'ACCEPTED': return 'bg-surface-container text-on-surface-variant'
      case 'IN_PROGRESS': return 'bg-primary-container text-on-primary-container'
      case 'CANCELLED': return 'bg-error text-on-error'
      default: return 'bg-surface-container text-on-surface-variant'
    }
  }

  const getBorderColorForType = (type: string) => {
    switch (type) {
      case 'NEW_ORDER': return 'bg-tertiary'
      case 'CLARIFICATION_REPLIED': return 'bg-secondary-container'
      case 'DELAYED': return 'bg-error'
      case 'WAITING_CLARIFICATION': return 'bg-secondary-container'
      case 'COMPLETED': return 'bg-surface-tint'
      case 'ACCEPTED': return 'bg-outline-variant'
      case 'IN_PROGRESS': return 'bg-primary'
      case 'CANCELLED': return 'bg-error'
      default: return 'bg-transparent'
    }
  }

  return (
    <main className="max-w-container-max-width mx-auto px-margin-mobile md:px-margin-desktop py-stack-xl min-h-[calc(100vh-64px)]">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-stack-lg border-b border-outline-variant pb-stack-md">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-primary mb-stack-xs">Notifications</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">
            {isOwner ? 'Monitor new orders and customer activity.' : 'Stay updated with your active print jobs and account activity.'}
          </p>
        </div>
        <div className="mt-stack-md md:mt-0 flex gap-stack-sm items-center">
          <button 
            onClick={() => markAllReadMutation.mutate()}
            disabled={markAllReadMutation.isPending || notifications.length === 0}
            className="flex items-center gap-stack-xs font-label-md text-label-md text-secondary-container hover:bg-secondary-container/10 px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <span className="material-symbols-outlined text-[18px]">done_all</span>
            Mark all as read
          </button>
          <div className="h-8 w-[1px] bg-outline-variant mx-2 hidden md:block"></div>
          <div className="flex gap-stack-xs bg-surface-container-low p-1 rounded-lg">
            <button 
              onClick={() => setFilter('ALL')}
              className={`px-4 py-1 font-label-md text-label-md rounded transition-colors ${filter === 'ALL' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-primary'}`}
            >
              All
            </button>
            <button 
              onClick={() => setFilter('UNREAD')}
              className={`px-4 py-1 font-label-md text-label-md rounded transition-colors ${filter === 'UNREAD' ? 'bg-surface-container-lowest shadow-sm text-primary' : 'text-on-surface-variant hover:text-primary'}`}
            >
              Unread
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-stack-lg">
        <div className="lg:col-span-8 space-y-stack-md">
          {isLoading ? (
            <div className="text-center py-stack-xl text-on-surface-variant">Loading notifications...</div>
          ) : notifications.length === 0 ? (
            <div className="text-center py-stack-xl bg-surface-container-lowest rounded-xl border border-outline-variant">
              <span className="material-symbols-outlined text-[48px] text-outline-variant mb-4">notifications_off</span>
              <h3 className="font-headline-md text-primary">No Notifications</h3>
              <p className="text-on-surface-variant mt-2">{isOwner ? 'No new order activity yet.' : "You're all caught up!"}</p>
            </div>
          ) : (
            notifications.map((notif) => (
              <div 
                key={notif.id}
                className={`group bg-surface-container-lowest border border-outline-variant rounded-xl p-stack-lg hover:border-secondary transition-all hover:shadow-md relative overflow-hidden ${notif.status === 'READ' ? 'opacity-70' : ''}`}
                onClick={() => handleNotificationClick(notif)}
              >
                {notif.status !== 'READ' && (
                  <div className={`absolute left-0 top-0 bottom-0 w-1 ${getBorderColorForType(notif.type)}`}></div>
                )}
                <div className="flex gap-stack-md">
                  <div className={`${getIconColorForType(notif.type)} w-12 h-12 rounded-lg flex items-center justify-center shrink-0`}>
                    <span className="material-symbols-outlined">{getIconForType(notif.type)}</span>
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                      <h3 className="font-headline-md text-[18px] text-primary">{notif.subject || notif.type.replace('_', ' ')}</h3>
                      <span className="font-label-md text-label-md text-on-surface-variant">
                        {formatDistanceToNow(new Date(notif.sentAt), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="font-body-md text-body-md text-on-surface-variant mt-1 whitespace-pre-wrap">
                      {notif.message}
                    </p>
                    <div className="mt-stack-md flex gap-stack-md">
                      <Link 
                        to={isOwner ? `/owner/orders/${notif.orderId}` : `/orders/${notif.orderId}`}
                        className="bg-secondary-container text-white font-label-md text-label-md px-6 py-2 rounded-lg hover:opacity-90 active:scale-95 transition-all"
                      >
                        View Order
                      </Link>
                      {notif.status !== 'READ' && (
                        <button 
                          onClick={(e) => { e.preventDefault(); markReadMutation.mutate(notif.id); }}
                          className="text-on-surface-variant font-label-md text-label-md px-4 py-2 rounded-lg hover:bg-surface-container-high transition-colors"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="lg:col-span-4 space-y-stack-lg hidden lg:block">
          <div className="bg-primary text-on-primary rounded-xl p-stack-lg shadow-xl relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-32 h-32 bg-secondary-container/20 rounded-full blur-2xl"></div>
            <h4 className="font-headline-md text-[20px] mb-stack-sm">Notification Settings</h4>
            <p className="font-body-sm text-body-sm opacity-80 mb-stack-lg">
              {isOwner ? 'Manage how you receive alerts about new orders and customer activity.' : 'Manage how you receive alerts about your print orders.'}
            </p>
            <div className="space-y-stack-md">
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-label-md text-label-md">Email Notifications</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-primary-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary-container"></div>
                </div>
              </label>
              <label className="flex items-center justify-between cursor-pointer">
                <span className="font-label-md text-label-md">WhatsApp / SMS Updates</span>
                <div className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" defaultChecked className="sr-only peer" />
                  <div className="w-9 h-5 bg-primary-container peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-secondary-container"></div>
                </div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
