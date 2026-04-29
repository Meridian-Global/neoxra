import { API_BASE_URL } from './api'
import { getSessionToken } from './auth'

function authHeaders(): Record<string, string> {
  const token = getSessionToken()
  if (!token) return {}
  return { 'X-Neoxra-Session-Token': token }
}

export interface DashboardStats {
  total_users: number
  new_users_this_week: number
  active_today: number
  generations_this_month: number
  generations_today: number
  total_organizations: number
  plan_distribution: Record<string, number>
  generations_by_platform: Record<string, number>
}

export interface AdminUser {
  id: string
  email: string
  full_name: string | null
  is_active: boolean
  is_admin: boolean
  created_at: string
  last_login_at: string | null
}

export interface PaginatedUsers {
  users: AdminUser[]
  total: number
  page: number
  per_page: number
}

export interface AdminOrganization {
  id: string
  name: string
  tenant_key: string
  org_type: string
  member_count: number
  plan_name: string | null
  generations_this_month: number
  status: string
  created_at: string
}

export interface PaginatedOrganizations {
  organizations: AdminOrganization[]
  total: number
  page: number
  per_page: number
}

export interface AdminPlan {
  id: string
  slug: string
  name: string
  generations_per_month: number
  price_cents: number
  active_subscribers: number
  is_active: boolean
}

export interface AdminSubscription {
  id: string
  organization_id: string
  organization_name: string
  plan_slug: string
  plan_name: string
  status: string
  current_period_start: string
  current_period_end: string
}

export interface PaginatedSubscriptions {
  subscriptions: AdminSubscription[]
  total: number
  page: number
  per_page: number
}

export interface UserDetailOrganization {
  id: string
  name: string
  tenant_key: string
  org_type: string
}

export interface UserDetailSubscription {
  plan_name: string
  plan_slug: string
  period_start: string
  period_end: string
  generations_used: number
  generations_limit: number
}

export interface UserSession {
  id: string
  auth_method: string
  status: string
  last_seen_at: string
  created_at: string
}

export interface UserGeneration {
  id: string
  route: string
  status: string
  duration_ms: number | null
  created_at: string
}

export interface UserDetailResponse {
  user: AdminUser
  organization: UserDetailOrganization | null
  subscription: UserDetailSubscription | null
  sessions: UserSession[]
  recent_generations: UserGeneration[]
}

export async function fetchUserDetailFull(userId: string): Promise<UserDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}?detail=full`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch user detail')
  return response.json()
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const response = await fetch(`${API_BASE_URL}/api/admin/dashboard/stats`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch dashboard stats')
  return response.json()
}

export async function fetchUsers(params: {
  page?: number
  per_page?: number
  search?: string
  sort?: string
  order?: string
} = {}): Promise<PaginatedUsers> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))
  if (params.search) query.set('search', params.search)
  if (params.sort) query.set('sort', params.sort)
  if (params.order) query.set('order', params.order)
  const qs = query.toString()
  const response = await fetch(`${API_BASE_URL}/api/admin/users${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch users')
  return response.json()
}

export async function fetchUserDetail(userId: string): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch user detail')
  return response.json()
}

export async function updateUser(userId: string, data: { is_active?: boolean; is_admin?: boolean }): Promise<AdminUser> {
  const response = await fetch(`${API_BASE_URL}/api/admin/users/${userId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update user')
  return response.json()
}

export async function fetchOrganizations(params: {
  page?: number
  per_page?: number
} = {}): Promise<PaginatedOrganizations> {
  const query = new URLSearchParams()
  if (params.page) query.set('page', String(params.page))
  if (params.per_page) query.set('per_page', String(params.per_page))
  const qs = query.toString()
  const response = await fetch(`${API_BASE_URL}/api/admin/organizations${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch organizations')
  return response.json()
}

export interface OrgDetailMember {
  id: string
  email: string
  full_name: string | null
  role: string
}

export interface OrgDetailResponse {
  organization: AdminOrganization
  members: OrgDetailMember[]
  subscription: {
    plan_name: string
    plan_slug: string
    status: string
    period_start: string
    period_end: string
    generations_used: number
    generations_limit: number
  } | null
}

export async function fetchOrganizationDetail(orgId: string): Promise<OrgDetailResponse> {
  const response = await fetch(`${API_BASE_URL}/api/admin/organizations/${orgId}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch organization detail')
  return response.json()
}

export async function fetchPlans(): Promise<AdminPlan[]> {
  const response = await fetch(`${API_BASE_URL}/api/admin/plans`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch plans')
  return response.json()
}

export async function assignPlan(organizationId: string, planSlug: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/admin/subscriptions/assign`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ organization_id: organizationId, plan_slug: planSlug }),
  })
  if (!response.ok) throw new Error('Failed to assign plan')
}

export async function fetchSubscriptions(params: {
  status?: string
  plan?: string
  page?: number
} = {}): Promise<PaginatedSubscriptions> {
  const query = new URLSearchParams()
  if (params.status) query.set('status', params.status)
  if (params.plan) query.set('plan', params.plan)
  if (params.page) query.set('page', String(params.page))
  const qs = query.toString()
  const response = await fetch(`${API_BASE_URL}/api/admin/subscriptions${qs ? `?${qs}` : ''}`, {
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error('Failed to fetch subscriptions')
  return response.json()
}
