export type DemoEnvironmentMode = 'local' | 'public-demo' | 'internal-demo' | 'production'
export type DemoSurfaceId = 'landing' | 'instagram' | 'threads' | 'facebook' | 'legal'
export type DemoAccessMode = 'public' | 'gated'
export type DemoProfile = 'public' | 'client'

export interface DemoDeterministicFallbackConfig {
  enabled: boolean
  mode: 'disabled' | 'manual' | 'auto'
  fallback_key: string | null
  label: string
}

export interface DemoSurfaceConfig {
  id: DemoSurfaceId
  apiSurface: DemoSurfaceId
  accessMode: DemoAccessMode
  demoProfile: DemoProfile
  allowSampleFallback: boolean
  demoKey: string
}

export interface DemoClientConfig {
  demo_key: string
  surface: DemoSurfaceId
  display_name: string
  profile: string
  preset_profile: string
  deterministic_fallback: DemoDeterministicFallbackConfig
  environment: DemoEnvironmentMode
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
      threads: 'public',
      facebook: 'public',
      legal: 'public',
    },
    'public-demo': {
      landing: 'public',
      instagram: 'public',
      threads: 'public',
      facebook: 'public',
      legal: 'gated',
    },
    'internal-demo': {
      landing: 'public',
      instagram: 'public',
      threads: 'public',
      facebook: 'public',
      legal: 'public',
    },
    production: {
      landing: 'public',
      instagram: 'public',
      threads: 'public',
      facebook: 'public',
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
        : surface === 'threads'
          ? process.env.NEXT_PUBLIC_THREADS_DEMO_ACCESS_MODE
          : surface === 'facebook'
            ? process.env.NEXT_PUBLIC_FACEBOOK_DEMO_ACCESS_MODE
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

function getConfiguredDemoKey(surface: DemoSurfaceId): string {
  const raw = (
    surface === 'landing'
      ? process.env.NEXT_PUBLIC_LANDING_DEMO_KEY
      : surface === 'instagram'
        ? process.env.NEXT_PUBLIC_INSTAGRAM_DEMO_KEY
        : surface === 'threads'
          ? process.env.NEXT_PUBLIC_THREADS_DEMO_KEY
          : surface === 'facebook'
            ? process.env.NEXT_PUBLIC_FACEBOOK_DEMO_KEY
            : process.env.NEXT_PUBLIC_LEGAL_DEMO_KEY
  )?.trim()

  if (raw) return raw

  if (surface === 'landing') return 'landing-public'
  if (surface === 'instagram') return 'instagram-public'
  if (surface === 'threads') return 'threads-public'
  if (surface === 'facebook') return 'facebook-public'
  return 'legal-client'
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
    demoKey: getConfiguredDemoKey(surface),
  }
}
