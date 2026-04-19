export type DemoEnvironmentMode = 'local' | 'public-demo' | 'internal-demo' | 'production'
export type DemoSurfaceId = 'landing' | 'instagram' | 'legal'
export type DemoAccessMode = 'public' | 'gated'
export type DemoProfile = 'public' | 'client'

export interface DemoSurfaceConfig {
  id: DemoSurfaceId
  apiSurface: DemoSurfaceId
  accessMode: DemoAccessMode
  demoProfile: DemoProfile
  allowSampleFallback: boolean
}

const VALID_ENV_MODES = new Set<DemoEnvironmentMode>([
  'local',
  'public-demo',
  'internal-demo',
  'production',
])

function getRuntimeMode(): DemoEnvironmentMode {
  const raw = process.env.NEXT_PUBLIC_NEOXRA_ENV_MODE?.trim() as DemoEnvironmentMode | undefined
  return raw && VALID_ENV_MODES.has(raw) ? raw : 'production'
}

function defaultAccessMode(surface: DemoSurfaceId, mode: DemoEnvironmentMode): DemoAccessMode {
  const defaults: Record<DemoEnvironmentMode, Record<DemoSurfaceId, DemoAccessMode>> = {
    local: {
      landing: 'public',
      instagram: 'public',
      legal: 'public',
    },
    'public-demo': {
      landing: 'public',
      instagram: 'public',
      legal: 'gated',
    },
    'internal-demo': {
      landing: 'public',
      instagram: 'public',
      legal: 'public',
    },
    production: {
      landing: 'public',
      instagram: 'public',
      legal: 'gated',
    },
  }

  return defaults[mode][surface]
}

function getSurfaceAccessMode(surface: DemoSurfaceId, mode: DemoEnvironmentMode): DemoAccessMode {
  const raw = (
    surface === 'landing'
      ? process.env.NEXT_PUBLIC_LANDING_DEMO_ACCESS_MODE
      : surface === 'instagram'
        ? process.env.NEXT_PUBLIC_INSTAGRAM_DEMO_ACCESS_MODE
        : process.env.NEXT_PUBLIC_LEGAL_DEMO_ACCESS_MODE
  )?.trim()
  if (raw === 'public' || raw === 'gated') {
    return raw
  }
  return defaultAccessMode(surface, mode)
}

export function getDemoEnvironmentMode(): DemoEnvironmentMode {
  return getRuntimeMode()
}

export function getDemoSurfaceConfig(surface: DemoSurfaceId): DemoSurfaceConfig {
  const mode = getRuntimeMode()
  const accessMode = getSurfaceAccessMode(surface, mode)
  const demoProfile: DemoProfile = surface === 'legal' ? 'client' : 'public'

  return {
    id: surface,
    apiSurface: surface,
    accessMode,
    demoProfile,
    allowSampleFallback: surface !== 'landing',
  }
}
