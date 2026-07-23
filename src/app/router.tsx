import { createBrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { OnboardingGuard, ProtectedRoute, RequireRole } from '@/features/auth/auth'
import { AcceptInvitePage } from '@/features/auth/AcceptInvitePage'
import { ForgotPasswordPage, LoginPage, RegisterPage, ResetPasswordPage } from '@/features/auth/AuthPages'
import { OnboardingPage } from '@/features/onboarding/OnboardingPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EntityDetailPage, EntityFormPage, EntityListPage } from '@/features/shared/EntityPages'
import { InventoryPage, SimpleInventoryPage } from '@/features/inventory/InventoryPages'
import {
  CreateChallanPage,
  CreateGrnPage,
  CreateInvoicePage,
  CreatePurchaseInvoicePage,
  CreatePurchaseOrderPage,
  CreateQuotationPage,
  CreateSalesOrderPage,
  DocumentListPage,
  PaymentCreatePage,
} from '@/features/sales/SalesPages'
import { PurchaseInvoiceDetailPage, SalesInvoiceDetailPage } from '@/features/sales/InvoiceDetailPages'
import { DeliveryChallanDetailPage } from '@/features/sales/DeliveryChallanDetailPage'
import { QuotationDetailPage } from '@/features/sales/QuotationDetailPage'
import { SalesOrderDetailPage } from '@/features/sales/SalesOrderDetailPage'
import { PaymentDetailPage } from '@/features/sales/PaymentDetailPage'
import { LeadCreatePage, LeadDetailPage, LeadsListPage } from '@/features/leads/LeadsPage'
import { MarketingSequencesPage } from '@/features/marketing/MarketingPages'
import {
  EmailTemplateEditorPage,
  EmailTemplatesPage,
  MarketingCampaignDetailPage,
  MarketingCampaignsPage,
} from '@/features/marketing/CampaignPages'
import {
  AuditLogsPage,
  OrganizationSettingsPage,
  ReportsPage,
  TaxRatesPage,
  TemplateDesignerPage,
  UnitsPage,
} from '@/features/misc/MiscPages'
import { PlatformSettingsPage } from '@/features/settings/platform/PlatformSettingsPage'
import { TeamManagementPage } from '@/features/settings/TeamManagementPage'
import { BillingPage } from '@/features/settings/BillingPage'
import { ReminderRulesPage } from '@/features/settings/ReminderRulesPage'
import { ChangePasswordPage } from '@/features/settings/ChangePasswordPage'
import { ProfileSettingsPage } from '@/features/settings/ProfileSettingsPage'
import {
  AccountingDashboardPage,
  AccountingReportsPage,
  JournalCreatePage,
  JournalDetailPage,
  JournalsPage,
  PartyLedgerPage,
} from '@/features/accounting/AccountingPages'
import { ChartOfAccountsPage } from '@/features/accounting/ChartOfAccountsPage'
import { TransportDashboardPage } from '@/features/transport/TransportDashboardPage'
import { TransportCompaniesPage } from '@/features/transport/TransportCompaniesPage'
import { TransportVehiclesPage } from '@/features/transport/TransportVehiclesPage'
import { TransportDriversPage } from '@/features/transport/TransportDriversPage'
import { TransportShipmentsPage } from '@/features/transport/TransportShipmentsPage'
import { TransportShipmentDetailPage } from '@/features/transport/TransportShipmentDetailPage'
import { TransportSearchPage } from '@/features/transport/TransportSearchPage'
import { TransportReportsPage } from '@/features/transport/TransportReportsPage'
import { StoresPage } from '@/features/retail/StoresPage'
import { ShiftDashboardPage } from '@/features/retail/ShiftDashboardPage'
import { PosPage } from '@/features/retail/PosPage'
import { RetailCatalogPage } from '@/features/retail/RetailCatalogPage'
import { RetailPricingPage } from '@/features/retail/RetailPricingPage'
import { RetailReturnsPage } from '@/features/retail/RetailReturnsPage'
import { RetailLoyaltyPage } from '@/features/retail/RetailLoyaltyPage'
import { RetailInventoryPage } from '@/features/retail/RetailInventoryPage'
import { RetailAnalyticsPage } from '@/features/retail/RetailAnalyticsPage'
import { RetailLabelsPage } from '@/features/retail/RetailLabelsPage'
import { AiChatPage } from '@/features/ai/AiChatPage'
import { AiRecommendationsPage } from '@/features/ai/AiRecommendationsPage'
import { AiAnalyticsPage } from '@/features/ai/AiAnalyticsPage'
import { AiWorkflowsPage } from '@/features/ai/AiWorkflowsPage'
import { RequirePlatformFeature } from '@/platform'

const guarded = (element: ReactNode) => (
  <ProtectedRoute>
    <OnboardingGuard>{element}</OnboardingGuard>
  </ProtectedRoute>
)
const entityRoutes = (kind: 'customers' | 'suppliers' | 'products' | 'categories' | 'warehouses') => [
  { index: true, element: <EntityListPage kind={kind} /> },
  { path: 'new', element: <EntityFormPage kind={kind} /> },
  { path: ':id/edit', element: <EntityFormPage kind={kind} /> },
  { path: ':id', element: <EntityDetailPage kind={kind} /> },
]

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/forgot-password', element: <ForgotPasswordPage /> },
  { path: '/reset-password', element: <ResetPasswordPage /> },
  { path: '/accept-invite', element: <AcceptInvitePage /> },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute>
        <OnboardingPage />
      </ProtectedRoute>
    ),
  },
  {
    element: guarded(<AppLayout />),
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'customers', children: entityRoutes('customers') },
      { path: 'suppliers', children: entityRoutes('suppliers') },
      { path: 'products', children: entityRoutes('products') },
      { path: 'categories', children: entityRoutes('categories') },
      { path: 'warehouses', children: entityRoutes('warehouses') },
      { path: 'inventory', element: <InventoryPage /> },
      {
        path: 'inventory/ledger',
        element: (
          <SimpleInventoryPage
            title="Stock ledger"
            description="View every stock movement by product and warehouse."
            mode="ledger"
          />
        ),
      },
      {
        path: 'inventory/adjustments',
        element: (
          <SimpleInventoryPage
            title="Stock adjustments"
            description="Record stock corrections and recounts."
            mode="adjustment"
          />
        ),
      },
      {
        path: 'inventory/transfers',
        element: (
          <SimpleInventoryPage title="Stock transfers" description="Move stock between warehouses." mode="transfer" />
        ),
      },
      {
        path: 'inventory/opening-stock',
        element: (
          <SimpleInventoryPage
            title="Opening stock"
            description="Seed warehouse quantities for products."
            mode="opening"
          />
        ),
      },
      {
        path: 'sales/quotations',
        element: (
          <DocumentListPage
            title="Quotations"
            endpoint="quotations"
            createPath="/sales/quotations/new"
            createLabel="Create quotation"
          />
        ),
      },
      { path: 'sales/quotations/new', element: <CreateQuotationPage /> },
      { path: 'sales/quotations/:id', element: <QuotationDetailPage /> },
      {
        path: 'sales/orders',
        element: (
          <DocumentListPage
            title="Sales orders"
            endpoint="orders"
            createPath="/sales/orders/new"
            createLabel="Create sales order"
          />
        ),
      },
      { path: 'sales/orders/new', element: <CreateSalesOrderPage /> },
      { path: 'sales/orders/:id', element: <SalesOrderDetailPage /> },
      {
        path: 'sales/challans',
        element: (
          <DocumentListPage
            title="Delivery challans"
            endpoint="challans"
            createPath="/sales/challans/new"
            createLabel="Create challan"
          />
        ),
      },
      { path: 'sales/challans/new', element: <CreateChallanPage /> },
      { path: 'sales/challans/:id', element: <DeliveryChallanDetailPage /> },
      {
        path: 'sales/invoices',
        element: (
          <DocumentListPage
            title="Sales invoices"
            endpoint="invoices"
            createPath="/sales/invoices/new"
            createLabel="Create invoice"
          />
        ),
      },
      { path: 'sales/invoices/new', element: <CreateInvoicePage /> },
      { path: 'sales/invoices/:id/edit', element: <CreateInvoicePage /> },
      { path: 'sales/invoices/:id', element: <SalesInvoiceDetailPage /> },
      {
        path: 'purchases/orders',
        element: (
          <DocumentListPage
            title="Purchase orders"
            endpoint="purchase-orders"
            createPath="/purchases/orders/new"
            createLabel="Create purchase order"
          />
        ),
      },
      { path: 'purchases/orders/new', element: <CreatePurchaseOrderPage /> },
      {
        path: 'purchases/grn',
        element: (
          <DocumentListPage
            title="Goods receipt notes"
            endpoint="grn"
            createPath="/purchases/grn/new"
            createLabel="Create GRN"
          />
        ),
      },
      { path: 'purchases/grn/new', element: <CreateGrnPage /> },
      {
        path: 'purchases/invoices',
        element: (
          <DocumentListPage
            title="Purchase invoices"
            endpoint="purchase-invoices"
            createPath="/purchases/invoices/new"
            createLabel="Create purchase invoice"
          />
        ),
      },
      { path: 'purchases/invoices/new', element: <CreatePurchaseInvoicePage /> },
      { path: 'purchases/invoices/:id', element: <PurchaseInvoiceDetailPage /> },
      {
        path: 'payments/received',
        element: (
          <DocumentListPage
            title="Payments received"
            endpoint="received"
            createPath="/payments/received/new"
            createLabel="Record payment"
          />
        ),
      },
      { path: 'payments/received/new', element: <PaymentCreatePage defaultType="RECEIPT" /> },
      { path: 'payments/received/:id', element: <PaymentDetailPage kind="received" /> },
      {
        path: 'payments/suppliers',
        element: (
          <DocumentListPage
            title="Supplier payments"
            endpoint="suppliers-payments"
            createPath="/payments/suppliers/new"
            createLabel="Record payment"
          />
        ),
      },
      { path: 'payments/suppliers/new', element: <PaymentCreatePage defaultType="PAYMENT" /> },
      { path: 'payments/suppliers/:id', element: <PaymentDetailPage kind="suppliers" /> },
      { path: 'accounting', element: <AccountingDashboardPage /> },
      { path: 'accounting/chart-of-accounts', element: <ChartOfAccountsPage /> },
      { path: 'accounting/journals', element: <JournalsPage /> },
      { path: 'accounting/journals/new', element: <JournalCreatePage /> },
      { path: 'accounting/journals/:id', element: <JournalDetailPage /> },
      { path: 'accounting/reports', element: <AccountingReportsPage /> },
      { path: 'accounting/ledgers/accounts/:id', element: <PartyLedgerPage party="accounts" /> },
      { path: 'accounting/ledgers/customers/:id', element: <PartyLedgerPage party="customers" /> },
      { path: 'accounting/ledgers/suppliers/:id', element: <PartyLedgerPage party="suppliers" /> },
      { path: 'transport', element: <TransportDashboardPage /> },
      { path: 'transport/companies', element: <TransportCompaniesPage /> },
      { path: 'transport/vehicles', element: <TransportVehiclesPage /> },
      { path: 'transport/drivers', element: <TransportDriversPage /> },
      { path: 'transport/shipments', element: <TransportShipmentsPage /> },
      { path: 'transport/shipments/:id', element: <TransportShipmentDetailPage /> },
      { path: 'transport/search', element: <TransportSearchPage /> },
      { path: 'transport/reports', element: <TransportReportsPage /> },
      { path: 'retail/pos', element: <PosPage /> },
      { path: 'retail/stores', element: <StoresPage /> },
      { path: 'retail/shifts', element: <ShiftDashboardPage /> },
      { path: 'retail/catalog', element: <RetailCatalogPage /> },
      { path: 'retail/pricing', element: <RetailPricingPage /> },
      { path: 'retail/returns', element: <RetailReturnsPage /> },
      { path: 'retail/loyalty', element: <RetailLoyaltyPage /> },
      { path: 'retail/inventory', element: <RetailInventoryPage /> },
      { path: 'retail/analytics', element: <RetailAnalyticsPage /> },
      { path: 'retail/labels', element: <RetailLabelsPage /> },
      { path: 'leads', element: <LeadsListPage /> },
      { path: 'leads/new', element: <LeadCreatePage /> },
      { path: 'leads/:id', element: <LeadDetailPage /> },
      { path: 'marketing/sequences', element: <MarketingSequencesPage /> },
      { path: 'marketing/campaigns', element: <MarketingCampaignsPage /> },
      { path: 'marketing/campaigns/:id', element: <MarketingCampaignDetailPage /> },
      { path: 'marketing/email-templates', element: <EmailTemplatesPage /> },
      { path: 'marketing/email-templates/:id', element: <EmailTemplateEditorPage /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'templates', element: <TemplateDesignerPage /> },
      {
        path: 'settings/organization',
        element: (
          <RequireRole roles={['ORGANIZATION_ADMIN']}>
            <OrganizationSettingsPage />
          </RequireRole>
        ),
      },
      {
        path: 'settings/platform',
        element: (
          <RequireRole roles={['ORGANIZATION_ADMIN']}>
            <PlatformSettingsPage />
          </RequireRole>
        ),
      },
      {
        path: 'settings/billing',
        element: (
          <RequireRole roles={['ORGANIZATION_ADMIN']}>
            <BillingPage />
          </RequireRole>
        ),
      },
      {
        path: 'settings/users',
        element: (
          <RequireRole roles={['ORGANIZATION_ADMIN']}>
            <TeamManagementPage />
          </RequireRole>
        ),
      },
      { path: 'settings/tax-rates', element: <TaxRatesPage /> },
      { path: 'settings/units', element: <UnitsPage /> },
      { path: 'settings/reminder-rules', element: <ReminderRulesPage /> },
      { path: 'settings/password', element: <ChangePasswordPage /> },
      { path: 'settings/profile', element: <ProfileSettingsPage /> },
      { path: 'audit', element: <AuditLogsPage /> },
      {
        path: 'ai/chat',
        element: (
          <RequirePlatformFeature module="AI" feature="ASSISTANT" title="AI Assistant">
            <AiChatPage />
          </RequirePlatformFeature>
        ),
      },
      {
        path: 'ai/recommendations',
        element: (
          <RequirePlatformFeature module="AI" feature="INSIGHTS" title="AI Insights">
            <AiRecommendationsPage />
          </RequirePlatformFeature>
        ),
      },
      {
        path: 'ai/analytics',
        element: (
          <RequirePlatformFeature module="AI" feature="FORECASTS" title="AI Forecasts">
            <AiAnalyticsPage />
          </RequirePlatformFeature>
        ),
      },
      {
        path: 'ai/workflows',
        element: (
          <RequirePlatformFeature module="AI" feature="AUTOMATION" title="AI Automation">
            <AiWorkflowsPage />
          </RequirePlatformFeature>
        ),
      },
    ],
  },
])
