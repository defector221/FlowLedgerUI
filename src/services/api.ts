import { api } from '@/lib/api-client'
import { unwrapApi, unwrapList, unwrapPage } from '@/lib/api-response'
import type {
  AcceptInvitationRequest,
  CreateCategoryRequest,
  CreateCustomerRequest,
  CreateProductRequest,
  CreateSalesInvoiceRequest,
  CreateSupplierRequest,
  CreateWarehouseRequest,
  CustomerResponse,
  DashboardResponse,
  InvitationPreviewResponse,
  InviteUserRequest,
  LoginResponse,
  OrganizationResponse,
  OrganizationSettingsResponse,
  ProductResponse,
  RoleResponse,
  SalesInvoiceResponse,
  SupplierResponse,
  UpdateCategoryRequest,
  UpdateCustomerRequest,
  UpdateOrganizationRequest,
  UpdateOrganizationSettingsRequest,
  UpdateProductRequest,
  UpdateSupplierRequest,
  UpdateWarehouseRequest,
  UserListResponse,
  WarehouseResponse,
  CategoryResponse,
  PaymentResponse,
  InventoryAlertResponse,
  StockAdjustmentRequest,
  StockTransferRequest,
  AuditLogResponse,
  InvoiceTemplateResponse,
  CreateInvoiceTemplateRequest,
} from '@/types/api'

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => unwrapApi<LoginResponse>(r)),
  register: (payload: { organizationName: string; email: string; password: string; firstName: string; lastName?: string; phone?: string }) =>
    api.post('/auth/register', payload).then((r) => unwrapApi<LoginResponse>(r)),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (organizationId: string, email: string) =>
    api.post('/auth/forgot-password', { organizationId, email }),
  resetPassword: (token: string, newPassword: string) =>
    api.post('/auth/reset-password', { token, newPassword }),
  previewInvitation: (token: string) =>
    api.get('/auth/invitation', { params: { token } }).then((r) => unwrapApi<InvitationPreviewResponse>(r)),
  acceptInvitation: (payload: AcceptInvitationRequest) =>
    api.post('/auth/accept-invitation', payload),
}

export const organizationApi = {
  current: () => api.get('/organizations/current').then((r) => unwrapApi<OrganizationResponse>(r)),
  update: (payload: UpdateOrganizationRequest) =>
    api.put('/organizations/current', payload).then((r) => unwrapApi<OrganizationResponse>(r)),
  uploadLogo: (file: File) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/organizations/current/logo', form).then((r) => unwrapApi<string>(r))
  },
  completeOnboarding: () =>
    api.post('/organizations/current/complete-onboarding').then((r) => unwrapApi<OrganizationResponse>(r)),
  settings: () => api.get('/organizations/current/settings').then((r) => unwrapApi<OrganizationSettingsResponse>(r)),
  updateSettings: (payload: UpdateOrganizationSettingsRequest) =>
    api.put('/organizations/current/settings', payload).then((r) => unwrapApi<OrganizationSettingsResponse>(r)),
}

export const userApi = {
  list: () => api.get('/users').then((r) => unwrapList<UserListResponse>(r)),
  invite: (payload: InviteUserRequest) => api.post('/users/invite', payload).then((r) => unwrapApi<UserListResponse>(r)),
  changeRole: (id: string, role: string) => api.put(`/users/${id}/role`, { role }).then((r) => unwrapApi<UserListResponse>(r)),
  deactivate: (id: string) => api.post(`/users/${id}/deactivate`).then((r) => unwrapApi<UserListResponse>(r)),
  resendInvitation: (id: string) => api.post(`/users/${id}/resend-invitation`).then((r) => unwrapApi<UserListResponse>(r)),
}

export const roleApi = {
  list: () => api.get('/roles').then((r) => unwrapList<RoleResponse>(r)),
}

export const warehouseApi = {
  list: () => api.get('/warehouses').then((r) => unwrapList<WarehouseResponse>(r)),
  get: (id: string) => api.get(`/warehouses/${id}`).then((r) => unwrapApi<WarehouseResponse>(r)),
  create: (payload: CreateWarehouseRequest) => api.post('/warehouses', payload).then((r) => unwrapApi<WarehouseResponse>(r)),
  update: (id: string, payload: UpdateWarehouseRequest) => api.put(`/warehouses/${id}`, payload).then((r) => unwrapApi<WarehouseResponse>(r)),
}

export const customerApi = {
  list: (params?: { search?: string; archived?: boolean; size?: number }) =>
    api.get('/customers', { params }).then((r) => unwrapPage<CustomerResponse>(r)),
  get: (id: string) => api.get(`/customers/${id}`).then((r) => unwrapApi<CustomerResponse>(r)),
  create: (payload: CreateCustomerRequest) => api.post('/customers', payload).then((r) => unwrapApi<CustomerResponse>(r)),
  update: (id: string, payload: UpdateCustomerRequest) => api.put(`/customers/${id}`, payload).then((r) => unwrapApi<CustomerResponse>(r)),
}

