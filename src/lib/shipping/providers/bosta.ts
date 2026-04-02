import type { ShippingProviderClient, CreateShipmentInput, ShipmentResult, TrackingUpdate } from '../types'

const BOSTA_API_URL = 'https://app.bosta.co/api/v2'

export class BostaProvider implements ShippingProviderClient {
  private apiKey: string

  constructor(credentials: { apiKey: string }) {
    this.apiKey = credentials.apiKey
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const response = await fetch(`${BOSTA_API_URL}/deliveries`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: this.apiKey,
      },
      body: JSON.stringify({
        type: 10,
        specs: {
          packageType: 'Parcel',
          size: 'SMALL',
          packageDetails: {
            itemsCount: input.pieces,
            description: input.description,
          },
        },
        dropOffAddress: {
          firstLine: `${input.address.street} ${input.address.building || ''}`.trim(),
          city: input.address.city,
          zone: input.address.area,
          district: input.address.governorate,
        },
        receiver: {
          firstName: input.customerName.split(' ')[0] || input.customerName,
          lastName: input.customerName.split(' ').slice(1).join(' ') || '',
          phone: input.customerPhone,
        },
        cod: input.codAmount,
        businessReference: input.orderNumber,
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Bosta API error: ${(error as Record<string, string>).message || response.statusText}`)
    }

    const data = await response.json() as Record<string, string | undefined>

    return {
      trackingNumber: data.trackingNumber ?? '',
      waybillUrl: data.awbUrl,
      providerOrderId: data._id ?? '',
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingUpdate[]> {
    const response = await fetch(`${BOSTA_API_URL}/deliveries/tracking/${trackingNumber}`, {
      headers: { Authorization: this.apiKey },
    })

    if (!response.ok) throw new Error('Failed to track shipment')

    const data = await response.json() as { TransitEvents?: Array<Record<string, string>> }

    return (data.TransitEvents || []).map((event) => ({
      status: event.state || 'unknown',
      description: event.msg || event.state || '',
      timestamp: event.timestamp || new Date().toISOString(),
    }))
  }

  async cancelShipment(trackingNumber: string): Promise<boolean> {
    const response = await fetch(`${BOSTA_API_URL}/deliveries/${trackingNumber}`, {
      method: 'DELETE',
      headers: { Authorization: this.apiKey },
    })
    return response.ok
  }
}
