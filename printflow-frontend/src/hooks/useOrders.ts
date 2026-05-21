import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import * as ordersService from '../services/orders.service'
import { ORDER_POLL_INTERVAL } from '../config/constants'

export const useMyOrders = (page = 1) => {
  return useQuery({
    queryKey: ['orders', page],
    queryFn: () => ordersService.getMyOrders(page),
  })
}

export const useOrderDetail = (orderId: string | undefined) => {
  return useQuery({
    queryKey: ['order', orderId],
    queryFn: () => ordersService.getOrderById(orderId!),
    enabled: !!orderId,
    refetchInterval: ORDER_POLL_INTERVAL,
  })
}

export const useCreateOrder = () => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: any) => ordersService.createOrder(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}

export const useUpdateCopies = () => {
  return useMutation({
    mutationFn: ({ orderId, documentId, copies }: { orderId: string; documentId: string; copies: number }) =>
      ordersService.updateCopies(orderId, documentId, copies),
  })
}
