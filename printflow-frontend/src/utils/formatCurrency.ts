export const formatCurrency = (amount: number | string | undefined | null): string => {
  if (amount == null) return '₹0.00'
  const num = typeof amount === 'string' ? parseFloat(amount) : amount
  return `₹${num.toFixed(2)}`
}
