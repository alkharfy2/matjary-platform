import type { ShippingProviderClient, CreateShipmentInput, ShipmentResult, TrackingUpdate } from '../types'

const ARAMEX_API_URL = 'https://ws.aramex.net/ShippingAPI.V2'

export class AramexProvider implements ShippingProviderClient {
  private apiKey: string
  private apiSecret: string
  private accountId: string

  constructor(credentials: { apiKey: string; apiSecret?: string; accountId?: string }) {
    this.apiKey = credentials.apiKey
    this.apiSecret = credentials.apiSecret || ''
    this.accountId = credentials.accountId || ''
  }

  async createShipment(input: CreateShipmentInput): Promise<ShipmentResult> {
    const response = await fetch(`${ARAMEX_API_URL}/Shipping/CreateShipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ClientInfo: {
          UserName: this.apiKey,
          Password: this.apiSecret,
          AccountNumber: this.accountId,
          Version: 'v2',
        },
        Shipments: [
          {
            Shipper: {},
            Consignee: {
              Reference1: input.orderNumber,
              PartyAddress: {
                Line1: input.address.street,
                City: input.address.city,
                StateOrProvinceCode: input.address.governorate,
                CountryCode: 'EG',
              },
              Contact: {
                PersonName: input.customerName,
                PhoneNumber1: input.customerPhone,
              },
            },
            Details: {
              NumberOfPieces: input.pieces,
              ActualWeight: { Value: input.weight, Unit: 'KG' },
              CashOnDeliveryAmount: { Value: input.codAmount, CurrencyCode: 'EGP' },
              DescriptionOfGoods: input.description,
            },
          },
        ],
      }),
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({}))
      throw new Error(`Aramex API error: ${JSON.stringify(error)}`)
    }

    const data = await response.json() as { Shipments?: Array<{ ID: string; ShipmentLabel?: { LabelURL: string } }> }
    const shipment = data.Shipments?.[0]

    return {
      trackingNumber: shipment?.ID || '',
      waybillUrl: shipment?.ShipmentLabel?.LabelURL,
      providerOrderId: shipment?.ID || '',
    }
  }

  async trackShipment(trackingNumber: string): Promise<TrackingUpdate[]> {
    const response = await fetch(`${ARAMEX_API_URL}/Tracking/TrackShipments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ClientInfo: {
          UserName: this.apiKey,
          Password: this.apiSecret,
          AccountNumber: this.accountId,
          Version: 'v2',
        },
        Shipments: [trackingNumber],
      }),
    })

    if (!response.ok) throw new Error('Failed to track Aramex shipment')

    const data = await response.json() as { TrackingResults?: Array<{ Value?: Array<{ UpdateDescription: string; UpdateDateTime: string; UpdateLocation: string }> }> }
    const events = data.TrackingResults?.[0]?.Value || []

    return events.map((event) => ({
      status: event.UpdateDescription,
      description: event.UpdateDescription,
      timestamp: event.UpdateDateTime,
      location: event.UpdateLocation,
    }))
  }

  async cancelShipment(_trackingNumber: string): Promise<boolean> {
    // Aramex doesn't provide a simple cancel API — contact support
    throw new Error('Aramex shipment cancellation requires contacting support')
  }
}
