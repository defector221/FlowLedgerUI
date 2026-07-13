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
  CreateInvoicePage,
  CreatePurchaseOrderPage,
  CreateQuotationPage,
  DocumentListPage,
  PaymentCreatePage,
} from '@/features/sales/SalesPages'
import { LeadCreatePage, LeadDetailPage, LeadsListPage } from '@/features/leads/LeadsPage'
import { MarketingSequencesPage } from '@/features/marketing/MarketingPages'
import {
  AuditLogsPage,
  OrganizationSettingsPage,
  ReportsPage,
  TaxRatesPage,
  TemplateDesignerPage,
  UnitsPage,
} from '@/features/misc/MiscPages'
import { TeamManagementPage } from '@/features/settings/TeamManagementPage'
import { BillingPage } from '@/features/settings/BillingPage'

const guarded = (element: ReactNode) => (
  <ProtectedRoute>
    <OnboardingGuard>{element}</OnboardingGuard>
  </ProtectedRoute>
)
const entityRoutes = (kind: 'customers' | 'suppliers' | 'products' | 'categories' | 'warehouses') => [
  { index: true, element: <EntityListPage kind={kind} /> },
  { path: 'new', element: <EntityFormPage kind={kind} /> },
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
      { path: 'sales/orders', element: <DocumentListPage title="Sales orders" endpoint="orders" /> },
      { path: 'sales/challans', element: <DocumentListPage title="Delivery challans" endpoint="challans" /> },
      {
        path: 'sales/invoices',
        element: (
          <DocumentListPage
            title="Tax invoices"
            endpoint="invoices"
            createPath="/sales/invoices/new"
            createLabel="Create invoice"
          />
        ),
      },
      { path: 'sales/invoices/new', element: <CreateInvoicePage /> },
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
      { path: 'purchases/grn', element: <DocumentListPage title="Goods receipt notes" endpoint="grn" /> },
      {
        path: 'purchases/invoices',
        element: <DocumentListPage title="Purchase invoices" endpoint="purchase-invoices" />,
      },
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
      { path: 'leads', element: <LeadsListPage /> },
      { path: 'leads/new', element: <LeadCreatePage /> },
      { path: 'leads/:id', element: <LeadDetailPage /> },
      { path: 'marketing/sequences', element: <MarketingSequencesPage /> },
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
      { path: 'audit', element: <AuditLogsPage /> },
    ],
  },
])
