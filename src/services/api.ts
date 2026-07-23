import { api } from '@/lib/api-client'
import { unwrapApi, unwrapList, unwrapPage, unwrapPageResponse } from '@/lib/api-response'
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
  InventoryLedgerRow,
  InventoryStockPosition,
  InventoryStockSnapshot,
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
  CreateSupplierCatalogItemRequest,
  UpdateSupplierCatalogItemRequest,
  SupplierCatalogItemResponse,
  TransportCompany,
  TransportCompanyRequest,
  TransportVehicle,
  TransportVehicleRequest,
  TransportDriver,
  TransportDriverRequest,
  Shipment,
  ShipmentRequest,
  DeliveryChallan,
  RetailStore,
  RetailStoreRequest,
  RetailStoreType,
  RetailCounter,
  RetailTerminal,
  RetailCashier,
  RetailShift,
  OpenRetailShiftRequest,
  CloseRetailShiftRequest,
  PosSale,
  PosSaleRequest,
  PosLineRequest,
  PosCheckoutRequest,
  PosSaleStatus,
  RetailProductLookup,
  RetailBrand,
  RetailVariant,
  RetailBarcode,
  RetailPriceList,
  RetailPriceListRequest,
  RetailResolvePrice,
  RetailPromotion,
  RetailPromotionRequest,
  RetailReturn,
  RetailReturnRequest,
  RetailGiftCard,
  RetailGiftCardBalance,
  RetailGiftCardIssueRequest,
  RetailInventoryLocation,
  RetailDailySales,
  RetailLabelTemplate,
  RetailSyncRequest,
  RetailSyncResponse,
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
  /** Authenticated logo image as an object URL. Caller should revoke when done. */
  fetchLogoObjectUrl: async () => {
    try {
      const response = await api.get<Blob>('/organizations/current/logo', { responseType: 'blob' })
      if (!(response.data instanceof Blob) || response.data.size === 0) return null
      if (response.data.type.includes('application/json')) return null
      return URL.createObjectURL(response.data)
    } catch {
      return null
    }
  },
  completeOnboarding: () =>
    api.post('/organizations/current/complete-onboarding').then((r) => unwrapApi<OrganizationResponse>(r)),
  settings: () => api.get('/organizations/current/settings').then((r) => unwrapApi<OrganizationSettingsResponse>(r)),
  updateSettings: (payload: UpdateOrganizationSettingsRequest) =>
    api.put('/organizations/current/settings', payload).then((r) => unwrapApi<OrganizationSettingsResponse>(r)),
}

