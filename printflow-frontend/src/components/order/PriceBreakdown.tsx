import { formatCurrency } from '../../utils/formatCurrency'

interface PriceRow {
  fileName: string
  unitPrice: number
  subtotal: number
}

interface PriceBreakdownProps {
  documentPrices: PriceRow[]
  documentsTotal: number
  urgencyFee: number
  total: number
  urgencyLabel?: string
}

export default function PriceBreakdown({ documentPrices, documentsTotal, urgencyFee, total, urgencyLabel }: PriceBreakdownProps) {
  return (
    <div className="space-y-2">
      {documentPrices.map((dp, i) => (
        <div key={i} className="flex justify-between text-sm">
          <span className="text-gray-600 truncate max-w-[200px]">{dp.fileName}</span>
          <span className="font-medium">{formatCurrency(dp.subtotal)}</span>
        </div>
      ))}
      <div className="border-t pt-2 mt-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Documents Total</span>
          <span>{formatCurrency(documentsTotal)}</span>
        </div>
        {urgencyFee > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Urgency Fee ({urgencyLabel || 'Urgent'})</span>
            <span>+{formatCurrency(urgencyFee)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold pt-2 border-t mt-2">
          <span>Total</span>
          <span className="text-brand-blue">{formatCurrency(total)}</span>
        </div>
      </div>
    </div>
  )
}
