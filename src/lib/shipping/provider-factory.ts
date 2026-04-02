import type { ShippingProvider, ShippingProviderClient } from './types'
import { BostaProvider } from './providers/bosta'
import { AramexProvider } from './providers/aramex'
import { JntProvider } from './providers/jnt'
import { MylerzProvider } from './providers/mylerz'

export function createShippingProvider(
  provider: ShippingProvider,
  credentials: { apiKey: string; apiSecret?: string; accountId?: string; settings?: Record<string, unknown> },
): ShippingProviderClient {
  switch (provider) {
    case 'bosta':
      return new BostaProvider(credentials)
    case 'aramex':
      return new AramexProvider(credentials)
    case 'jnt':
      return new JntProvider(credentials)
    case 'mylerz':
      return new MylerzProvider(credentials)
    default:
      throw new Error(`Unsupported shipping provider: ${provider}`)
  }
}
