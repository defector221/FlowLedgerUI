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
  | 'ORGANIZATION_ADMIN'
  | 'ACCOUNTANT'
  | 'SALES_MANAGER'
  | 'PURCHASE_MANAGER'
  | 'INVENTORY_MANAGER'
  | 'VIEWER'
  | 'RETAIL_CASHIER'
  | 'RETAIL_STORE_MANAGER'
  | 'RETAIL_ADMIN'
  | 'RETAIL_REGIONAL_MANAGER'

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
  transportEnabled: boolean
  transportRequiredDefault: boolean
  transportAllowOverride: boolean
  transportApprovalRequired: boolean
  transportDefaultFreightPayer: FreightPayer | null
  transportDelayThresholdHours: number
  retailEnabled: boolean
  settingsJson: string
}

export interface UpdateOrganizationSettingsRequest {
  inventoryDeductionEvent?: string
  taxInclusiveDefault?: boolean
  roundOffEnabled?: boolean
  defaultWarehouseId?: string
  transportEnabled?: boolean
  transportRequiredDefault?: boolean
  transportAllowOverride?: boolean
  transportApprovalRequired?: boolean
  transportDefaultFreightPayer?: FreightPayer
  transportDelayThresholdHours?: number
  retailEnabled?: boolean
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
  billingAddress?: string | null
  shippingAddress?: string | null
  city: string | null
  state: string | null
  stateCode: string | null
  paymentTerms?: string | null
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
  supplierPrices?: {
    supplierId: string
    purchasePrice: number
    supplierSku?: string
    moq?: number
    leadTimeDays?: number
    preferred?: boolean
  }[]
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
  supplierCount?: number
  preferredSupplierName?: string | null
}

export interface CreateSupplierCatalogItemRequest {
  productId?: string
  supplierId?: string
  supplierSku?: string
  supplierProductName?: string
  purchasePrice: number
  currency?: string
  moq?: number
  leadTimeDays?: number
  preferred?: boolean
  validFrom?: string
  validTo?: string
  notes?: string
  active?: boolean
}

export type UpdateSupplierCatalogItemRequest = Partial<
  Omit<CreateSupplierCatalogItemRequest, 'productId' | 'supplierId'>
>

export interface SupplierCatalogItemResponse {
  id: string
  productId: string
  productName: string
  productSku: string
  itemType?: string
  taxRateId?: string | null
  supplierId: string
  supplierName: string
  supplierSku: string | null
  supplierProductName: string | null
  purchasePrice: number
  currency: string
  moq: number | null
  leadTimeDays: number | null
  preferred: boolean
  validFrom: string | null
  validTo: string | null
  notes: string | null
  active: boolean
  version: number
  createdAt: string
  updatedAt: string
}

export type ShipmentStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'APPROVED'
  | 'ASSIGNED'
  | 'LOADING'
  | 'LOADED'
  | 'PARTIALLY_DISPATCHED'
  | 'DISPATCHED'
  | 'IN_TRANSIT'
  | 'DELIVERED'
  | 'CLOSED'
  | 'CANCELLED'
  | 'REJECTED'
export type TransportMode = 'ROAD' | 'RAIL' | 'AIR' | 'SEA' | 'COURIER' | 'CUSTOMER_PICKUP' | 'INTERNAL_VEHICLE'
export type TransportType = 'SELF' | 'THIRD_PARTY' | 'CUSTOMER_ARRANGED'
export type FreightPayer = 'SENDER' | 'RECEIVER' | 'THIRD_PARTY'
export type VehicleStatus = 'AVAILABLE' | 'IN_TRANSIT' | 'MAINTENANCE' | 'INACTIVE'
export type DriverStatus = 'AVAILABLE' | 'ON_TRIP' | 'INACTIVE'

interface TransportRecord {
  id: string
  createdAt?: string
  updatedAt?: string
  version?: number
}

