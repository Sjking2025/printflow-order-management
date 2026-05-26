import { useState, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { useAuthStore } from '../../store/auth.store'
import { getClarificationThread, sendClarificationMessage } from '../../services/clarifications.service'
import { Order } from '../../types/order.types'

interface Props {
  isOpen: boolean
  onClose: () => void
  order: Order
}

const QUICK_REPLIES = [
  "Please re-upload document",
  "Is this color or B&W?",
  "Margin check required"
]

export default function ClarificationDrawer({ isOpen, onClose, order }: Props) {
  const [message, setMessage] = useState('')
  const [sendError, setSendError] = useState('')
  const user = useAuthStore(s => s.user)
  const isOwner = user?.role === 'OWNER'
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ['clarifications', order.id],
    queryFn: () => getClarificationThread(order.id),
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false
  })

  const sendMutation = useMutation({
    mutationFn: (msg: string) => sendClarificationMessage(order.id, msg),
    onSuccess: () => {
      setMessage('')
      setSendError('')
      queryClient.invalidateQueries({ queryKey: ['clarifications', order.id] })
      queryClient.invalidateQueries({ queryKey: ['order', order.id] })
    },
    onError: (err: any) => {
      setSendError(err.response?.data?.error?.message || err.response?.data?.message || err.message || 'Failed to send message')
    }
  })

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [messages, isOpen])

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    if (!message.trim()) return
    sendMutation.mutate(message)
  }

  const handleQuickReply = (reply: string) => {
    sendMutation.mutate(reply)
  }

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[50] transition-opacity"
          onClick={onClose}
        ></div>
      )}

      {/* Drawer */}
      <div 
        className={`fixed inset-y-0 right-0 w-full md:w-96 bg-white shadow-2xl z-[60] flex flex-col border-l border-outline-variant transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-outline-variant bg-primary text-on-primary flex justify-between items-center">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[20px]">chat</span>
              <h3 className="font-headline-sm text-lg font-bold">Clarification: {order.orderNumber}</h3>
            </div>
            <p className="text-xs text-primary-fixed-dim">
              {isOwner ? 'Customer Chat' : 'Shop Owner'}
            </p>
          </div>
          <button 
            className="p-1 hover:bg-white/10 rounded-full transition-colors"
            onClick={onClose}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-surface">
          {isLoading ? (
            <div className="text-center text-sm text-on-surface-variant">Loading messages...</div>
          ) : messages.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-on-surface-variant opacity-70">
              <span className="material-symbols-outlined text-4xl mb-2">forum</span>
              <p>No messages yet.<br/>Start the conversation below.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMine = msg.senderRole === user?.role
              return (
                <div key={msg.id} className={`flex flex-col ${isMine ? 'items-end' : 'items-start'}`}>
                  <div 
                    className={`p-3 rounded-lg max-w-[85%] ${
                      isMine 
                        ? 'bg-primary text-on-primary rounded-tr-none' 
                        : 'bg-surface-container-high text-on-surface rounded-tl-none'
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.message}</p>
                  </div>
                  <span className="text-[10px] text-on-surface-variant mt-1 mx-1">
                    {format(new Date(msg.createdAt), 'hh:mm a')}
                  </span>
                </div>
              )
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Footer / Input */}
        <div className="p-4 border-t border-outline-variant bg-surface-container-lowest">
          {sendError && (
            <div className="mb-3 p-2 bg-error-container text-on-error-container text-sm rounded flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px]">error</span>
              {sendError}
            </div>
          )}
          {/* Quick Replies (Owner Only) */}
          {isOwner && messages.length === 0 && (
            <div className="flex gap-2 overflow-x-auto pb-3 mb-3 custom-scrollbar">
              {QUICK_REPLIES.map(reply => (
                <button 
                  key={reply}
                  onClick={() => handleQuickReply(reply)}
                  disabled={sendMutation.isPending}
                  className="whitespace-nowrap px-3 py-1 bg-surface-variant text-on-surface-variant rounded-full text-xs font-medium hover:bg-outline-variant transition-colors"
                >
                  {reply}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSend} className="flex gap-2">
            <input 
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={sendMutation.isPending}
              className="flex-1 border-outline-variant rounded focus:ring-secondary focus:border-secondary text-sm px-3 py-2 border"
              placeholder="Type a message..."
            />
            <button 
              type="submit"
              disabled={!message.trim() || sendMutation.isPending}
              className="bg-secondary-container text-on-secondary-container p-2 rounded hover:opacity-90 transition-opacity flex items-center justify-center disabled:opacity-50"
            >
              <span className="material-symbols-outlined">send</span>
            </button>
          </form>
        </div>
      </div>
    </>
  )
}