export const platformApi = {
  modules: () => api.get('/platform/modules').then((r) => unwrapApi<import('@/platform').ModuleCatalogItem[]>(r)),
  moduleFeatures: (code: string) =>
    api
      .get(`/platform/modules/${code}/features`)
      .then((r) => unwrapApi<import('@/platform').ModuleFeatureCatalogItem[]>(r)),
  allFeatures: () =>
    api.get('/platform/modules/features').then((r) => unwrapApi<import('@/platform').ModuleFeatureCatalogItem[]>(r)),
  editions: () => api.get('/platform/editions').then((r) => unwrapApi<import('@/platform').EditionResponse[]>(r)),
  edition: () =>
    api
      .get('/platform/organization/edition')
      .then((r) => unwrapApi<import('@/platform').OrganizationEditionResponse>(r)),
  updateEdition: (editionCode: string) =>
    api
      .patch('/platform/organization/edition', { editionCode })
      .then((r) => unwrapApi<import('@/platform').OrganizationEditionResponse>(r)),
  organizationModules: () =>
    api
      .get('/platform/organization/modules')
      .then((r) => unwrapApi<import('@/platform').OrganizationModuleResponse[]>(r)),
  updateOrganizationModules: (
    modules: {
      moduleCode: string
      enabled?: boolean
      licensed?: boolean
      trial?: boolean
      expiresAt?: string | null
      configuration?: string
    }[],
  ) =>
    api
      .put('/platform/organization/modules', { modules })
      .then((r) => unwrapApi<import('@/platform').OrganizationModuleResponse[]>(r)),
  organizationFeatures: () =>
    api
      .get('/platform/organization/features')
      .then((r) => unwrapApi<import('@/platform').OrganizationFeatureResponse[]>(r)),
  updateOrganizationFeatures: (
    features: {
      moduleCode: string
      featureCode: string
      enabled?: boolean
      licensed?: boolean
      trial?: boolean
      expiresAt?: string | null
      configuration?: string
    }[],
  ) =>
    api
      .put('/platform/organization/features', { features })
      .then((r) => unwrapApi<import('@/platform').OrganizationFeatureResponse[]>(r)),
  capabilities: () =>
    api.get('/platform/organization/capabilities').then((r) => unwrapApi<import('@/platform').CapabilitiesResponse>(r)),
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

export const supplierCatalogApi = {
  listBySupplier: (supplierId: string) =>
    api.get(`/suppliers/${supplierId}/catalog`).then((r) => unwrapList<SupplierCatalogItemResponse>(r)),
  listActiveBySupplier: (supplierId: string) =>
    api.get(`/suppliers/${supplierId}/catalog/active`).then((r) => unwrapList<SupplierCatalogItemResponse>(r)),
  create: (supplierId: string, payload: CreateSupplierCatalogItemRequest) =>
    api.post(`/suppliers/${supplierId}/catalog`, payload).then((r) => unwrapApi<SupplierCatalogItemResponse>(r)),
  update: (supplierId: string, id: string, payload: UpdateSupplierCatalogItemRequest) =>
    api.put(`/suppliers/${supplierId}/catalog/${id}`, payload).then((r) => unwrapApi<SupplierCatalogItemResponse>(r)),
  remove: (supplierId: string, id: string) => api.delete(`/suppliers/${supplierId}/catalog/${id}`),
  listByProduct: (productId: string) =>
    api.get(`/products/${productId}/suppliers`).then((r) => unwrapList<SupplierCatalogItemResponse>(r)),
  createForProduct: (productId: string, payload: CreateSupplierCatalogItemRequest) =>
    api.post(`/products/${productId}/suppliers`, payload).then((r) => unwrapApi<SupplierCatalogItemResponse>(r)),
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
    api.post(`/sales/orders/${id}/convert-to-challan`, body).then((r) => unwrapApi<Record<string, unknown>>(r)),
  convertOrderToInvoice: (id: string, body: { warehouseId?: string }) =>
    api.post(`/sales/orders/${id}/convert-to-invoice`, body).then((r) => unwrapApi<Record<string, unknown>>(r)),

  listChallans: () => api.get('/sales/challans').then((r) => unwrapList<Record<string, unknown>>(r)),
  getChallan: (id: string) => api.get(`/sales/challans/${id}`).then((r) => unwrapApi<DeliveryChallan>(r)),
  createChallan: (payload: Record<string, unknown>) =>
    api.post('/sales/challans', payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  updateChallan: (id: string, payload: Partial<DeliveryChallan>) =>
    api.put(`/sales/challans/${id}`, payload).then((r) => unwrapApi<DeliveryChallan>(r)),
  updateChallanTransportRequired: (id: string, transportRequired: boolean) =>
    api
      .patch(`/sales/challans/${id}/transport-required`, { transportRequired })
      .then((r) => unwrapApi<DeliveryChallan>(r)),
  cancelChallan: (id: string) => api.post(`/sales/challans/${id}/cancel`).then((r) => unwrapApi<DeliveryChallan>(r)),
  convertChallanToInvoice: (id: string) =>
    api.post(`/sales/challans/${id}/convert-to-invoice`).then((r) => unwrapApi<Record<string, unknown>>(r)),
  getChallanInvoice: (id: string) =>
    api
      .get(`/sales/challans/${id}/invoice`)
      .then((r) => unwrapApi<import('@/types/api').SalesInvoiceResponse>(r))
      .catch((err) => {
        if (err?.response?.status === 404) return null
        throw err
      }),

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
  list: (params?: {
    type?: 'RECEIPT' | 'PAYMENT'
    partyType?: 'CUSTOMER' | 'SUPPLIER'
    status?: string
    customerId?: string
    supplierId?: string
    from?: string
    to?: string
    search?: string
  }) => api.get('/payments', { params }).then((r) => unwrapList<PaymentResponse>(r)),
  listReceived: async (params?: {
    status?: string
    customerId?: string
    from?: string
    to?: string
    search?: string
  }) => paymentApi.list({ type: 'RECEIPT', partyType: 'CUSTOMER', ...params }),
  listSupplier: async (params?: {
    status?: string
    supplierId?: string
    from?: string
    to?: string
    search?: string
  }) => paymentApi.list({ type: 'PAYMENT', partyType: 'SUPPLIER', ...params }),
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
  listReminderRules: () => api.get('/payment-reminders/rules').then((r) => unwrapList<PaymentReminderRuleResponse>(r)),
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
  markRead: (id: string) => api.post(`/notifications/${id}/read`).then((r) => unwrapApi<InAppNotificationResponse>(r)),
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
    api.get(`/inventory/ledger/${productId}`, { params }).then((r) => unwrapList<InventoryLedgerRow>(r)),
  stock: (productId: string, warehouseId?: string) =>
    api
      .get(`/inventory/stock/${productId}`, { params: warehouseId ? { warehouseId } : undefined })
      .then((r) => unwrapApi<InventoryStockSnapshot>(r)),
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
  list: (params?: {
    page?: number
    size?: number
    search?: string
    action?: string
    entityType?: string
    userId?: string
    from?: string
    to?: string
  }) => api.get('/audit-logs', { params }).then((r) => unwrapPageResponse<AuditLogResponse>(r)),
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
    priceYearly?: number
  }
  subscriptionStatus: string
  usage: {
    organizationCount: number
    organizationLimit: number
    userCount: number
    userLimit: number
    invoiceCount?: number
    invoiceLimit?: number
  }
}

export type SubscriptionPlan = {
  id: string
  code: string
  name: string
  description?: string | null
  maxOrganizations: number
  maxUsersPerOrg: number
  maxInvoicesPerMonth: number
  priceMonthly: number
  priceYearly: number
  currency: string
  displayOrder: number
  highlightPlan: boolean
  recommended: boolean
  trialDays: number
}

export type CurrentSubscription = {
  plan: SubscriptionPlan
  status: string
  billingCycle: string
  startDate?: string | null
  endDate?: string | null
  nextBillingDate?: string | null
  autoRenew: boolean
  paymentProvider?: string | null
  paymentReference?: string | null
}

export type CheckoutResponse = {
  activated: boolean
  provider: string
  keyId?: string | null
  orderId?: string | null
  amount: number
  currency: string
  planCode: string
  billingCycle: string
  paymentTransactionId?: string | null
  subscription?: CurrentSubscription | null
  clientSecret?: string | null
  checkoutUrl?: string | null
}

export type SubscriptionInvoice = {
  id: string
  invoiceNumber: string
  amount: number
  gst: number
  discount: number
  total: number
  paidAt?: string | null
  pdfUrl?: string | null
  createdAt: string
}

export type SubscriptionUsage = {
  organizationCount: number
  organizationLimit: number
  userCount: number
  userLimit: number
  invoiceCount: number
  invoiceLimit: number
}

export const billingApi = {
  current: () => api.get('/billing/current').then((r) => unwrapApi<BillingCurrent>(r)),
}

export const subscriptionApi = {
  plans: () => api.get('/subscriptions/plans').then((r) => unwrapList<SubscriptionPlan>(r)),
  current: () => api.get('/subscriptions/current').then((r) => unwrapApi<CurrentSubscription>(r)),
  checkout: (payload: { planCode: string; billingCycle: 'MONTHLY' | 'YEARLY' }) =>
    api.post('/subscriptions/checkout', payload).then((r) => unwrapApi<CheckoutResponse>(r)),
  upgrade: (payload: { planCode: string; billingCycle: 'MONTHLY' | 'YEARLY' }) =>
    api.post('/subscriptions/upgrade', payload).then((r) => unwrapApi<CheckoutResponse>(r)),
  cancel: (immediate = false) =>
    api.post('/subscriptions/cancel', null, { params: { immediate } }).then((r) => unwrapApi<CurrentSubscription>(r)),
  invoices: () => api.get('/subscriptions/invoices').then((r) => unwrapList<SubscriptionInvoice>(r)),
  usage: () => api.get('/subscriptions/usage').then((r) => unwrapApi<SubscriptionUsage>(r)),
  verifyPayment: (payload: {
    razorpayOrderId?: string
    razorpayPaymentId?: string
    razorpaySignature?: string
    orderId?: string
    paymentId?: string
    signature?: string
    provider?: string
  }) => api.post('/subscriptions/verify-payment', payload).then((r) => unwrapApi<CurrentSubscription>(r)),
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

export const searchApi = {
  search: (q: string, params?: { types?: string; limit?: number; page?: number }) =>
    api
      .get('/search', { params: { q, types: params?.types, limit: params?.limit, page: params?.page } })
      .then((r) => unwrapApi<GlobalSearchResponse>(r)),
  reindex: () => api.post('/search/reindex').then((r) => unwrapApi<{ indexed: number; failed: number }>(r)),
}

const transportCrud = <T, P>(path: string) => ({
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get(path, { params }).then((r) => unwrapList<T>(r)),
  get: (id: string) => api.get(`${path}/${id}`).then((r) => unwrapApi<T>(r)),
  create: (payload: P) => api.post(path, payload).then((r) => unwrapApi<T>(r)),
  update: (id: string, payload: Partial<P>) => api.put(`${path}/${id}`, payload).then((r) => unwrapApi<T>(r)),
  remove: (id: string) => api.delete(`${path}/${id}`),
})

export const transportApi = {
  companies: transportCrud<TransportCompany, TransportCompanyRequest>('/transport/companies'),
  vehicles: transportCrud<TransportVehicle, TransportVehicleRequest>('/transport/vehicles'),
  drivers: transportCrud<TransportDriver, TransportDriverRequest>('/transport/drivers'),
  shipments: {
    ...transportCrud<Shipment, ShipmentRequest>('/transport/shipments'),
    fromChallan: (challanId: string, payload: Record<string, unknown> = {}) =>
      api.post(`/transport/shipments/from-challan/${challanId}`, payload).then((r) => unwrapApi<Shipment>(r)),
    submit: (id: string) => api.post(`/transport/shipments/${id}/submit`).then((r) => unwrapApi<Shipment>(r)),
    approve: (id: string, remarks?: string) =>
      api.post(`/transport/shipments/${id}/approve`, { remarks }).then((r) => unwrapApi<Shipment>(r)),
    assign: (id: string, payload: Record<string, unknown>) =>
      api.post(`/transport/shipments/${id}/assign`, payload).then((r) => unwrapApi<Shipment>(r)),
    dispatch: (id: string, payload?: Record<string, unknown>) =>
      api.post(`/transport/shipments/${id}/dispatch`, payload ?? {}).then((r) => unwrapApi<Shipment>(r)),
    deliver: (id: string, payload?: Record<string, unknown>) =>
      api.post(`/transport/shipments/${id}/deliver`, payload ?? {}).then((r) => unwrapApi<Shipment>(r)),
    close: (id: string) => api.post(`/transport/shipments/${id}/close`).then((r) => unwrapApi<Shipment>(r)),
    cancel: (id: string, remarks?: string) =>
      api.post(`/transport/shipments/${id}/cancel`, { remarks }).then((r) => unwrapApi<Shipment>(r)),
    checkpoint: (id: string, payload?: { remarks?: string; locationJson?: string; payloadJson?: string }) =>
      api.post(`/transport/shipments/${id}/checkpoint`, payload ?? {}).then((r) => unwrapApi<Shipment>(r)),
    addEvent: (
      id: string,
      payload?: { eventType?: string; remarks?: string; locationJson?: string; payloadJson?: string },
    ) => api.post(`/transport/shipments/${id}/events`, payload ?? {}).then((r) => unwrapApi<Shipment>(r)),
    updateHeader: (id: string, payload: Record<string, unknown>) =>
      api.patch(`/transport/shipments/${id}/header`, payload).then((r) => unwrapApi<Shipment>(r)),
    startLoading: (id: string) =>
      api.post(`/transport/shipments/${id}/start-loading`).then((r) => unwrapApi<Shipment>(r)),
    loaded: (id: string) => api.post(`/transport/shipments/${id}/loaded`).then((r) => unwrapApi<Shipment>(r)),
  },
  legs: {
    list: (shipmentId: string) =>
      api.get(`/transport/shipments/${shipmentId}/legs`).then((r) => unwrapList<import('@/types/api').ShipmentLeg>(r)),
    add: (shipmentId: string, payload: Record<string, unknown>) =>
      api
        .post(`/transport/shipments/${shipmentId}/legs`, payload)
        .then((r) => unwrapApi<import('@/types/api').ShipmentLeg>(r)),
    update: (id: string, payload: Record<string, unknown>) =>
      api.put(`/transport/legs/${id}`, payload).then((r) => unwrapApi<import('@/types/api').ShipmentLeg>(r)),
    remove: (id: string) => api.delete(`/transport/legs/${id}`),
    dispatch: (id: string, payload?: Record<string, unknown>) =>
      api
        .patch(`/transport/legs/${id}/dispatch`, payload ?? {})
        .then((r) => unwrapApi<import('@/types/api').ShipmentLeg>(r)),
    arrive: (id: string, payload?: Record<string, unknown>) =>
      api
        .patch(`/transport/legs/${id}/arrive`, payload ?? {})
        .then((r) => unwrapApi<import('@/types/api').ShipmentLeg>(r)),
    complete: (id: string, payload?: Record<string, unknown>) =>
      api
        .patch(`/transport/legs/${id}/complete`, payload ?? {})
        .then((r) => unwrapApi<import('@/types/api').ShipmentLeg>(r)),
    location: (id: string, payload: Record<string, unknown>) =>
      api.patch(`/transport/legs/${id}/location`, payload).then((r) => unwrapApi<import('@/types/api').ShipmentLeg>(r)),
    documents: (id: string) =>
      api.get(`/transport/legs/${id}/documents`).then((r) => unwrapList<Record<string, unknown>>(r)),
    addDocument: (id: string, payload: Record<string, unknown>) =>
      api.post(`/transport/legs/${id}/documents`, payload).then((r) => unwrapApi<Record<string, unknown>>(r)),
  },
  search: (params: Record<string, string | number | undefined>) =>
    api.get('/transport/shipments/search', { params }).then((r) => unwrapList<Shipment>(r)),
  reports: (name: string, params?: Record<string, string>) =>
    api.get(`/transport/reports/${name}`, { params }).then((r) => unwrapList<Record<string, unknown>>(r)),
  shipmentsForSource: (sourceDocumentType: string, sourceDocumentId: string) =>
    api
      .get('/transport/shipments/search', { params: { sourceDocumentType, sourceDocumentId } })
      .then((r) => unwrapList<Shipment>(r)),
  timeline: (id: string) =>
    api.get(`/transport/shipments/${id}/timeline`).then((r) => unwrapList<import('@/types/api').ShipmentEvent>(r)),
}

const retailCrud = <T, P = Partial<T>>(path: string) => ({
  list: (params?: Record<string, string | number | boolean | undefined>) =>
    api.get(path, { params }).then((r) => unwrapList<T>(r)),
  get: (id: string) => api.get(`${path}/${id}`).then((r) => unwrapApi<T>(r)),
  create: (payload: P) => api.post(path, payload).then((r) => unwrapApi<T>(r)),
  update: (id: string, payload: Partial<P>) => api.put(`${path}/${id}`, payload).then((r) => unwrapApi<T>(r)),
  remove: (id: string) => api.delete(`${path}/${id}`),
})

export const retailApi = {
  storeTypes: retailCrud<RetailStoreType, { code: string; name: string }>('/retail/store-types'),
  stores: retailCrud<RetailStore, RetailStoreRequest>('/retail/stores'),
  counters: {
    list: (storeId: string) =>
      api.get('/retail/counters', { params: { storeId } }).then((r) => unwrapList<RetailCounter>(r)),
    create: (payload: { storeId: string; code: string; name: string; status?: string }) =>
      api.post('/retail/counters', payload).then((r) => unwrapApi<RetailCounter>(r)),
    update: (id: string, payload: { storeId: string; code: string; name: string; status?: string }) =>
      api.put(`/retail/counters/${id}`, payload).then((r) => unwrapApi<RetailCounter>(r)),
    remove: (id: string) => api.delete(`/retail/counters/${id}`),
  },
  terminals: {
    list: (storeId: string) =>
      api.get('/retail/terminals', { params: { storeId } }).then((r) => unwrapList<RetailTerminal>(r)),
    create: (payload: { storeId: string; counterId?: string | null; code: string; name: string; status?: string }) =>
      api.post('/retail/terminals', payload).then((r) => unwrapApi<RetailTerminal>(r)),
    update: (
      id: string,
      payload: { storeId: string; counterId?: string | null; code: string; name: string; status?: string },
    ) => api.put(`/retail/terminals/${id}`, payload).then((r) => unwrapApi<RetailTerminal>(r)),
    remove: (id: string) => api.delete(`/retail/terminals/${id}`),
  },
  cashiers: {
    list: (storeId: string) =>
      api.get('/retail/cashiers', { params: { storeId } }).then((r) => unwrapList<RetailCashier>(r)),
    create: (payload: {
      storeId: string
      userId: string
      employeeCode?: string
      displayName: string
      status?: string
    }) => api.post('/retail/cashiers', payload).then((r) => unwrapApi<RetailCashier>(r)),
    update: (
      id: string,
      payload: {
        storeId: string
        userId: string
        employeeCode?: string
        displayName: string
        status?: string
      },
    ) => api.put(`/retail/cashiers/${id}`, payload).then((r) => unwrapApi<RetailCashier>(r)),
    remove: (id: string) => api.delete(`/retail/cashiers/${id}`),
  },
  shifts: {
    list: (storeId?: string) =>
      api.get('/retail/shifts', { params: storeId ? { storeId } : undefined }).then((r) => unwrapList<RetailShift>(r)),
    get: (id: string) => api.get(`/retail/shifts/${id}`).then((r) => unwrapApi<RetailShift>(r)),
    open: (payload: OpenRetailShiftRequest) =>
      api.post('/retail/shifts', payload).then((r) => unwrapApi<RetailShift>(r)),
    close: (id: string, payload: CloseRetailShiftRequest) =>
      api.post(`/retail/shifts/${id}/close`, payload).then((r) => unwrapApi<RetailShift>(r)),
  },
  pos: {
    listSales: (status?: PosSaleStatus) =>
      api.get('/retail/pos/sales', { params: status ? { status } : undefined }).then((r) => unwrapList<PosSale>(r)),
    getSale: (id: string) => api.get(`/retail/pos/sales/${id}`).then((r) => unwrapApi<PosSale>(r)),
    createDraft: (payload: PosSaleRequest) => api.post('/retail/pos/sales', payload).then((r) => unwrapApi<PosSale>(r)),
    addLine: (id: string, payload: PosLineRequest) =>
      api.post(`/retail/pos/sales/${id}/lines`, payload).then((r) => unwrapApi<PosSale>(r)),
    updateLine: (id: string, lineId: string, payload: import('@/types/api').PosLineUpdateRequest) =>
      api.put(`/retail/pos/sales/${id}/lines/${lineId}`, payload).then((r) => unwrapApi<PosSale>(r)),
    removeLine: (id: string, lineId: string) =>
      api.delete(`/retail/pos/sales/${id}/lines/${lineId}`).then((r) => unwrapApi<PosSale>(r)),
    applyAdjustments: (id: string, payload: import('@/types/api').PosAdjustmentsRequest) =>
      api.put(`/retail/pos/sales/${id}/adjustments`, payload).then((r) => unwrapApi<PosSale>(r)),
    hold: (id: string, heldLabel?: string) =>
      api.post(`/retail/pos/sales/${id}/hold`, { heldLabel }).then((r) => unwrapApi<PosSale>(r)),
    resume: (id: string) => api.post(`/retail/pos/sales/${id}/resume`).then((r) => unwrapApi<PosSale>(r)),
    void: (id: string) => api.post(`/retail/pos/sales/${id}/void`).then((r) => unwrapApi<PosSale>(r)),
    checkout: (id: string, payload: PosCheckoutRequest) =>
      api.post(`/retail/pos/sales/${id}/checkout`, payload).then((r) => unwrapApi<PosSale>(r)),
    lookupProduct: (params: { barcode?: string; q?: string }) =>
      api.get('/retail/pos/products', { params }).then((r) => unwrapApi<RetailProductLookup>(r)),
    sync: (payload: RetailSyncRequest) =>
      api.post('/retail/pos/sync', payload).then((r) => unwrapApi<RetailSyncResponse>(r)),
  },
  catalog: {
    brands: retailCrud<RetailBrand, { code: string; name: string }>('/retail/catalog/brands'),
    variants: {
      list: (parentProductId: string) =>
        api.get('/retail/catalog/variants', { params: { parentProductId } }).then((r) => unwrapList<RetailVariant>(r)),
      create: (payload: Record<string, unknown>) =>
        api.post('/retail/catalog/variants', payload).then((r) => unwrapApi<RetailVariant>(r)),
      update: (id: string, payload: Record<string, unknown>) =>
        api.put(`/retail/catalog/variants/${id}`, payload).then((r) => unwrapApi<RetailVariant>(r)),
      remove: (id: string) => api.delete(`/retail/catalog/variants/${id}`),
    },
    barcodes: {
      list: (productId: string) =>
        api.get('/retail/catalog/barcodes', { params: { productId } }).then((r) => unwrapList<RetailBarcode>(r)),
      create: (payload: {
        productId?: string
        variantId?: string
        barcode: string
        barcodeType?: string
        primary?: boolean
      }) => api.post('/retail/catalog/barcodes', payload).then((r) => unwrapApi<RetailBarcode>(r)),
      remove: (id: string) => api.delete(`/retail/catalog/barcodes/${id}`),
    },
  },
  pricing: {
    priceLists: retailCrud<RetailPriceList, RetailPriceListRequest>('/retail/pricing/price-lists'),
    resolve: (params: { storeId: string; productId: string; variantId?: string; qty?: number }) =>
      api.get('/retail/pricing/resolve', { params }).then((r) => unwrapApi<RetailResolvePrice>(r)),
    promotions: retailCrud<RetailPromotion, RetailPromotionRequest>('/retail/pricing/promotions'),
    applyCoupon: (payload: { couponCode: string; billAmount: number }) =>
      api.post('/retail/pricing/apply-coupon', payload).then((r) =>
        unwrapApi<{
          couponCode: string
          applied: boolean
          discountAmount: number
          netAmount: number
          message: string | null
        }>(r),
      ),
  },
  returns: {
    list: () => api.get('/retail/returns').then((r) => unwrapList<RetailReturn>(r)),
    get: (id: string) => api.get(`/retail/returns/${id}`).then((r) => unwrapApi<RetailReturn>(r)),
    create: (payload: RetailReturnRequest) =>
      api.post('/retail/returns', payload).then((r) => unwrapApi<RetailReturn>(r)),
  },
  loyalty: {
    getAccount: (customerId: string) =>
      api
        .get(`/retail/loyalty/accounts/${customerId}`)
        .then((r) => unwrapApi<import('@/types/api').RetailLoyaltyAccount>(r)),
    getOrCreateAccount: (payload: { customerId: string; tierId?: string | null }) =>
      api
        .post('/retail/loyalty/accounts', payload)
        .then((r) => unwrapApi<import('@/types/api').RetailLoyaltyAccount>(r)),
    giftCards: {
      issue: (payload: RetailGiftCardIssueRequest) =>
        api.post('/retail/gift-cards', payload).then((r) => unwrapApi<RetailGiftCard>(r)),
      get: (id: string) => api.get(`/retail/gift-cards/${id}`).then((r) => unwrapApi<RetailGiftCard>(r)),
      balance: (cardNumber: string) =>
        api
          .get('/retail/gift-cards/balance', { params: { cardNumber } })
          .then((r) => unwrapApi<RetailGiftCardBalance>(r)),
      activate: (id: string) => api.post(`/retail/gift-cards/${id}/activate`).then((r) => unwrapApi<RetailGiftCard>(r)),
    },
  },
  inventory: {
    locations: {
      list: (storeId: string) =>
        api
          .get('/retail/inventory/locations', { params: { storeId } })
          .then((r) => unwrapList<RetailInventoryLocation>(r)),
      create: (payload: { storeId: string; warehouseId: string; code: string; name: string; locationType?: string }) =>
        api.post('/retail/inventory/locations', payload).then((r) => unwrapApi<RetailInventoryLocation>(r)),
      update: (
        id: string,
        payload: { storeId: string; warehouseId: string; code: string; name: string; locationType?: string },
      ) => api.put(`/retail/inventory/locations/${id}`, payload).then((r) => unwrapApi<RetailInventoryLocation>(r)),
      remove: (id: string) => api.delete(`/retail/inventory/locations/${id}`),
    },
  },
  analytics: {
    dailySales: (params: { storeId: string; date?: string }) =>
      api.get('/retail/analytics/daily-sales', { params }).then((r) => unwrapApi<RetailDailySales>(r)),
  },
  labels: {
    templates: retailCrud<
      RetailLabelTemplate,
      { code: string; name: string; labelType?: string; templateBody: string }
    >('/retail/labels/templates'),
  },
}

export const accountingApi = {
  dashboard: () =>
    api.get('/accounting/dashboard').then((r) => unwrapApi<import('@/types/api').AccountingDashboardResponse>(r)),
  listAccounts: () => api.get('/accounting/accounts').then((r) => unwrapList<import('@/types/api').AccountResponse>(r)),
  accountTree: () =>
    api.get('/accounting/accounts/tree').then((r) => unwrapList<import('@/types/api').AccountTreeNode>(r)),
  getAccount: (id: string) =>
    api.get(`/accounting/accounts/${id}`).then((r) => unwrapApi<import('@/types/api').AccountResponse>(r)),
  createAccount: (payload: import('@/types/api').AccountRequest) =>
    api.post('/accounting/accounts', payload).then((r) => unwrapApi<import('@/types/api').AccountResponse>(r)),
  updateAccount: (id: string, payload: import('@/types/api').AccountRequest) =>
    api.put(`/accounting/accounts/${id}`, payload).then((r) => unwrapApi<import('@/types/api').AccountResponse>(r)),
  deleteAccount: (id: string) => api.delete(`/accounting/accounts/${id}`),
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
    api
      .get(`/accounting/ledgers/accounts/${id}`, { params })
      .then((r) => unwrapList<import('@/types/api').LedgerLineResponse>(r)),
  customerLedger: (id: string, params?: Record<string, string>) =>
    api
      .get(`/accounting/ledgers/customers/${id}`, { params })
      .then((r) => unwrapList<import('@/types/api').LedgerLineResponse>(r)),
  supplierLedger: (id: string, params?: Record<string, string>) =>
    api
      .get(`/accounting/ledgers/suppliers/${id}`, { params })
      .then((r) => unwrapList<import('@/types/api').LedgerLineResponse>(r)),
  trialBalance: (params?: Record<string, string>) =>
    api
      .get('/accounting/reports/trial-balance', { params })
      .then((r) => unwrapApi<import('@/types/api').TrialBalanceResponse>(r)),
  profitAndLoss: (params?: Record<string, string>) =>
    api
      .get('/accounting/reports/profit-loss', { params })
      .then((r) => unwrapApi<import('@/types/api').ProfitAndLossResponse>(r)),
  balanceSheet: (params?: Record<string, string>) =>
    api
      .get('/accounting/reports/balance-sheet', { params })
      .then((r) => unwrapApi<import('@/types/api').BalanceSheetResponse>(r)),
  gstSummary: (params?: Record<string, string>) =>
    api
      .get('/accounting/reports/gst-summary', { params })
      .then((r) => unwrapApi<import('@/types/api').GstSummaryResponse>(r)),
  integrityCheck: () =>
    api
      .get('/accounting/reports/integrity-check')
      .then((r) =>
        unwrapApi<{ healthy: boolean; issues: Array<{ code: string; message: string; journalEntryId?: string }> }>(r),
      ),
}

export type AiHealth = {
  enabled: boolean
  provider: string
  chatEnabled: boolean
  ragEnabled: boolean
  embeddingsEnabled: boolean
  analyticsEnabled: boolean
  documentAiEnabled: boolean
  voiceEnabled: boolean
  apiKeyConfigured: boolean
  multiAgentEnabled?: boolean
  workflowBuilderEnabled?: boolean
}

export type AiAgentInfo = {
  code: string
  displayName: string
  description: string
  allowedTools: string[]
  permission: string
  supportsCollaboration: boolean
}

export type AiChatResponse = {
  conversationId: string
  messageId: string
  agent: string
  content: string
  model: string
  latencyMs: number
  consultedAgents?: string[]
}

export type AiConversation = {
  id: string
  title: string
  agentType: string
  status: string
  createdAt: string
  updatedAt: string
}

export type AiMessage = {
  id: string
  role: string
  content: string
  model?: string
  promptTokens?: number
  completionTokens?: number
  latencyMs?: number
  createdAt: string
}

export type AiRecommendation = {
  id: string
  type: string
  priority: string
  title: string
  description?: string
  confidence?: number
  reason?: string
  evidence?: Record<string, unknown>
  suggestedAction?: string
  status: string
  relatedEntityType?: string
  relatedEntityId?: string
  createdAt: string
  updatedAt: string
}

export type AiForecast = {
  enabled: boolean
  message: string
  type: string
  runId?: string
  points: { period: string; actual: number; forecast: number }[]
  summary: Record<string, unknown>
}

export type AiWorkflowDraft = {
  id: string
  name: string
  triggerType: string
  description?: string
  conditionsJson?: string
  stepsJson?: string
  suggestedApprovers?: string
  status: string
  createdAt: string
  updatedAt: string
}

export type AiWorkflowApproval = {
  id: string
  entityType: string
  entityId: string
  status: string
  requestedBy: string
  requestedByName?: string | null
  requestedAt: string
  decidedBy?: string
  decidedByName?: string | null
  decidedAt?: string
  remarks?: string
  workflowDraftId?: string
  workflowName?: string
  currentStep?: number
  totalSteps?: number
  currentStepRole?: string
  currentStepAction?: string
  canApprove?: boolean
  stepsSnapshotJson?: string
  actions?: AiWorkflowApprovalAction[]
}

export type AiWorkflowApprovalAction = {
  id: string
  action: string
  actorId: string
  actorName?: string | null
  actedAt: string
  remarks?: string | null
}

export const aiApi = {
  health: () => api.get('/ai/health').then((r) => unwrapApi<AiHealth>(r)),
  agents: () => api.get('/ai/agents').then((r) => unwrapList<AiAgentInfo>(r)),
  chat: (payload: { message: string; conversationId?: string; agent?: string; useRag?: boolean }) =>
    api.post('/ai/chat', payload).then((r) => unwrapApi<AiChatResponse>(r)),
  ask: (payload: { message: string; conversationId?: string; useRag?: boolean }) =>
    api.post('/ai/ask', payload).then((r) => unwrapApi<AiChatResponse>(r)),
  conversations: () => api.get('/ai/conversations').then((r) => unwrapList<AiConversation>(r)),
  messages: (conversationId: string) =>
    api.get(`/ai/conversations/${conversationId}/messages`).then((r) => unwrapList<AiMessage>(r)),
  recommendations: (status?: string) =>
    api
      .get('/ai/recommendations', { params: status ? { status } : undefined })
      .then((r) => unwrapList<AiRecommendation>(r)),
  ack: (id: string) => api.patch(`/ai/recommendations/${id}/acknowledge`).then((r) => unwrapApi<AiRecommendation>(r)),
  dismiss: (id: string) => api.patch(`/ai/recommendations/${id}/dismiss`).then((r) => unwrapApi<AiRecommendation>(r)),
  forecasts: (type: 'DEMAND' | 'SALES' | 'CASHFLOW' | 'INVENTORY') =>
    api.get('/ai/analytics/forecasts', { params: { type } }).then((r) => unwrapApi<AiForecast>(r)),
  voiceTranscribe: (payload: { contentType: string; audioBase64: string }) =>
    api
      .post('/ai/workflow/voice-transcribe', payload)
      .then((r) =>
        unwrapApi<{ configured: boolean; message: string; transcript?: string; result?: Record<string, unknown> }>(r),
      ),
  workflowDrafts: () => api.get('/ai/workflow/drafts').then((r) => unwrapList<AiWorkflowDraft>(r)),
  createWorkflowDraft: (payload: {
    name: string
    triggerType?: string
    description?: string
    conditionsJson?: string
    stepsJson?: string
    suggestedApprovers?: string
  }) => api.post('/ai/workflow/drafts', payload).then((r) => unwrapApi<AiWorkflowDraft>(r)),
  updateWorkflowDraft: (
    id: string,
    payload: {
      name?: string
      triggerType?: string
      description?: string
      conditionsJson?: string
      stepsJson?: string
      suggestedApprovers?: string
    },
  ) => api.put(`/ai/workflow/drafts/${id}`, payload).then((r) => unwrapApi<AiWorkflowDraft>(r)),
  deleteWorkflowDraft: (id: string) => api.delete(`/ai/workflow/drafts/${id}`).then(() => undefined),
  suggestWorkflow: (prompt: string) =>
    api.post('/ai/workflow/suggest', { prompt }).then((r) => unwrapApi<AiWorkflowDraft>(r)),
  activateWorkflow: (id: string) =>
    api.post(`/ai/workflow/drafts/${id}/activate`).then((r) => unwrapApi<AiWorkflowDraft>(r)),
  deactivateWorkflow: (id: string) =>
    api.post(`/ai/workflow/drafts/${id}/deactivate`).then((r) => unwrapApi<AiWorkflowDraft>(r)),
  workflowApprovals: (status: 'pending' | 'all' = 'pending') =>
    api.get('/ai/workflow/approvals', { params: { status } }).then((r) => unwrapList<AiWorkflowApproval>(r)),
  workflowApprovalsForEntity: (entityType: string, entityId: string) =>
    api
      .get('/ai/workflow/approvals', { params: { entityType, entityId } })
      .then((r) => unwrapList<AiWorkflowApproval>(r)),
  approveWorkflow: (id: string, remarks?: string) =>
    api
      .post(`/ai/workflow/approvals/${id}/approve`, remarks?.trim() ? { remarks: remarks.trim() } : {})
      .then((r) => unwrapApi<AiWorkflowApproval>(r)),
  rejectWorkflow: (id: string, remarks?: string) =>
    api
      .post(`/ai/workflow/approvals/${id}/reject`, remarks?.trim() ? { remarks: remarks.trim() } : {})
      .then((r) => unwrapApi<AiWorkflowApproval>(r)),
}
