interface StatusTimelineProps {
  currentStatus: string
}

const STEPS = [
  { key: 'PENDING', label: 'Pending' },
  { key: 'ACCEPTED', label: 'Accepted' },
  { key: 'IN_PROGRESS', label: 'In Progress' },
  { key: 'COMPLETED', label: 'Completed' },
]

export default function StatusTimeline({ currentStatus }: StatusTimelineProps) {
  const currentIndex = STEPS.findIndex((s) => s.key === currentStatus)

  return (
    <div className="flex items-center gap-1 py-3">
      {STEPS.map((step, i) => {
        const isCompleted = i <= currentIndex && currentStatus !== 'CANCELLED'
        const isCurrent = step.key === currentStatus
        return (
          <div key={step.key} className="flex-1 flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium
                  ${isCompleted ? 'bg-green-500 text-white' : isCurrent ? 'bg-brand-blue text-white ring-2 ring-brand-blue/30' : 'bg-gray-200 text-gray-500'}`}
              >
                {isCompleted ? '✓' : i + 1}
              </div>
              <span className={`text-xs mt-1 ${isCurrent ? 'text-brand-blue font-medium' : 'text-gray-500'}`}>
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mx-2 mt-[-1.5rem] ${isCompleted ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}
