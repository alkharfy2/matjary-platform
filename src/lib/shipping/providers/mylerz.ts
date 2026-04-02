import type { ShippingProviderClient, CreateShipmentInput, ShipmentResult, TrackingUpdate } from '../types'

const MYLERZ_API_URL = 'https://api.mylerz.com/v2'

export class MylerzProvider implements ShippingProviderClient {
  private apiKey: string

  constructor(credentials: { apiKey: string }) {
    this.apiKey = credentials.apiKey
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const response = await fetch(`${MYLERZ_API_URL}/shipments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        reference: input.orderNumber,
        receiver_name: input.customerName,
        receiver_phone: input.customerPhone,
        receiver_address: `${input.address.street}, ${input.address.area}`,
        receiver_city: input.address.city,
        receiver_zone: input.address.governorate,
        cod_amount: input.codAmount,
        weight: input.weight,
        number_of_items: input.pieces,
        description: input.description,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Mylerz API error: ${JSON.stringify(error)}`)
    }

    const data = await response.json() as { tracking_number: string; awb_url?: string; shipment_id: string }

    return {
      trackingNumber: data.tracking_number,
      waybillUrl: data.awb_url,
      providerOrderId: data.shipment_id,
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingUpdate[]> {
    const response = await fetch(`${MYLERZ_API_URL}/tracking/${trackingNumber}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })

    if (!response.ok) throw new Error('Failed to track Mylerz shipment')

    const data = await response.json() as { history?: Array<{ status: string; description: string; date: string; location?: string }> }

    return (data.history || []).map((event) => ({
      status: event.status,
      description: event.description,
      timestamp: event.date,
      location: event.location,
    }))
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    const response = await fetch(`${MYLERZ_API_URL}/shipments/${trackingNumber}/cancel`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.apiKey}` },
    })
    return response.ok
  }
}
