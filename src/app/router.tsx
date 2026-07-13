import { createBrowserRouter } from 'react-router-dom'
import type { ReactNode } from 'react'
import { AppLayout } from '@/components/layout/AppLayout'
import { ProtectedRoute } from '@/features/auth/auth'
import { ForgotPasswordPage, LoginPage, ResetPasswordPage } from '@/features/auth/AuthPages'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { EntityDetailPage, EntityFormPage, EntityListPage } from '@/features/shared/EntityPages'
import { InventoryPage, SimpleInventoryPage } from '@/features/inventory/InventoryPages'
import { CreateInvoicePage, DocumentListPage } from '@/features/sales/SalesPages'
import { AuditLogsPage, ReportsPage, SettingsPage, TemplateDesignerPage } from '@/features/misc/MiscPages'

const guarded = (element: ReactNode) => <ProtectedRoute>{element}</ProtectedRoute>
const entityRoutes = (kind: 'customers' | 'suppliers' | 'products' | 'categories' | 'warehouses') => [{ index: true, element: <EntityListPage kind={kind} /> }, { path: 'new', element: <EntityFormPage kind={kind} /> }, { path: ':id', element: <EntityDetailPage kind={kind} /> }]
export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> }, { path: '/forgot-password', element: <ForgotPasswordPage /> }, { path: '/reset-password', element: <ResetPasswordPage /> },
  { element: guarded(<AppLayout />), children: [
    { index: true, element: <DashboardPage /> },
    { path: 'customers', children: entityRoutes('customers') }, { path: 'suppliers', children: entityRoutes('suppliers') }, { path: 'products', children: entityRoutes('products') }, { path: 'categories', children: entityRoutes('categories') }, { path: 'warehouses', children: entityRoutes('warehouses') },
    { path: 'inventory', element: <InventoryPage /> }, { path: 'inventory/ledger', element: <SimpleInventoryPage title="Stock ledger" description="View every stock movement by product and warehouse." /> }, { path: 'inventory/adjustments', element: <SimpleInventoryPage title="Stock adjustments" description="Record stock corrections and recounts." /> }, { path: 'inventory/transfers', element: <SimpleInventoryPage title="Stock transfers" description="Move stock between warehouses." /> },
    { path: 'sales/quotations', element: <DocumentListPage title="Quotations" endpoint="/sales/quotations" /> }, { path: 'sales/orders', element: <DocumentListPage title="Sales orders" endpoint="/sales/orders" /> }, { path: 'sales/challans', element: <DocumentListPage title="Delivery challans" endpoint="/sales/challans" /> }, { path: 'sales/invoices', element: <DocumentListPage title="Tax invoices" endpoint="/sales/invoices" createPath="/sales/invoices/new" /> }, { path: 'sales/invoices/new', element: <CreateInvoicePage /> }, { path: 'sales/invoices/:id', element: <DocumentListPage title="Invoice details" endpoint="/sales/invoices" /> },
    { path: 'purchases/orders', element: <DocumentListPage title="Purchase orders" endpoint="/purchases/orders" /> }, { path: 'purchases/grn', element: <DocumentListPage title="Goods receipt notes" endpoint="/purchases/grn" /> }, { path: 'purchases/invoices', element: <DocumentListPage title="Purchase invoices" endpoint="/purchases/invoices" /> },
    { path: 'payments/received', element: <DocumentListPage title="Payments received" endpoint="/payments/received" /> }, { path: 'payments/suppliers', element: <DocumentListPage title="Supplier payments" endpoint="/payments/suppliers" /> },
    { path: 'reports', element: <ReportsPage /> }, { path: 'templates', element: <TemplateDesignerPage /> }, { path: 'settings/organization', element: <SettingsPage /> }, { path: 'settings/users', element: <SettingsPage users /> }, { path: 'audit', element: <AuditLogsPage /> },
  ] },
])
