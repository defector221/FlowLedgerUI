import { transportApi } from '@/services/api'
import { TransportMasterPage } from './TransportMasterPage'

export function TransportVehiclesPage() {
  return (
    <TransportMasterPage
      title="Vehicles"
      singular="Vehicle"
      api={transportApi.vehicles as never}
      initial={{
        vehicleNumber: '',
        vehicleType: '',
        ownership: 'SELF',
        capacity: '',
        capacityUnit: 'KG',
        currentStatus: 'AVAILABLE',
      }}
      fields={[
        { key: 'vehicleNumber', label: 'Vehicle number', required: true },
        { key: 'vehicleType', label: 'Vehicle type', required: true },
        { key: 'ownership', label: 'Ownership', options: ['SELF', 'THIRD_PARTY'] },
        { key: 'capacity', label: 'Capacity' },
        { key: 'capacityUnit', label: 'Capacity unit' },
        { key: 'currentStatus', label: 'Status', options: ['AVAILABLE', 'IN_TRANSIT', 'MAINTENANCE', 'INACTIVE'] },
      ]}
      columns={[
        { key: 'vehicleNumber', label: 'VEHICLE' },
        { key: 'vehicleType', label: 'TYPE' },
        { key: 'ownership', label: 'OWNERSHIP' },
        { key: 'capacity', label: 'CAPACITY' },
        { key: 'currentStatus', label: 'STATUS' },
      ]}
    />
  )
}
