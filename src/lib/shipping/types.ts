export type ShippingProvider = 'bosta' | 'aramex' | 'jnt' | 'mylerz'

export type CreateShipmentInput = {
  orderId: string
  orderNumber: string
  customerName: string
  customerPhone: string
  address: {
    governorate: string
    city: string
    area: string
    street: string
    building?: string
    floor?: string
    apartment?: string
  }
  codAmount: number
  weight: number
  description: string
  pieces: number
}

export type ShipmentResult = {
  trackingNumber: string
  waybillUrl?: string
  estimatedDelivery?: string
  providerOrderId: string
}

export type TrackingUpdate = {
  status: string
  description: string
  timestamp: string
  location?: string
}

export interface ShippingProviderClient {
  createShipment(input: CreateShipmentInput): Promise<ShipmentResult>
  trackShipment(trackingNumber: string): Promise<TrackingUpdate[]>
  cancelShipment(trackingNumber: string): Promise<boolean>
}
