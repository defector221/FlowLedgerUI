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
  InventoryStockPosition,
  StockAdjustmentRequest,
  StockTransferRequest,
  AuditLogResponse,
  InAppNotificationResponse,
  PaymentReminderRuleRequest,
  PaymentReminderRuleResponse,
  InvoiceTemplateResponse,
  CreateInvoiceTemplateRequest,
  InvoiceTemplateConfig,
  GlobalSearchResponse,
} from '@/types/api'

export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }).then((r) => unwrapApi<LoginResponse>(r)),
  register: (payload: {
    organizationName: string
    email: string
    password: string
    firstName: string
    lastName?: string
    phone?: string
  }) => api.post('/auth/register', payload).then((r) => unwrapApi<LoginResponse>(r)),
  logout: (refreshToken: string) => api.post('/auth/logout', { refreshToken }),
  forgotPassword: (email: string) => api.post('/auth/forgot-password', { email }),
  resetPassword: (token: string, newPassword: string) => api.post('/auth/reset-password', { token, newPassword }),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
  previewInvitation: (token: string) =>
    api.get('/auth/invitation', { params: { token } }).then((r) => unwrapApi<InvitationPreviewResponse>(r)),
  acceptInvitation: (payload: AcceptInvitationRequest) => api.post('/auth/accept-invitation', payload),
  switchOrganization: (organizationId: string) =>
    api.post('/auth/switch-organization', { organizationId }).then((r) => unwrapApi<LoginResponse>(r)),
  createOrganization: (organizationName: string) =>
    api.post('/auth/create-organization', { organizationName }).then((r) => unwrapApi<LoginResponse>(r)),
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
  invite: (payload: InviteUserRequest) =>
    api.post('/users/invite', payload).then((r) => unwrapApi<UserListResponse>(r)),
  changeRole: (id: string, role: string) =>
    api.put(`/users/${id}/role`, { role }).then((r) => unwrapApi<UserListResponse>(r)),
  deactivate: (id: string) => api.post(`/users/${id}/deactivate`).then((r) => unwrapApi<UserListResponse>(r)),
  resendInvitation: (id: string) =>
    api.post(`/users/${id}/resend-invitation`).then((r) => unwrapApi<UserListResponse>(r)),
}

export const roleApi = {
  list: () => api.get('/roles').then((r) => unwrapList<RoleResponse>(r)),
}

export const warehouseApi = {
  list: () => api.get('/warehouses').then((r) => unwrapList<WarehouseResponse>(r)),
  get: (id: string) => api.get(`/warehouses/${id}`).then((r) => unwrapApi<WarehouseResponse>(r)),
  create: (payload: CreateWarehouseRequest) =>
    api.post('/warehouses', payload).then((r) => unwrapApi<WarehouseResponse>(r)),
  update: (id: string, payload: UpdateWarehouseRequest) =>
    api.put(`/warehouses/${id}`, payload).then((r) => unwrapApi<WarehouseResponse>(r)),
}

export const customerApi = {
  list: (params?: { search?: string; archived?: boolean; size?: number }) =>
    api.get('/customers', { params }).then((r) => unwrapPage<CustomerResponse>(r)),
  get: (id: string) => api.get(`/customers/${id}`).then((r) => unwrapApi<CustomerResponse>(r)),
  create: (payload: CreateCustomerRequest) =>
    api.post('/customers', payload).then((r) => unwrapApi<CustomerResponse>(r)),
  update: (id: string, payload: UpdateCustomerRequest) =>
    api.put(`/customers/${id}`, payload).then((r) => unwrapApi<CustomerResponse>(r)),
}

export const supplierApi = {
  list: (params?: { search?: string; archived?: boolean; size?: number }) =>
    api.get('/suppliers', { params }).then((r) => unwrapPage<SupplierResponse>(r)),
  get: (id: string) => api.get(`/suppliers/${id}`).then((r) => unwrapApi<SupplierResponse>(r)),
  create: (payload: CreateSupplierRequest) =>
    api.post('/suppliers', payload).then((r) => unwrapApi<SupplierResponse>(r)),
  update: (id: string, payload: UpdateSupplierRequest) =>
    api.put(`/suppliers/${id}`, payload).then((r) => unwrapApi<SupplierResponse>(r)),
}