export const supplierApi = {
  list: (params?: { search?: string; archived?: boolean; size?: number }) =>
    api.get('/suppliers', { params }).then((r) => unwrapPage<SupplierResponse>(r)),
  get: (id: string) => api.get(`/suppliers/${id}`).then((r) => unwrapApi<SupplierResponse>(r)),
  create: (payload: CreateSupplierRequest) => api.post('/suppliers', payload).then((r) => unwrapApi<SupplierResponse>(r)),
  update: (id: string, payload: UpdateSupplierRequest) => api.put(`/suppliers/${id}`, payload).then((r) => unwrapApi<SupplierResponse>(r)),
}

export const productApi = {
  list: (params?: { search?: string; active?: boolean; size?: number }) =>
    api.get('/products', { params }).then((r) => unwrapPage<ProductResponse>(r)),
  get: (id: string) => api.get(`/products/${id}`).then((r) => unwrapApi<ProductResponse>(r)),
  create: (payload: CreateProductRequest) => api.post('/products', payload).then((r) => unwrapApi<ProductResponse>(r)),
  update: (id: string, payload: UpdateProductRequest) => api.put(`/products/${id}`, payload).then((r) => unwrapApi<ProductResponse>(r)),
}

export const categoryApi = {
  list: () => api.get('/categories').then((r) => unwrapList<CategoryResponse>(r)),
  get: (id: string) => api.get(`/categories/${id}`).then((r) => unwrapApi<CategoryResponse>(r)),
  create: (payload: CreateCategoryRequest) => api.post('/categories', payload).then((r) => unwrapApi<CategoryResponse>(r)),
  update: (id: string, payload: UpdateCategoryRequest) => api.put(`/categories/${id}`, payload).then((r) => unwrapApi<CategoryResponse>(r)),
}

export const salesApi = {
  listInvoices: (params?: { status?: string; customerId?: string }) =>
    api.get('/sales/invoices', { params }).then((r) => unwrapList<SalesInvoiceResponse>(r)),
  getInvoice: (id: string) => api.get(`/sales/invoices/${id}`).then((r) => unwrapApi<SalesInvoiceResponse>(r)),
  createInvoice: (payload: CreateSalesInvoiceRequest) =>
    api.post('/sales/invoices', payload).then((r) => unwrapApi<SalesInvoiceResponse>(r)),
  confirmInvoice: (id: string) => api.post(`/sales/invoices/${id}/confirm`).then((r) => unwrapApi<SalesInvoiceResponse>(r)),
  listQuotations: () => api.get('/sales/quotations').then((r) => unwrapList<Record<string, unknown>>(r)),
}

export const purchaseApi = {
  listOrders: () => api.get('/purchases/orders').then((r) => unwrapList<Record<string, unknown>>(r)),
  listGrn: () => api.get('/purchases/grn').then((r) => unwrapList<Record<string, unknown>>(r)),
  listInvoices: () => api.get('/purchases/invoices').then((r) => unwrapList<Record<string, unknown>>(r)),
}

export const paymentApi = {
  list: () => api.get('/payments').then((r) => unwrapList<PaymentResponse>(r)),
  listReceived: async () => {
    const rows = await paymentApi.list()
    return rows.filter((p) => p.paymentType === 'RECEIPT')
  },
  listSupplier: async () => {
    const rows = await paymentApi.list()
    return rows.filter((p) => p.paymentType === 'PAYMENT')
  },
}

export const inventoryApi = {
  lowStockAlerts: () => api.get('/inventory/alerts/low-stock').then((r) => unwrapList<InventoryAlertResponse>(r)),
  reorderAlerts: () => api.get('/inventory/alerts/reorder').then((r) => unwrapList<InventoryAlertResponse>(r)),
  adjust: (payload: StockAdjustmentRequest) => api.post('/inventory/adjustments', payload),
  transfer: (payload: StockTransferRequest) => api.post('/inventory/transfers', payload),
}

export const dashboardApi = {
  summary: () => api.get('/dashboard').then((r) => unwrapApi<DashboardResponse>(r)),
}

export const reportApi = {
  run: (name: string, params?: Record<string, string>) =>
    api.get(`/reports/${name}`, { params }).then((r) => unwrapList<Record<string, unknown>>(r)),
  export: (name: string, params?: Record<string, string>) =>
    api.get(`/reports/${name}/export`, { params, responseType: 'blob' }),
}

export const templateApi = {
  list: () => api.get('/templates').then((r) => unwrapList<InvoiceTemplateResponse>(r)),
  create: (payload: CreateInvoiceTemplateRequest) => api.post('/templates', payload).then((r) => unwrapApi<InvoiceTemplateResponse>(r)),
  presets: () => api.get('/templates/presets').then((r) => unwrapList<Record<string, unknown>>(r)),
}

export const auditApi = {
  list: (params?: { page?: number; size?: number }) =>
    api.get('/audit-logs', { params }).then((r) => unwrapPage<AuditLogResponse>(r)),
}

export const unitApi = {
  list: () => api.get('/units').then((r) => unwrapList<{ id: string; code: string; name: string }>(r)),
}
