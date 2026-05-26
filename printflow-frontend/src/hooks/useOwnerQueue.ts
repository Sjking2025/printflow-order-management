import { useQuery } from '@tanstack/react-query'
import * as ownerService from '../services/owner.service'

export const useDashboard = () => {
  return useQuery({
    queryKey: ['dashboard'],
    queryFn: ownerService.getDashboard,
    refetchInterval: 30_000,
  })
}

export const useOwnerQueue = (status?: string) => {
  return useQuery({
    queryKey: ['owner-queue', status],
    queryFn: () => ownerService.getQueue(status),
    refetchInterval: 15_000,
  })
}

export const useOwnerCustomers = () => {
  return useQuery({
    queryKey: ['owner-customers'],
    queryFn: ownerService.getShopCustomers,
    refetchInterval: 30_000,
  })
}