export const productApi = {
  list: (params?: { search?: string; active?: boolean; size?: number }) =>
    api.get('/products', { params }).then((r) => unwrapPage<ProductResponse>(r)),
  get: (id: string) => api.get(`/products/${id}`).then((r) => unwrapApi<ProductResponse>(r)),
  create: (payload: CreateProductRequest) => api.post('/products', payload).then((r) => unwrapApi<ProductResponse>(r)),
  update: (id: string, payload: UpdateProductRequest) =>
    api.put(`/products/${id}`, payload).then((r) => unwrapApi<ProductResponse>(r)),
}

export const categoryApi = {
  list: () => api.get('/categories').then((r) => unwrapList<CategoryResponse>(r)),
  get: (id: string) => api.get(`/categories/${id}`).then((r) => unwrapApi<CategoryResponse>(r)),
  create: (payload: CreateCategoryRequest) =>
    api.post('/categories', payload).then((r) => unwrapApi<CategoryResponse>(r)),
  update: (id: string, payload: UpdateCategoryRequest) =>
    api.put(`/categories/${id}`, payload).then((r) => unwrapApi<CategoryResponse>(r)),
}

export const salesApi = {
  listInvoices: (params?: { status?: string; customerId?: string }) =>
    api.get('/sales/invoices', { params }).then((r) => unwrapList<SalesInvoiceResponse>(r)),
  getInvoice: (id: string) => api.get(`/sales/invoices/${id}`).then((r) => unwrapApi<SalesInvoiceResponse>(r)),
  createInvoice: (payload: CreateSalesInvoiceRequest) =>
    api.post('/sales/invoices', payload).then((r) => unwrapApi<SalesInvoiceResponse>(r)),
  updateInvoice: (id: string, payload: CreateSalesInvoiceRequest) =>
    api.put(`/sales/invoices/${id}`, payload).then((r) => unwrapApi<SalesInvoiceResponse>(r)),
  confirmInvoice: (id: string) =>
    api.post(`/sales/invoices/${id}/confirm`).then((r) => unwrapApi<SalesInvoiceResponse>(r)),
  cancelInvoice: (id: string) =>
    api.post(`/sales/invoices/${id}/cancel`).then((r) => unwrapApi<SalesInvoiceResponse>(r)),
  downloadInvoicePdf: async (id: string) => {
    try {
      const response = await api.get(`/sales/invoices/${id}/pdf`, { responseType: 'blob' })
      return response.data as Blob
    } catch {
      const response = await api.get(`/invoices/${id}/pdf`, { responseType: 'blob' })
      return response.data as Blob
    }
  },

  listQuotations: () => api.get('/sales/quotations').then((r) => unwrapList<Record<string, unknown>>(r)),
  getQuotation: (id: string) => api.get(`/sales/quotations/${id}`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  createQuotation: (payload: Record<string, unknown>) =>
    api.post('/sales/quotations', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  updateQuotation: (id: string, payload: Record<string, unknown>) =>
    api.put(`/sales/quotations/${id}`, payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  cancelQuotation: (id: string) =>
    api.post(`/sales/quotations/${id}/cancel`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  convertQuotationToOrder: (id: string) =>
    api.post(`/sales/quotations/${id}/convert-to-order`).then((r) => unwrapApi<Record<string, unknown>>(r)),

  listOrders: () => api.get('/sales/orders').then((r) => unwrapList<Record<string, unknown>>(r)),
  getOrder: (id: string) => api.get(`/sales/orders/${id}`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  createOrder: (payload: Record<string, unknown>) =>
    api.post('/sales/orders', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  cancelOrder: (id: string) =>
    api.post(`/sales/orders/${id}/cancel`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  convertOrderToChallan: (id: string, body: { warehouseId: string }) =>
    api
      .post(`/sales/orders/${id}/convert-to-challan`, body)
      .then((r) => unwrapApi<Record<string, unknown>>(r)),
  convertOrderToInvoice: (id: string, body: { warehouseId?: string }) =>
    api
      .post(`/sales/orders/${id}/convert-to-invoice`, body)
      .then((r) => unwrapApi<Record<string, unknown>>(r)),

  listChallans: () => api.get('/sales/challans').then((r) => unwrapList<Record<string, unknown>>(r)),
  getChallan: (id: string) => api.get(`/sales/challans/${id}`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  createChallan: (payload: Record<string, unknown>) =>
    api.post('/sales/challans', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  convertChallanToInvoice: (id: string) =>
    api.post(`/sales/challans/${id}/convert-to-invoice`).then((r) => unwrapApi<Record<string, unknown>>(r)),

  listReturns: () => api.get('/sales/returns').then((r) => unwrapList<Record<string, unknown>>(r)),
  createReturn: (payload: Record<string, unknown>) =>
    api.post('/sales/returns', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  confirmReturn: (id: string) =>
    api.post(`/sales/returns/${id}/confirm`).then((r) => unwrapApi<Record<string, unknown>>(r)),

  listCreditNotes: () => api.get('/sales/credit-notes').then((r) => unwrapList<Record<string, unknown>>(r)),
  createCreditNote: (payload: Record<string, unknown>) =>
    api.post('/sales/credit-notes', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
}

export const purchaseApi = {
  listOrders: () => api.get('/purchases/orders').then((r) => unwrapList<Record<string, unknown>>(r)),
  getOrder: (id: string) => api.get(`/purchases/orders/${id}`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  createOrder: (payload: Record<string, unknown>) =>
    api.post('/purchases/orders', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  confirmOrder: (id: string) =>
    api.post(`/purchases/orders/${id}/confirm`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  cancelOrder: (id: string) =>
    api.post(`/purchases/orders/${id}/cancel`).then((r) => unwrapApi<Record<string, unknown>>(r)),

  listGrn: () => api.get('/purchases/grn').then((r) => unwrapList<Record<string, unknown>>(r)),
  createGrnFromOrder: (poId: string, body: Record<string, unknown>) =>
    api.post(`/purchases/grn/from-order/${poId}`, body).then((r) => unwrapApi<Record<string, unknown>>(r)),
  confirmGrn: (id: string) =>
    api.post(`/purchases/grn/${id}/confirm`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  cancelGrn: (id: string) => api.post(`/purchases/grn/${id}/cancel`).then((r) => unwrapApi<Record<string, unknown>>(r)),

  listInvoices: () => api.get('/purchases/invoices').then((r) => unwrapList<Record<string, unknown>>(r)),
  getInvoice: (id: string) => api.get(`/purchases/invoices/${id}`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  createInvoiceFromOrder: (poId: string, body: Record<string, unknown>) =>
    api.post(`/purchases/invoices/from-order/${poId}`, body).then((r) => unwrapApi<Record<string, unknown>>(r)),
  createInvoiceFromGrn: (grnId: string, body: Record<string, unknown>) =>
    api.post(`/purchases/invoices/from-grn/${grnId}`, body).then((r) => unwrapApi<Record<string, unknown>>(r)),
  confirmInvoice: (id: string) =>
    api.post(`/purchases/invoices/${id}/confirm`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  cancelInvoice: (id: string) =>
    api.post(`/purchases/invoices/${id}/cancel`).then((r) => unwrapApi<Record<string, unknown>>(r)),

  listReturns: () => api.get('/purchases/returns').then((r) => unwrapList<Record<string, unknown>>(r)),
  createReturn: (payload: Record<string, unknown>) =>
    api.post('/purchases/returns', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  confirmReturn: (id: string) =>
    api.post(`/purchases/returns/${id}/confirm`).then((r) => unwrapApi<Record<string, unknown>>(r)),
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
  create: (payload: Record<string, unknown>) =>
    api.post('/payments', payload).then((r) => unwrapApi<PaymentResponse>(r)),
  get: (id: string) => api.get(`/payments/${id}`).then((r) => unwrapApi<PaymentResponse>(r)),
  allocate: (id: string, allocations: { documentType: string; documentId: string; amount: number }[]) =>
    api.post(`/payments/${id}/allocations`, allocations).then((r) => unwrapApi<PaymentResponse>(r)),
  cancel: (id: string) => api.post(`/payments/${id}/cancel`).then((r) => unwrapApi<PaymentResponse>(r)),
  sendReminder: (invoiceId: string, channels?: string[]) =>
    api
      .post(`/payment-reminders/invoices/${invoiceId}/send`, channels ? { channels } : {})
      .then((r) => unwrapApi<{ reminderId: string; sent: boolean; message: string }>(r)),
  listReminderRules: () =>
    api.get('/payment-reminders/rules').then((r) => unwrapList<PaymentReminderRuleResponse>(r)),
  createReminderRule: (payload: PaymentReminderRuleRequest) =>
    api.post('/payment-reminders/rules', payload).then((r) => unwrapApi<PaymentReminderRuleResponse>(r)),
  updateReminderRule: (id: string, payload: PaymentReminderRuleRequest) =>
    api.put(`/payment-reminders/rules/${id}`, payload).then((r) => unwrapApi<PaymentReminderRuleResponse>(r)),
  deleteReminderRule: (id: string) => api.delete(`/payment-reminders/rules/${id}`),
}

export const notificationApi = {
  list: (params?: { page?: number; size?: number }) =>
    api.get('/notifications', { params }).then((r) => unwrapPage<InAppNotificationResponse>(r)),
  unreadCount: () => api.get('/notifications/unread-count').then((r) => unwrapApi<{ count: number }>(r)),
  markRead: (id: string) =>
    api.post(`/notifications/${id}/read`).then((r) => unwrapApi<InAppNotificationResponse>(r)),
  markAllRead: () => api.post('/notifications/read-all').then((r) => unwrapApi<{ count: number }>(r)),
}

export const inventoryApi = {
  lowStockAlerts: () => api.get('/inventory/alerts/low-stock').then((r) => unwrapList<InventoryAlertResponse>(r)),
  reorderAlerts: () => api.get('/inventory/alerts/reorder').then((r) => unwrapList<InventoryAlertResponse>(r)),
  overview: () => api.get('/inventory/overview').then((r) => unwrapList<InventoryStockPosition>(r)),
  adjust: (payload: StockAdjustmentRequest) => api.post('/inventory/adjustments', payload),
  transfer: (payload: StockTransferRequest) => api.post('/inventory/transfers', payload),
  openingStock: (payload: StockAdjustmentRequest) =>
    api.post('/inventory/opening-stock', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  ledger: (productId: string, params?: { warehouseId?: string; from?: string; to?: string }) =>
    api.get(`/inventory/ledger/${productId}`, { params }).then((r) => unwrapList<Record<string, unknown>>(r)),
  stock: (productId: string, warehouseId?: string) =>
    api
      .get(`/inventory/stock/${productId}`, { params: warehouseId ? { warehouseId } : undefined })
      .then((r) => unwrapApi<Record<string, unknown>>(r)),
}

export const leadApi = {
  list: (params?: { status?: string; page?: number; size?: number }) =>
    api.get('/leads', { params }).then((r) => unwrapPage<Record<string, unknown>>(r)),
  get: (id: string) => api.get(`/leads/${id}`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  create: (payload: Record<string, unknown>) =>
    api.post('/leads', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  update: (id: string, payload: Record<string, unknown>) =>
    api.put(`/leads/${id}`, payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  delete: (id: string) => api.delete(`/leads/${id}`),
  addFollowUp: (id: string, payload: { followUpAt: string; notes?: string }) =>
    api.post(`/leads/${id}/follow-ups`, payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  listFollowUps: (id: string) => api.get(`/leads/${id}/follow-ups`).then((r) => unwrapList<Record<string, unknown>>(r)),
  completeFollowUp: (id: string, followUpId: string) =>
    api.post(`/leads/${id}/follow-ups/${followUpId}/complete`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  convert: (id: string, payload?: { customerId?: string }) =>
    api.post(`/leads/${id}/convert`, payload ?? {}).then((r) => unwrapApi<Record<string, unknown>>(r)),
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
  list: (params?: { documentType?: string }) =>
    api.get('/templates', { params }).then((r) => unwrapList<InvoiceTemplateResponse>(r)),
  create: (payload: CreateInvoiceTemplateRequest) =>
    api.post('/templates', payload).then((r) => unwrapApi<InvoiceTemplateResponse>(r)),
  update: (id: string, payload: CreateInvoiceTemplateRequest) =>
    api.put(`/templates/${id}`, payload).then((r) => unwrapApi<InvoiceTemplateResponse>(r)),
  setDefault: (id: string) => api.post(`/templates/${id}/default`).then((r) => unwrapApi<InvoiceTemplateResponse>(r)),
  delete: (id: string) => api.delete(`/templates/${id}`),
  presets: () =>
    api
      .get('/templates/presets')
      .then((r) => unwrapList<{ key: string; name: string; documentType?: string; config: InvoiceTemplateConfig }>(r)),
  preview: async (payload: {
    configJson?: InvoiceTemplateConfig
    documentType?: string
    sampleInvoiceId?: string
    editorMode?: string
    html?: string
    designJson?: Record<string, unknown>
  }) => {
    const response = await api.post('/templates/preview', payload, { responseType: 'blob' })
    return response.data as Blob
  },
  downloadDocumentPdf: async (type: string, id: string) => {
    const response = await api.get(`/documents/${type}/${id}/pdf`, { responseType: 'blob' })
    return response.data as Blob
  },
}

export const auditApi = {
  list: (params?: { page?: number; size?: number }) =>
    api.get('/audit-logs', { params }).then((r) => unwrapPage<AuditLogResponse>(r)),
  get: (id: string) => api.get(`/audit-logs/${id}`).then((r) => unwrapApi<AuditLogResponse>(r)),
}

export const unitApi = {
  list: () => api.get('/units').then((r) => unwrapList<{ id: string; code: string; name: string }>(r)),
  create: (payload: { code: string; name: string }) =>
    api.post('/units', payload).then((r) => unwrapApi<{ id: string; code: string; name: string }>(r)),
}

export type TaxType = 'GST' | 'IGST' | 'OTHER'
export type SplitStrategy = 'PLACE_OF_SUPPLY' | 'NO_SPLIT_IGST' | 'NO_SPLIT_OTHER' | 'CUSTOM_PERCENT'

export type TaxRate = {
  id: string
  name: string
  taxType: TaxType
  splitStrategy?: SplitStrategy
  cgstSharePercent?: number
  sgstSharePercent?: number
  rate: number
  cgstRate?: number
  sgstRate?: number
  igstRate?: number
  active: boolean
}

export const taxRateApi = {
  list: () => api.get('/tax-rates').then((r) => unwrapList<TaxRate>(r)),
  create: (payload: {
    name: string
    rate: number
    taxType: TaxType
    splitStrategy?: SplitStrategy
    cgstSharePercent?: number
    sgstSharePercent?: number
    cessRate?: number
  }) => api.post('/tax-rates', payload).then((r) => unwrapApi<TaxRate>(r)),
}

export type MarketingStep = {
  id?: string
  stepOrder?: number
  delayDays: number
  channel: string
  subjectTemplate?: string | null
  bodyTemplate?: string
  subject?: string
  body?: string
  emailTemplateId?: string | null
}

export type MarketingSequence = {
  id: string
  name: string
  description?: string | null
  status: string
  triggerType: string
  steps: MarketingStep[]
  createdAt?: string
  updatedAt?: string
}

export type EmailTemplate = {
  id: string
  name: string
  subject: string
  designJson?: Record<string, unknown> | null
  html?: string | null
  createdAt?: string
  updatedAt?: string
}

export type MarketingCampaign = {
  id: string
  name: string
  status: string
  audienceType: string
  filterJson?: Record<string, unknown> | null
  emailTemplateId: string
  scheduledAt?: string | null
  startedAt?: string | null
  completedAt?: string | null
  totalCount: number
  sentCount: number
  failedCount: number
  skippedCount: number
  createdAt?: string
  updatedAt?: string
}

export type MarketingCampaignRecipient = {
  id: string
  recipientType: string
  recipientId: string
  email?: string | null
  status: string
  errorMessage?: string | null
  sentAt?: string | null
}

export type BillingCurrent = {
  plan: {
    id: string
    code: string
    name: string
    description?: string | null
    maxOrganizations: number
    maxUsersPerOrg: number
    maxInvoicesPerMonth: number
    priceMonthly: number
  }
  subscriptionStatus: string
  usage: {
    organizationCount: number
    organizationLimit: number
    userCount: number
    userLimit: number
  }
}

export const marketingApi = {
  listSequences: () => api.get('/marketing/sequences').then((r) => unwrapList<MarketingSequence>(r)),
  getSequence: (id: string) => api.get(`/marketing/sequences/${id}`).then((r) => unwrapApi<MarketingSequence>(r)),
  createSequence: (payload: {
    name: string
    description?: string
    status?: string
    triggerType: string
    steps: {
      delayDays: number
      channel: string
      subject?: string
      body?: string
      emailTemplateId?: string
    }[]
  }) => api.post('/marketing/sequences', payload).then((r) => unwrapApi<MarketingSequence>(r)),
  enrollLead: (sequenceId: string, leadId: string) =>
    api.post(`/marketing/sequences/${sequenceId}/enroll/${leadId}`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  cancelEnrollment: (id: string) =>
    api.post(`/marketing/enrollments/${id}/cancel`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  listCampaigns: () => api.get('/marketing/campaigns').then((r) => unwrapList<MarketingCampaign>(r)),
  getCampaign: (id: string) => api.get(`/marketing/campaigns/${id}`).then((r) => unwrapApi<MarketingCampaign>(r)),
  createCampaign: (payload: {
    name: string
    audienceType: string
    emailTemplateId: string
    filterJson?: Record<string, unknown>
    leadIds?: string[]
    customerIds?: string[]
  }) => api.post('/marketing/campaigns', payload).then((r) => unwrapApi<MarketingCampaign>(r)),
  updateCampaign: (
    id: string,
    payload: {
      name: string
      audienceType: string
      emailTemplateId: string
      filterJson?: Record<string, unknown>
      leadIds?: string[]
      customerIds?: string[]
    },
  ) => api.put(`/marketing/campaigns/${id}`, payload).then((r) => unwrapApi<MarketingCampaign>(r)),
  previewAudience: (payload: {
    name: string
    audienceType: string
    emailTemplateId: string
    filterJson?: Record<string, unknown>
  }) =>
    api
      .post('/marketing/campaigns/preview-audience', payload)
      .then((r) => unwrapApi<{ count: number; cappedAt: number }>(r)),
  scheduleCampaign: (id: string, scheduledAt?: string) =>
    api
      .post(`/marketing/campaigns/${id}/schedule`, scheduledAt ? { scheduledAt } : {})
      .then((r) => unwrapApi<MarketingCampaign>(r)),
  cancelCampaign: (id: string) =>
    api.post(`/marketing/campaigns/${id}/cancel`).then((r) => unwrapApi<MarketingCampaign>(r)),
  listRecipients: (id: string) =>
    api.get(`/marketing/campaigns/${id}/recipients`).then((r) => unwrapPage<MarketingCampaignRecipient>(r)),
}

export const emailTemplateApi = {
  list: () => api.get('/email-templates').then((r) => unwrapList<EmailTemplate>(r)),
  get: (id: string) => api.get(`/email-templates/${id}`).then((r) => unwrapApi<EmailTemplate>(r)),
  create: (payload: { name: string; subject?: string; designJson?: Record<string, unknown>; html: string }) =>
    api.post('/email-templates', payload).then((r) => unwrapApi<EmailTemplate>(r)),
  update: (
    id: string,
    payload: {
      name: string
      subject?: string
      designJson?: Record<string, unknown>
      html: string
    },
  ) => api.put(`/email-templates/${id}`, payload).then((r) => unwrapApi<EmailTemplate>(r)),
  delete: (id: string) => api.delete(`/email-templates/${id}`),
  preview: (id: string, mergeTags?: Record<string, string>) =>
    api
      .post(`/email-templates/${id}/preview`, { mergeTags })
      .then((r) => unwrapApi<{ subject: string; html: string }>(r)),
}

export const billingApi = {
  current: () => api.get('/billing/current').then((r) => unwrapApi<BillingCurrent>(r)),
}

export const searchApi = {
  search: (q: string, params?: { types?: string; limit?: number; page?: number }) =>
    api
      .get('/search', { params: { q, types: params?.types, limit: params?.limit, page: params?.page } })
      .then((r) => unwrapApi<GlobalSearchResponse>(r)),
  reindex: () => api.post('/search/reindex').then((r) => unwrapApi<{ indexed: number; failed: number }>(r)),
}

export const accountingApi = {
  dashboard: () =>
    api.get('/accounting/dashboard').then((r) => unwrapApi<import('@/types/api').AccountingDashboardResponse>(r)),
  listAccounts: () => api.get('/accounting/accounts').then((r) => unwrapList<import('@/types/api').AccountResponse>(r)),
  createAccount: (payload: Record<string, unknown>) =>
    api.post('/accounting/accounts', payload).then((r) => unwrapApi<import('@/types/api').AccountResponse>(r)),
  listJournals: (params?: Record<string, string | number | undefined>) =>
    api.get('/accounting/journals', { params }).then((r) => unwrapPage<import('@/types/api').JournalResponse>(r)),
  getJournal: (id: string) =>
    api.get(`/accounting/journals/${id}`).then((r) => unwrapApi<import('@/types/api').JournalResponse>(r)),
  createJournal: (payload: import('@/types/api').JournalRequest) =>
    api.post('/accounting/journals', payload).then((r) => unwrapApi<import('@/types/api').JournalResponse>(r)),
  postJournal: (id: string) =>
    api.post(`/accounting/journals/${id}/post`).then((r) => unwrapApi<import('@/types/api').JournalResponse>(r)),
  reverseJournal: (id: string) =>
    api.post(`/accounting/journals/${id}/reverse`).then((r) => unwrapApi<import('@/types/api').JournalResponse>(r)),
  accountLedger: (id: string, params?: Record<string, string>) =>
    api.get(`/accounting/ledgers/accounts/${id}`, { params }).then((r) => unwrapList<import('@/types/api').LedgerLineResponse>(r)),
  customerLedger: (id: string, params?: Record<string, string>) =>
    api.get(`/accounting/ledgers/customers/${id}`, { params }).then((r) => unwrapList<import('@/types/api').LedgerLineResponse>(r)),
  supplierLedger: (id: string, params?: Record<string, string>) =>
    api.get(`/accounting/ledgers/suppliers/${id}`, { params }).then((r) => unwrapList<import('@/types/api').LedgerLineResponse>(r)),
  trialBalance: (params?: Record<string, string>) =>
    api.get('/accounting/reports/trial-balance', { params }).then((r) => unwrapApi<import('@/types/api').TrialBalanceResponse>(r)),
  profitAndLoss: (params?: Record<string, string>) =>
    api.get('/accounting/reports/profit-loss', { params }).then((r) => unwrapApi<import('@/types/api').ProfitAndLossResponse>(r)),
  balanceSheet: (params?: Record<string, string>) =>
    api.get('/accounting/reports/balance-sheet', { params }).then((r) => unwrapApi<import('@/types/api').BalanceSheetResponse>(r)),
  gstSummary: (params?: Record<string, string>) =>
    api.get('/accounting/reports/gst-summary', { params }).then((r) => unwrapApi<import('@/types/api').GstSummaryResponse>(r)),
  integrityCheck: () =>
    api.get('/accounting/reports/integrity-check').then((r) =>
      unwrapApi<{ healthy: boolean; issues: Array<{ code: string; message: string; journalEntryId?: string }> }>(r),
    ),
}
