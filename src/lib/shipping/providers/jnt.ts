import type { ShippingProviderClient, CreateShipmentInput, ShipmentResult, TrackingUpdate } from '../types'

const JNT_API_URL = 'https://jandt-express.com/api/v1'

export class JntProvider implements ShippingProviderClient {
  private apiKey: string
  private accountId: string

  constructor(credentials: { apiKey: string; accountId?: string }) {
    this.apiKey = credentials.apiKey
    this.accountId = credentials.accountId || ''
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const response = await fetch(`${JNT_API_URL}/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        customer_id: this.accountId,
        reference: input.orderNumber,
        consignee: {
          name: input.customerName,
          phone: input.customerPhone,
          address: `${input.address.street}, ${input.address.area}, ${input.address.city}, ${input.address.governorate}`,
        },
        cod_amount: input.codAmount,
        weight: input.weight,
        pieces: input.pieces,
        description: input.description,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`J&T API error: ${JSON.stringify(error)}`)
    }

    const data = await response.json() as { tracking_number: string; waybill_url?: string; order_id: string }

    return {
      trackingNumber: data.tracking_number,
      waybillUrl: data.waybill_url,
      providerOrderId: data.order_id,
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingUpdate[]> {
    const response = await fetch(`${JNT_API_URL}/tracking/${trackingNumber}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })

    if (!response.ok) throw new Error('Failed to track J&T shipment')

    const data = await response.json() as { events?: Array<{ status: string; description: string; timestamp: string; location?: string }> }

    return (data.events || []).map((event) => ({
      status: event.status,
      description: event.description,
      timestamp: event.timestamp,
      location: event.location,
    }))
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    const response = await fetch(`${JNT_API_URL}/orders/${trackingNumber}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
    return response.ok
  }
}
