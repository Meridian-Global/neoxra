const DEV_API_BASE_URL = 'http://localhost:8000'
const PROD_API_BASE_URL = 'https://api.neoxra.com'

function normalizeBaseUrl(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed.replace(/\/+$/, '') : null
}

export function getApiBaseUrl(): string {
  const configuredBaseUrl = normalizeBaseUrl(
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_PUBLIC_API_BASE
  )

  if (configuredBaseUrl) {
    return configuredBaseUrl
  }

  return process.env.NODE_ENV === 'development' ? DEV_API_BASE_URL : PROD_API_BASE_URL
}

export const API_BASE_URL = getApiBaseUrl()
