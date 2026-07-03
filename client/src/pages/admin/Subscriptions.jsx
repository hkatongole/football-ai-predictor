import DataTable from '../../components/admin/DataTable.jsx';

export default function Subscriptions() {
  return (
    <DataTable
      title="Manage Subscription Plans"
      endpoint="/admin/subscription-plans"
      queryKey="admin-plans"
      columns={[
        { key: 'name', label: 'Plan' },
        { key: 'priceMonthly', label: 'Monthly ($)' },
        { key: 'priceYearly', label: 'Yearly ($)' },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? '✅' : '❌') },
      ]}
      formFields={[
        { key: 'name', label: 'Plan Name' },
        { key: 'priceMonthly', label: 'Monthly Price', type: 'number' },
        { key: 'priceYearly', label: 'Yearly Price', type: 'number' },
        { key: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
