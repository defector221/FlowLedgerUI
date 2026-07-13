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
import { CreateInvoicePage, DocumentListPage } from '@/features/sales/SalesPages'
import { AuditLogsPage, OrganizationSettingsPage, ReportsPage, TemplateDesignerPage } from '@/features/misc/MiscPages'
import { TeamManagementPage } from '@/features/settings/TeamManagementPage'

const guarded = (element: ReactNode) => <ProtectedRoute><OnboardingGuard>{element}</OnboardingGuard></ProtectedRoute>
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
  { path: '/onboarding', element: <ProtectedRoute><OnboardingPage /></ProtectedRoute> },
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
      { path: 'inventory/ledger', element: <SimpleInventoryPage title="Stock ledger" description="View every stock movement by product and warehouse." /> },
      { path: 'inventory/adjustments', element: <SimpleInventoryPage title="Stock adjustments" description="Record stock corrections and recounts." mode="adjustment" /> },
      { path: 'inventory/transfers', element: <SimpleInventoryPage title="Stock transfers" description="Move stock between warehouses." mode="transfer" /> },
      { path: 'sales/quotations', element: <DocumentListPage title="Quotations" endpoint="quotations" /> },
      { path: 'sales/orders', element: <DocumentListPage title="Sales orders" endpoint="orders" unavailable /> },
      { path: 'sales/challans', element: <DocumentListPage title="Delivery challans" endpoint="challans" unavailable /> },
      { path: 'sales/invoices', element: <DocumentListPage title="Tax invoices" endpoint="invoices" createPath="/sales/invoices/new" /> },
      { path: 'sales/invoices/new', element: <CreateInvoicePage /> },
      { path: 'purchases/orders', element: <DocumentListPage title="Purchase orders" endpoint="purchase-orders" /> },
      { path: 'purchases/grn', element: <DocumentListPage title="Goods receipt notes" endpoint="grn" /> },
      { path: 'purchases/invoices', element: <DocumentListPage title="Purchase invoices" endpoint="purchase-invoices" /> },
      { path: 'payments/received', element: <DocumentListPage title="Payments received" endpoint="received" /> },
      { path: 'payments/suppliers', element: <DocumentListPage title="Supplier payments" endpoint="suppliers-payments" /> },
      { path: 'reports', element: <ReportsPage /> },
      { path: 'templates', element: <TemplateDesignerPage /> },
      { path: 'settings/organization', element: <RequireRole roles={['ORGANIZATION_ADMIN']}><OrganizationSettingsPage /></RequireRole> },
      { path: 'settings/users', element: <RequireRole roles={['ORGANIZATION_ADMIN']}><TeamManagementPage /></RequireRole> },
      { path: 'audit', element: <AuditLogsPage /> },
    ],
  },
])
