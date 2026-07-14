export interface ApiResponse<T> {
  data: T
  message: string | null
  timestamp: string
}

export interface PageResponse<T> {
  content: T[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type UserStatus = 'INVITED' | 'ACTIVE' | 'INACTIVE'

export type RoleCode =
  'ORGANIZATION_ADMIN' | 'ACCOUNTANT' | 'SALES_MANAGER' | 'PURCHASE_MANAGER' | 'INVENTORY_MANAGER' | 'VIEWER'

export interface UserResponse {
  id: string
  email: string
  firstName: string
  lastName: string | null
  status: UserStatus
}

export interface OrganizationAccessResponse {
  id: string
  organizationName: string
  roles: RoleCode[]
  membershipStatus: UserStatus
  onboardingCompleted: boolean
}

export interface LoginResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  user: UserResponse
  activeOrganization: OrganizationAccessResponse
  organizations: OrganizationAccessResponse[]
}

export interface SwitchOrganizationRequest {
  organizationId: string
}

export interface CreateOrganizationRequest {
  organizationName: string
}

export interface OrganizationResponse {
  id: string
  name: string
  legalName: string | null
  logoObjectKey: string | null
  email: string | null
  phone: string | null
  website: string | null
  gstin: string | null
  pan: string | null
  cin: string | null
  billingAddress: string | null
  shippingAddress: string | null
  city: string | null
  state: string | null
  stateCode: string | null
  country: string | null
  currency: string | null
  financialYearStart: string | null
  invoicePrefix: string | null
  invoiceNumberFormat: string | null
  bankName: string | null
  bankAccountNumber: string | null
  bankIfsc: string | null
  bankBranch: string | null
  upiId: string | null
  paymentTerms: string | null
  onboardingCompleted: boolean
  onboardingCompletedAt: string | null
}

export interface UpdateOrganizationRequest {
  name?: string
  legalName?: string
  gstin?: string
  pan?: string
  cin?: string
  email?: string
  phone?: string
  website?: string
  billingAddress?: string
  shippingAddress?: string
  city?: string
  state?: string
  stateCode?: string
  country?: string
  currency?: string
  financialYearStart?: string
  invoicePrefix?: string
  invoiceNumberFormat?: string
  bankName?: string
  bankAccountNumber?: string
  bankIfsc?: string
  bankBranch?: string
  upiId?: string
  paymentTerms?: string
}

export interface OrganizationSettingsResponse {
  id: string
  organizationId: string
  inventoryDeductionEvent: string
  taxInclusiveDefault: boolean
  roundOffEnabled: boolean
  defaultWarehouseId: string | null
  settingsJson: string
}

export interface UpdateOrganizationSettingsRequest {
  inventoryDeductionEvent?: string
  taxInclusiveDefault?: boolean
  roundOffEnabled?: boolean
  defaultWarehouseId?: string
  settingsJson?: string
}

export interface CreateWarehouseRequest {
  warehouseCode?: string
  warehouseName: string
  defaultWarehouse?: boolean
  address?: string
  contactPerson?: string
  phone?: string
}

export interface UpdateWarehouseRequest {
  warehouseName: string
  address?: string
  contactPerson?: string
  phone?: string
  active?: boolean
}

export interface WarehouseResponse {
  id: string
  warehouseCode: string
  warehouseName: string
  address: string | null
  contactPerson: string | null
  phone: string | null
  defaultWarehouse: boolean
  active: boolean
}

export interface CreateCustomerRequest {
  customerCode?: string
  customerName: string
  companyName?: string
  gstin?: string
  pan?: string
  email?: string
  phone?: string
  billingAddress?: string
  shippingAddress?: string
  city?: string
  state?: string
  stateCode?: string
  country?: string
  creditLimit?: number
  paymentTerms?: string
  openingBalance?: number
  notes?: string
}

export interface UpdateCustomerRequest {
  customerName: string
  companyName?: string
  gstin?: string
  pan?: string
  email?: string
  phone?: string
  billingAddress?: string
  shippingAddress?: string
  city?: string
  state?: string
  stateCode?: string
  country?: string
  creditLimit?: number
  paymentTerms?: string
  openingBalance?: number
  notes?: string
  archived?: boolean
}

export interface CustomerResponse {
  id: string
  customerCode: string
  customerName: string
  companyName: string | null
  gstin: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  stateCode: string | null
  creditLimit: number
  openingBalance: number
  archived: boolean
}

export interface CreateSupplierRequest {
  supplierCode: string
  supplierName: string
  companyName?: string
  gstin?: string
  pan?: string
  email?: string
  phone?: string
  billingAddress?: string
  shippingAddress?: string
  city?: string
  state?: string
  stateCode?: string
  country?: string
  paymentTerms?: string
  openingBalance?: number
  bankName?: string
  bankAccountNumber?: string
  bankIfsc?: string
  notes?: string
}

export interface UpdateSupplierRequest {
  supplierName: string
  companyName?: string
  gstin?: string
  pan?: string
  email?: string
  phone?: string
  billingAddress?: string
  shippingAddress?: string
  city?: string
  state?: string
  stateCode?: string
  country?: string
  paymentTerms?: string
  openingBalance?: number
  bankName?: string
  bankAccountNumber?: string
  bankIfsc?: string
  notes?: string
  archived?: boolean
}

export interface SupplierResponse {
  id: string
  supplierCode: string
  supplierName: string
  companyName: string | null
  gstin: string | null
  email: string | null
  phone: string | null
  city: string | null
  state: string | null
  stateCode: string | null
  openingBalance: number
  archived: boolean
}

export interface CreateProductRequest {
  sku?: string
  name: string
  unitId?: string
  itemType?: string
  barcode?: string
  description?: string
  categoryId?: string
  brand?: string
  hsnSacCode?: string
  purchasePrice?: number
  sellingPrice?: number
  mrp?: number
  taxRateId?: string
  openingStock?: number
  warehouseId?: string
  minimumStockLevel?: number
  maximumStockLevel?: number
  reorderLevel?: number
}

export interface UpdateProductRequest {
  name: string
  barcode?: string
  description?: string
  categoryId?: string
  brand?: string
  hsnSacCode?: string
  unitId?: string
  purchasePrice?: number
  sellingPrice?: number
  mrp?: number
  taxRateId?: string
  minimumStockLevel?: number
  maximumStockLevel?: number
  reorderLevel?: number
  active?: boolean
}

export interface ProductResponse {
  id: string
  itemType: string
  sku: string
  barcode: string | null
  name: string
  description: string | null
  categoryId: string | null
  categoryName?: string | null
  brand: string | null
  hsnSacCode: string | null
  unitId: string
  unitName?: string | null
  purchasePrice: number
  sellingPrice: number
  mrp: number
  taxRateId: string | null
  taxRateName?: string | null
  taxType?: string | null
  minimumStockLevel: number
  reorderLevel: number
  active: boolean
}

export interface CreateCategoryRequest {
  name: string
  description?: string
  parentId?: string
}

export interface UpdateCategoryRequest {
  name: string
  description?: string
  parentId?: string
  active?: boolean
}

export interface CategoryResponse {
  id: string
  name: string
  description: string | null
  parentId: string | null
  parentName?: string | null
  active: boolean
}

export interface InviteUserRequest {
  firstName: string
  lastName?: string
  email: string
  role: RoleCode
  phone?: string
}

export interface UserListResponse {
  id: string
  email: string
  firstName: string
  lastName: string | null
  phone: string | null
  status: UserStatus
  roles: RoleCode[]
  lastLoginAt: string | null
}

export interface RoleResponse {
  code: RoleCode
  name: string
  description: string | null
}

export interface InvitationPreviewResponse {
  organizationName: string
  email: string
  firstName: string
  lastName: string | null
}

export interface AcceptInvitationRequest {
  token: string
  password: string
}

export interface SalesInvoiceItemRequest {
  productId: string
  description?: string
  hsnSacCode?: string
  quantity: number
  unitId?: string
  rate: number
  discountPercent?: number
  taxRate?: number
  taxType?: string
  splitStrategy?: string
  cgstSharePercent?: number
  sgstSharePercent?: number
}

export interface CreateSalesInvoiceRequest {
  customerId: string
  invoiceDate?: string
  dueDate?: string
  warehouseId?: string
  salesOrderId?: string
  deliveryChallanId?: string
  billingAddress?: string
  shippingAddress?: string
  placeOfSupply?: string
  taxInclusive?: boolean
  shippingCharges?: number
  additionalCharges?: number
  roundOff?: number
  notes?: string
  termsAndConditions?: string
  templateId?: string
  items: SalesInvoiceItemRequest[]
}

export interface SalesInvoiceItemResponse {
  id?: string
  productId: string
  productName?: string | null
  itemType?: string | null
  unitName?: string | null
  description?: string | null
  hsnSacCode?: string | null
  quantity: number
  rate: number
  discountPercent?: number | null
  discountAmount?: number | null
  taxRate?: number
  taxType?: string | null
  splitStrategy?: string | null
  cgstSharePercent?: number | null
  sgstSharePercent?: number | null
  lineTotal?: number
  warehouseName?: string | null
}

export interface SalesInvoiceResponse {
  id: string
  invoiceNumber: string
  invoiceDate: string
  dueDate: string | null
  customerId: string
  warehouseId: string | null
  warehouseName?: string | null
  status: string
  grandTotal: number
  subtotal?: number | null
  discountTotal?: number | null
  taxableAmount?: number | null
  cgstTotal?: number | null
  sgstTotal?: number | null
  igstTotal?: number | null
  shippingCharges?: number | null
  additionalCharges?: number | null
  roundOff?: number | null
  amountPaid?: number | null
  outstandingAmount?: number | null
  paymentStatus: string
  notes?: string | null
  termsAndConditions?: string | null
  templateId?: string | null
  billingAddress?: string | null
  shippingAddress?: string | null
  placeOfSupply?: string | null
  items?: SalesInvoiceItemResponse[] | null
}

export interface PaymentResponse {
  id: string
  paymentNumber: string
  paymentDate: string
  paymentType: 'RECEIPT' | 'PAYMENT'
  partyType: 'CUSTOMER' | 'SUPPLIER'
  customerId: string | null
  supplierId: string | null
  amount: number
  paymentMode: string
}

export interface DashboardResponse {
  todaySales: number
  monthSales: number
  todayPurchases: number
  monthPurchases: number
  todaySalesDiscount?: number
  monthSalesDiscount?: number
  receivables: number
  payables: number
  overdueInvoices: number
  outOfStock: number
  lowStock: number
  salesTrend: [string, number][]
  purchaseTrend: [string, number][]
  topProducts: unknown[]
  topCustomers: unknown[]
}

export interface InventoryAlertResponse {
  productId: string
  productName: string
  available: number
  threshold: number
}

export interface InventoryStockPosition {
  productId: string
  productName: string
  sku: string
  available: number
  draftReserved: number
  minimumStockLevel: number
  reorderLevel: number
}

export interface StockAdjustmentRequest {
  productId: string
  warehouseId: string
  quantity: number
  notes?: string
}

export interface StockTransferRequest {
  productId: string
  fromWarehouseId: string
  toWarehouseId: string
  quantity: number
  notes?: string
}

export interface AuditLogResponse {
  id: string
  organizationId: string
  userId: string | null
  userName: string | null
  userEmail: string | null
  action: string
  entityType: string
  entityId: string | null
  oldValue?: unknown
  newValue?: unknown
  ipAddress?: string | null
  userAgent?: string | null
  createdAt: string
}

export interface InAppNotificationResponse {
  id: string
  title: string
  body: string | null
  notificationType: string
  entityType: string | null
  entityId: string | null
  read: boolean
  createdAt: string
  link: string | null
}

export interface PaymentReminderRuleResponse {
  id: string
  name: string
  daysOffset: number
  offsetType: 'BEFORE_DUE' | 'AFTER_DUE' | 'ON_DUE' | string
  channel: 'EMAIL' | 'WHATSAPP' | string
  enabled: boolean
  subjectTemplate: string | null
  bodyTemplate: string | null
}

export interface PaymentReminderRuleRequest {
  name: string
  daysOffset: number
  offsetType: string
  channel: string
  enabled?: boolean
  subjectTemplate?: string
  bodyTemplate?: string
}

export interface InvoiceTemplateConfig {
  layoutKey?: string
  logo?: { visible?: boolean; position?: string }
  header?: { title?: string; accentColor?: string; showGstin?: boolean }
  items?: { columns?: string[]; showHsn?: boolean; showTax?: boolean }
  footer?: {
    showBankDetails?: boolean
    showTerms?: boolean
    showSignature?: boolean
    note?: string
    defaultTerms?: string
  }
}

export interface InvoiceTemplateResponse {
  id: string
  templateName: string
  documentType?: string
  presetKey: string | null
  isDefault: boolean
  editorMode?: string
  configJson: InvoiceTemplateConfig | string
  designJson?: Record<string, unknown> | null
  html?: string | null
}

export interface CreateInvoiceTemplateRequest {
  templateName: string
  presetKey?: string
  documentType?: string
  editorMode?: string
  configJson?: InvoiceTemplateConfig
  designJson?: Record<string, unknown>
  html?: string
}

export interface GlobalSearchHit {
  entityId: string
  entityType: SearchEntityType
  title: string
  subtitle?: string | null
  referenceNumber?: string | null
}

export type SearchEntityType = 'PRODUCT' | 'CUSTOMER' | 'SUPPLIER' | 'SALES_INVOICE' | 'PURCHASE_INVOICE'

export interface GlobalSearchResponse {
  query: string
  results: GlobalSearchHit[]
  total: number
  page: number
  size: number
  hasMore: boolean
}