export interface TransportCompany extends TransportRecord {
  name: string
  code: string
  gstin?: string | null
  pan?: string | null
  email?: string | null
  phone?: string | null
  address?: string | null
  city?: string | null
  state?: string | null
  stateCode?: string | null
  country?: string | null
  status: string
  notes?: string | null
}
export type TransportCompanyRequest = Omit<TransportCompany, keyof TransportRecord>

export interface TransportVehicle extends TransportRecord {
  companyId?: string | null
  vehicleNumber: string
  vehicleType: string
  capacity?: number | null
  capacityUnit?: string | null
  ownership: 'SELF' | 'THIRD_PARTY'
  driverId?: string | null
  fitnessExpiry?: string | null
  insuranceExpiry?: string | null
  permitExpiry?: string | null
  currentStatus: VehicleStatus
  notes?: string | null
}
export type TransportVehicleRequest = Omit<TransportVehicle, keyof TransportRecord>

export interface TransportDriver extends TransportRecord {
  companyId?: string | null
  name: string
  licenseNumber: string
  licenseExpiry?: string | null
  mobile?: string | null
  emergencyContact?: string | null
  assignedVehicleId?: string | null
  currentStatus: DriverStatus
  notes?: string | null
}
export type TransportDriverRequest = Omit<TransportDriver, keyof TransportRecord>

export interface ShipmentLine {
  id?: string
  shipmentId?: string
  sourceLineId?: string | null
  productId?: string | null
  productName?: string | null
  description?: string | null
  quantity: number
  unitId?: string | null
  unitName?: string | null
  batchNumber?: string | null
  serialNumber?: string | null
  lineOrder: number
}

export interface ShipmentLeg {
  id?: string
  shipmentId?: string
  sequenceNo: number
  status?: string | null
  transportMode?: TransportMode | null
  transportCompanyId?: string | null
  transportCompanyName?: string | null
  vehicleId?: string | null
  driverId?: string | null
  lrNumber?: string | null
  consignmentNumber?: string | null
  vehicleNumberSnapshot?: string | null
  driverNameSnapshot?: string | null
  driverMobileSnapshot?: string | null
  originLocation?: string | null
  destinationLocation?: string | null
  expectedDeparture?: string | null
  expectedArrival?: string | null
  actualDeparture?: string | null
  actualArrival?: string | null
  remarks?: string | null
  freightCost?: number | null
  fuelCost?: number | null
  tollCost?: number | null
  otherCharges?: number | null
  currentLatitude?: number | null
  currentLongitude?: number | null
}

export interface ShipmentEvent {
  id: string
  shipmentId?: string
  eventType: string
  occurredAt: string
  actorUserId?: string | null
  actorType: 'USER' | 'SYSTEM'
  remarks?: string | null
  locationJson?: string | Record<string, unknown> | null
  payloadJson?: string | Record<string, unknown> | null
}

export interface Shipment extends TransportRecord {
  shipmentNumber: string
  status: ShipmentStatus
  sourceDocumentType?: string | null
  sourceDocumentId?: string | null
  transportRequired: boolean
  transportMode?: TransportMode | null
  transportType?: TransportType | null
  transportCompanyId?: string | null
  transportCompanyName?: string | null
  fromWarehouseId?: string | null
  fromWarehouseName?: string | null
  shipToPartyType?: string | null
  shipToPartyId?: string | null
  shipToPartyName?: string | null
  shipToAddress?: string | null
  expectedDispatchDate?: string | null
  expectedDeliveryDate?: string | null
  actualDispatchDate?: string | null
  actualDeliveryDate?: string | null
  freightCharges: number
  freightPaidBy?: FreightPayer | null
  fuelChargesTotal?: number | null
  tollChargesTotal?: number | null
  otherChargesTotal?: number | null
  grandTotal?: number | null
  totalDistance?: number | null
  priority?: string | null
  insuranceDetails?: string | null
  gpsTrackingUrl?: string | null
  ewayBillNumber?: string | null
  einvoiceReference?: string | null
  remarks?: string | null
  lines?: ShipmentLine[]
  legs?: ShipmentLeg[]
  events?: ShipmentEvent[]
}

