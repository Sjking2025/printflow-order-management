import { useMemo } from 'react'
import { PriceConfig } from '../types/shop.types'
import { UploadedFile } from '../types/order.types'
import { calculateDocumentPrice, calculateUrgencyFee } from '../utils/calculatePrice'

export const usePriceCalculator = (
  documents: UploadedFile[],
  urgency: string,
  priceConfig: PriceConfig | null
) => {
  return useMemo(() => {
    if (!priceConfig) {
      return { documentPrices: [], documentsTotal: 0, urgencyFee: 0, total: 0 }
    }

    const documentPrices = documents.map((doc) => {
      if (!doc.pageCount || doc.pageCount < 1) return { fileName: doc.fileName, unitPrice: 0, subtotal: 0 }
      const result = calculateDocumentPrice(
        {
          printType: doc.printType,
          paperSize: doc.paperSize,
          sideType: doc.sideType,
          binding: doc.binding,
          lamination: doc.lamination,
          copies: doc.copies,
          pageCount: doc.pageCount,
        },
        priceConfig
      )
      return { fileName: doc.fileName, ...result }
    })

    const documentsTotal = documentPrices.reduce((sum, d) => sum + d.subtotal, 0)
    const urgencyFee = calculateUrgencyFee(urgency, priceConfig)
    const total = documentsTotal + urgencyFee

    return { documentPrices, documentsTotal, urgencyFee, total }
  }, [documents, urgency, priceConfig])
}
