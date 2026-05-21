import { PriceConfig } from '../types/shop.types'

export interface PriceInput {
  printType: string
  paperSize: string
  sideType: string
  binding: string
  lamination: string
  copies: number
  pageCount: number
}

export const calculateDocumentPrice = (input: PriceInput, config: PriceConfig) => {
  const isColor = input.printType === 'COLOR'
  const isA3 = input.paperSize === 'A3'
  const isDoubleSide = input.sideType === 'DOUBLE'

  let baseRate = isColor ? config.colorPerPageA4 : config.bwPerPageA4

  if (isA3) {
    baseRate *= config.a3Multiplier
  }

  let pagePrice = baseRate

  if (isDoubleSide && config.doubleSideDiscount > 0) {
    pagePrice = Math.max(0, pagePrice - config.doubleSideDiscount)
  }

  const totalPageCost = pagePrice * input.pageCount * input.copies

  let bindingCost = 0
  if (input.binding === 'SPIRAL') bindingCost = config.spiralBindingFlat
  else if (input.binding === 'STAPLE') bindingCost = config.stapleFlat

  let laminationCost = 0
  if (input.lamination === 'SINGLE_SIDE') laminationCost = config.laminationPerPage
  else if (input.lamination === 'BOTH_SIDES') laminationCost = config.laminationPerPage * 2

  const subtotal = totalPageCost + bindingCost + laminationCost

  return {
    unitPrice: baseRate,
    subtotal,
  }
}

export const calculateUrgencyFee = (urgency: string, config: PriceConfig) => {
  if (urgency === 'HIGH') return config.urgencyHighFee
  if (urgency === 'CRITICAL') return config.urgencyCriticalFee
  return 0
}
