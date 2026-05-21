import { format, formatDistanceToNow, parseISO } from 'date-fns'

export const formatDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return 'N/A'
  try {
    return format(parseISO(dateStr), 'dd MMM yyyy, hh:mm a')
  } catch {
    return 'N/A'
  }
}

export const formatRelative = (dateStr: string | undefined | null): string => {
  if (!dateStr) return ''
  try {
    return formatDistanceToNow(parseISO(dateStr), { addSuffix: true })
  } catch {
    return ''
  }
}

export const formatShortDate = (dateStr: string | undefined | null): string => {
  if (!dateStr) return 'N/A'
  try {
    return format(parseISO(dateStr), 'dd MMM yy')
  } catch {
    return 'N/A'
  }
}
