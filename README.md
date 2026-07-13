# FlowLedger UI

React + TypeScript ERP frontend for FlowLedger.

## Stack

- Vite + React + TypeScript
- Tailwind CSS v4
- React Router
- TanStack Query
- React Hook Form + Zod
- Axios (JWT refresh interceptor)
- Recharts, Sonner, Radix/shadcn-style UI

## Quick start

Requires Node 20+:

```bash
nvm use 20
cp .env.example .env
npm install
npm run dev
```

App: http://localhost:5173

Point `VITE_API_BASE_URL` at the API (`http://localhost:8080/api/v1`).

## Features

- Auth: login, forgot/reset password flows
- Responsive ERP shell (collapsible sidebar / mobile drawer)
- Dashboard KPIs + charts
- Masters: customers, suppliers, products, categories, warehouses
- Inventory: stock, ledger, adjustments, transfers
- Sales: quotations, orders, challans, fast invoice entry, preview
- Purchases: PO, GRN, purchase invoices
- Payments received / supplier payments
- Reports hub, invoice template designer, org settings, audit logs

## Build

```bash
npm run build
```
