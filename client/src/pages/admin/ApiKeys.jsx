import DataTable from '../../components/admin/DataTable.jsx';

export default function ApiKeys() {
  return (
    <DataTable
      title="Manage API Keys"
      endpoint="/admin/api-keys"
      queryKey="admin-api-keys"
      columns={[
        { key: 'provider', label: 'Provider' },
        { key: 'label', label: 'Label' },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? '✅' : '❌') },
        { key: 'createdAt', label: 'Added', render: (r) => new Date(r.createdAt).toLocaleDateString() },
      ]}
      formFields={[
        { key: 'provider', label: 'Provider (SOCCERDATA/STRIPE/FCM)' },
        { key: 'label', label: 'Label' },
        { key: 'keyValue', label: 'Key Value' },
        { key: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
