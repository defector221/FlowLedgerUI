import { transportApi } from '@/services/api'
import { TransportMasterPage } from './TransportMasterPage'

export function TransportDriversPage() {
  return (
    <TransportMasterPage
      title="Drivers"
      singular="Driver"
      api={transportApi.drivers as never}
      initial={{
        name: '',
        licenseNumber: '',
        licenseExpiry: '',
        mobile: '',
        emergencyContact: '',
        currentStatus: 'AVAILABLE',
      }}
      fields={[
        { key: 'name', label: 'Driver name', required: true },
        { key: 'licenseNumber', label: 'License number', required: true },
        { key: 'licenseExpiry', label: 'License expiry' },
        { key: 'mobile', label: 'Mobile' },
        { key: 'emergencyContact', label: 'Emergency contact' },
        { key: 'currentStatus', label: 'Status', options: ['AVAILABLE', 'ON_TRIP', 'INACTIVE'] },
      ]}
      columns={[
        { key: 'name', label: 'NAME' },
        { key: 'licenseNumber', label: 'LICENSE' },
        { key: 'licenseExpiry', label: 'EXPIRY' },
        { key: 'mobile', label: 'MOBILE' },
        { key: 'currentStatus', label: 'STATUS' },
      ]}
    />
  )
}