export type ShipmentRequest = Omit<Shipment, keyof TransportRecord | 'shipmentNumber' | 'status' | 'events'>

export interface DeliveryChallanItem {
  id: string
  productId: string
  productName?: string | null
  description?: string | null
  quantity: number
  quantityDispatched?: number
  unitName?: string | null
}

export interface DeliveryChallan {
  id: string
  challanNumber: string
  challanDate: string
  status: string
  customerId: string
  customerName?: string | null
  warehouseId?: string | null
  warehouseName?: string | null
  salesOrderId?: string | null
  salesOrderNumber?: string | null
  notes?: string | null
  transportRequired?: boolean
  linkedInvoiceId?: string | null
  linkedInvoiceNumber?: string | null
  createdAt?: string | null
  items?: DeliveryChallanItem[]
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
  salesOrderId?: string | null
  deliveryChallanId?: string | null
  createdAt?: string | null
  items?: SalesInvoiceItemResponse[] | null
}

export interface PaymentAllocationResponse {
  id: string
  documentType: string
  documentId: string
  allocatedAmount: number
  createdAt?: string | null
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
  transactionReference?: string | null
  bankReference?: string | null
  notes?: string | null
  status?: string
  allocatedAmount?: number
  unallocatedAmount?: number
  allocations?: PaymentAllocationResponse[]
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

export interface InventoryLedgerRow {
  date: string
  type: string
  reference?: string | null
  inward: number
  outward: number
  runningBalance: number
}

export interface InventoryStockSnapshot {
  productId?: string
  warehouseId?: string | null
  available?: number
  onHand?: number
  reserved?: number
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

export type SearchEntityType = 'PRODUCT' | 'CUSTOMER' | 'SUPPLIER' | 'SALES_INVOICE' | 'PURCHASE_INVOICE' | 'SHIPMENT'

export interface GlobalSearchResponse {
  query: string
  results: GlobalSearchHit[]
  total: number
  page: number
  size: number
  hasMore: boolean
}

export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE'
export type JournalStatus = 'DRAFT' | 'POSTED' | 'REVERSED' | 'CANCELLED'
export type VoucherType =
  'JOURNAL' | 'SALES' | 'PURCHASE' | 'RECEIPT' | 'PAYMENT' | 'CONTRA' | 'CREDIT_NOTE' | 'DEBIT_NOTE'

export interface AccountRequest {
  accountCode: string
  accountName: string
  description?: string
  accountType: AccountType
  accountSubType?: string | null
  parentAccountId?: string
  status?: AccountStatus
  active?: boolean
  allowManualPosting?: boolean
  openingDebit?: number
  openingCredit?: number
}

export type AccountStatus = 'ACTIVE' | 'INACTIVE'

export interface AccountResponse {
  id: string
  organizationId?: string
  accountCode: string
  accountName: string
  description?: string | null
  accountType: AccountType
  accountSubType?: string | null
  parentAccountId?: string | null
  systemAccountKey?: string | null
  systemAccount: boolean
  editable?: boolean
  deletable?: boolean
  status?: AccountStatus
  active: boolean
  allowManualPosting: boolean
  openingDebit: number
  openingCredit: number
}

export interface AccountTreeNode extends Omit<AccountResponse, 'openingDebit' | 'openingCredit'> {
  children: AccountTreeNode[]
  openingDebit?: number
  openingCredit?: number
}

export interface JournalLineRequest {
  accountId: string
  description?: string
  debitAmount?: number
  creditAmount?: number
  customerId?: string
  supplierId?: string
  reference?: string
}

export interface JournalLineResponse extends JournalLineRequest {
  id: string
  accountCode?: string | null
  accountName?: string | null
  lineNumber: number
}

export interface JournalResponse {
  id: string
  entryNumber: string
  entryDate: string
  postingDate?: string | null
  voucherType: VoucherType
  voucherNumber?: string | null
  description?: string | null
  status: JournalStatus
  source: string
  referenceType?: string | null
  referenceId?: string | null
  reversalOfId?: string | null
  reversedById?: string | null
  totalDebit: number
  totalCredit: number
  postedAt?: string | null
  lines: JournalLineResponse[]
}

export interface JournalRequest {
  entryDate: string
  voucherType?: VoucherType
  description?: string
  voucherNumber?: string
  lines: JournalLineRequest[]
}

export interface LedgerLineResponse {
  journalEntryId: string
  entryNumber: string
  entryDate: string
  description?: string | null
  debitAmount: number
  creditAmount: number
  runningBalance: number
  accountId: string
  accountCode?: string | null
  accountName?: string | null
  customerId?: string | null
  supplierId?: string | null
}

export interface TrialBalanceResponse {
  fromDate?: string | null
  toDate?: string | null
  rows: Array<{
    accountId: string
    accountCode: string
    accountName: string
    accountType: AccountType
    openingDebit: number
    openingCredit: number
    periodDebit: number
    periodCredit: number
    closingDebit: number
    closingCredit: number
  }>
  totalDebit: number
  totalCredit: number
  balanced: boolean
}

export interface ProfitAndLossResponse {
  fromDate?: string | null
  toDate?: string | null
  income: Array<{ name: string; amount: number }>
  expenses: Array<{ name: string; amount: number }>
  totalIncome: number
  totalExpenses: number
  netProfit: number
}

export interface BalanceSheetResponse {
  asOfDate: string
  assets: Array<{ name: string; amount: number }>
  liabilities: Array<{ name: string; amount: number }>
  equity: Array<{ name: string; amount: number }>
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  balanced: boolean
}

export interface GstSummaryResponse {
  fromDate?: string | null
  toDate?: string | null
  outputCgst: number
  outputSgst: number
  outputIgst: number
  inputCgst: number
  inputSgst: number
  inputIgst: number
  netPayable: number
}

export interface AccountingDashboardResponse {
  totalReceivables: number
  totalPayables: number
  cashAndBank: number
  netProfitMtd: number
  journalCountMtd: number
  unbalancedJournals: number
}

export interface InitializeAccountingResponse {
  initialized: boolean
  accountCount: number
  fiscalYear?: { id: string; name: string; startDate: string; endDate: string; status: string; current: boolean } | null
}

// ---------------------------------------------------------------------------
// Retail / POS
// ---------------------------------------------------------------------------

export type RetailShiftStatus = 'OPEN' | 'CLOSED'
export type PosSaleStatus = 'DRAFT' | 'HELD' | 'COMPLETED' | 'VOID'
export type RetailPaymentMode = 'CASH' | 'CARD' | 'UPI' | 'WALLET' | 'CREDIT'
export type RetailReturnReason =
  'DAMAGED' | 'DEFECTIVE' | 'WRONG_ITEM' | 'SIZE_ISSUE' | 'NOT_SATISFIED' | 'EXCHANGE' | 'OTHER'
export type RetailRefundMode = 'REFUND' | 'STORE_CREDIT' | 'EXCHANGE' | 'GIFT_CARD'
export type RetailGiftCardStatus = 'ISSUED' | 'ACTIVE' | 'REDEEMED' | 'EXPIRED' | 'CANCELLED'
export type RetailLocationType = 'SHELF' | 'RACK' | 'BIN' | 'BACKROOM' | 'DISPLAY' | 'WAREHOUSE'
export type RetailPromoType = 'PERCENT_OFF' | 'AMOUNT_OFF' | 'BUY_X_GET_Y' | 'BILL_DISCOUNT' | 'COUPON'
export type RetailPriceType = 'RETAIL' | 'WHOLESALE' | 'MRP' | 'SPECIAL' | 'CLEARANCE'
export type RetailSyncStatus = 'PENDING' | 'PROCESSED' | 'FAILED' | 'DUPLICATE'

export interface RetailStoreType {
  id: string
  code: string
  name: string
  version?: number
}

export interface RetailStore {
  id: string
  code: string
  name: string
  storeTypeId: string | null
  warehouseId: string
  address: string | null
  city: string | null
  state: string | null
  phone: string | null
  status: string
  version?: number
}

export interface RetailStoreRequest {
  code: string
  name: string
  storeTypeId?: string | null
  warehouseId: string
  address?: string
  city?: string
  state?: string
  phone?: string
  status?: string
}

export interface RetailCounter {
  id: string
  storeId: string
  code: string
  name: string
  status: string
  version?: number
}

export interface RetailTerminal {
  id: string
  storeId: string
  counterId: string | null
  code: string
  name: string
  status: string
  version?: number
}

export interface RetailCashier {
  id: string
  storeId: string
  userId: string
  employeeCode: string | null
  displayName: string
  status: string
  version?: number
}

export interface RetailShift {
  id: string
  storeId: string
  counterId: string
  terminalId: string | null
  cashierId: string
  status: RetailShiftStatus
  openedAt: string
  closedAt: string | null
  openingFloat: number
  closingCash: number | null
  expectedCash: number | null
  variance: number | null
  notes: string | null
  version?: number
}

export interface OpenRetailShiftRequest {
  storeId: string
  counterId: string
  terminalId?: string | null
  cashierId: string
  openingFloat?: number
  notes?: string
}

export interface CloseRetailShiftRequest {
  closingCash: number
  notes?: string
}

export interface PosSaleLine {
  id: string
  productId: string
  variantId: string | null
  description: string | null
  barcode: string | null
  quantity: number
  rate: number
  discountPercent: number | null
  taxRate: number | null
  lineTotal: number
  lineOrder: number
}

export interface PosSalePayment {
  id: string
  paymentMode: RetailPaymentMode
  amount: number
  paymentId: string | null
  reference: string | null
}

export interface PosSale {
  id: string
  storeId: string
  counterId: string | null
  terminalId: string | null
  shiftId: string | null
  cashierId: string | null
  customerId: string | null
  salesInvoiceId: string | null
  status: PosSaleStatus
  receiptType: string | null
  billNumber: string | null
  subtotal: number
  discountTotal: number
  billDiscountPercent: number
  billDiscountAmount: number
  loyaltyPointsRedeemed: number
  couponCode: string | null
  taxTotal: number
  grandTotal: number
  heldLabel: string | null
  notes: string | null
  completedAt: string | null
  lines: PosSaleLine[]
  payments: PosSalePayment[]
  version?: number
}

export interface PosSaleRequest {
  storeId: string
  counterId?: string | null
  terminalId?: string | null
  shiftId?: string | null
  cashierId?: string | null
  customerId?: string | null
  notes?: string
}

export interface PosLineRequest {
  productId: string
  variantId?: string | null
  description?: string
  barcode?: string
  quantity: number
  rate: number
  discountPercent?: number
  taxRate?: number
}

export interface PosCheckoutRequest {
  customerId?: string | null
  receiptType?: string
  payments: Array<{ paymentMode: RetailPaymentMode; amount: number; reference?: string }>
}

export interface PosLineUpdateRequest {
  quantity?: number
  discountPercent?: number
  rate?: number
  taxRate?: number
}

export interface PosAdjustmentsRequest {
  customerId?: string | null
  clearCustomer?: boolean
  billDiscountPercent?: number
  billDiscountAmount?: number
  loyaltyPointsRedeemed?: number
  couponCode?: string | null
}

export interface RetailLoyaltyAccount {
  id: string
  customerId: string
  tierId: string | null
  pointsBalance: number
  lifetimePoints: number
}

export interface RetailProductLookup {
  productId: string
  variantId: string | null
  name: string
  barcode: string | null
  sellingPrice: number
  mrp: number | null
  hsnSacCode: string | null
  unitId: string | null
  taxRateId: string | null
}

export interface RetailBrand {
  id: string
  code: string
  name: string
  version?: number
}

export interface RetailVariant {
  id: string
  parentProductId: string
  sku: string | null
  barcode: string | null
  color: string | null
  size: string | null
  weight: string | null
  capacity: string | null
  pattern: string | null
  material: string | null
  sellingPrice: number | null
  mrp: number | null
  active: boolean
  version?: number
}

export interface RetailBarcode {
  id: string
  productId: string | null
  variantId: string | null
  barcode: string
  barcodeType: string | null
  primary: boolean
}

export interface RetailPriceList {
  id: string
  code: string
  name: string
  priceType: RetailPriceType
  currency: string | null
  active: boolean
  version?: number
}

export interface RetailPriceListRequest {
  code: string
  name: string
  priceType?: RetailPriceType
  currency?: string
  active?: boolean
}

export interface RetailResolvePrice {
  productId: string
  variantId: string | null
  unitPrice: number
  source: string
}

export interface RetailPromotion {
  id: string
  code: string
  name: string
  promoType: RetailPromoType
  discountPercent: number | null
  discountAmount: number | null
  buyQty: number | null
  getQty: number | null
  minBillAmount: number | null
  couponCode: string | null
  startsAt: string | null
  endsAt: string | null
  storeId: string | null
  brandId: string | null
  categoryId: string | null
  productId: string | null
  active: boolean
  version?: number
}

export interface RetailPromotionRequest {
  code: string
  name: string
  promoType: RetailPromoType
  discountPercent?: number
  discountAmount?: number
  buyQty?: number
  getQty?: number
  minBillAmount?: number
  couponCode?: string
  startsAt?: string
  endsAt?: string
  storeId?: string
  brandId?: string
  categoryId?: string
  productId?: string
  active?: boolean
}

export interface RetailReturnLine {
  id: string
  productId: string
  quantity: number
  rate: number
  lineTotal: number
}

export interface RetailReturn {
  id: string
  storeId: string
  originalPosSaleId: string | null
  originalInvoiceId: string | null
  salesReturnId: string | null
  status: PosSaleStatus
  reason: RetailReturnReason
  refundMode: RetailRefundMode | null
  notes: string | null
  totalAmount: number
  lines: RetailReturnLine[]
  version?: number
}

export interface RetailReturnRequest {
  storeId: string
  originalPosSaleId?: string
  originalInvoiceId?: string
  reason: RetailReturnReason
  refundMode?: RetailRefundMode
  notes?: string
  lines: Array<{ productId: string; quantity: number; rate: number }>
}

export interface RetailGiftCard {
  id: string
  cardNumber: string
  status: RetailGiftCardStatus
  initialBalance: number
  balance: number
  customerId: string | null
  expiresAt: string | null
  activatedAt: string | null
  version?: number
}

export interface RetailGiftCardBalance {
  cardNumber: string
  status: RetailGiftCardStatus
  balance: number
}

export interface RetailGiftCardIssueRequest {
  cardNumber: string
  initialBalance: number
  customerId?: string
  expiresAt?: string
}

export interface RetailInventoryLocation {
  id: string
  storeId: string
  warehouseId: string
  code: string
  name: string
  locationType: RetailLocationType
  version?: number
}

export interface RetailDailySales {
  date: string
  saleCount: number
  subtotal: number
  discountTotal: number
  taxTotal: number
  grandTotal: number
}

export interface RetailLabelTemplate {
  id: string
  code: string
  name: string
  labelType: string | null
  templateBody: string
  version?: number
}

export interface RetailSyncRequest {
  clientId: string
  clientTxnId: string
  storeId?: string
  payloadJson: string
}

export interface RetailSyncResponse {
  id: string
  status: RetailSyncStatus
  message: string | null
}
