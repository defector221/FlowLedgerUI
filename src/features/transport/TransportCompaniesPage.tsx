import { transportApi } from '@/services/api'
import { TransportMasterPage } from './TransportMasterPage'

export function TransportCompaniesPage() {
  return (
    <TransportMasterPage
      title="Transport companies"
      singular="Company"
      api={transportApi.companies as never}
      initial={{ name: '', code: '', phone: '', email: '', city: '', state: '', status: 'ACTIVE' }}
      fields={[
        { key: 'name', label: 'Company name', required: true },
        { key: 'code', label: 'Code', required: true },
        { key: 'phone', label: 'Phone' },
        { key: 'email', label: 'Email' },
        { key: 'city', label: 'City' },
        { key: 'state', label: 'State' },
        { key: 'status', label: 'Status', options: ['ACTIVE', 'INACTIVE'] },
      ]}
      columns={[
        { key: 'code', label: 'CODE' },
        { key: 'name', label: 'NAME' },
        { key: 'phone', label: 'PHONE' },
        { key: 'city', label: 'CITY' },
        { key: 'status', label: 'STATUS' },
      ]}
    />
  )
}
