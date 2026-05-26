export interface Shop {
  id: string
  name: string
  address?: string
  phone?: string
  whatsapp?: string
  isOpen: boolean
  closureMode?: string
  closureMsg?: string
  closureUntil?: string
  lockTimerMins: number
  copyModifyWindowMins: number
  upiId?: string
  qrCodeUrl?: string
}

export interface PriceConfig {
  id: string
  shopId: string
  bwPerPageA4: number
  colorPerPageA4: number
  a3Multiplier: number
  doubleSideDiscount: number
  spiralBindingFlat: number
  stapleFlat: number
  laminationPerPage: number
  urgencyHighFee: number
  urgencyCriticalFee: number
  updatedAt: string
}
