import { API_BASE_URL } from './api'
import type { DemoClientConfig, DemoSurfaceId } from './demo-config'

export async function fetchDemoClientConfig(surface: DemoSurfaceId, demoKey: string): Promise<DemoClientConfig> {
  const url = new URL(`${API_BASE_URL}/api/demo/config`)
  url.searchParams.set('surface', surface)
  url.searchParams.set('demo_key', demoKey)

  const response = await fetch(url.toString(), {
    method: 'GET',
    cache: 'no-store',
  })

  if (!response.ok) {
    throw new Error('Could not load demo configuration.')
  }

  return (await response.json()) as DemoClientConfig
}
