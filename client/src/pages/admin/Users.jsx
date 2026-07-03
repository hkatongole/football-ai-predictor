import DataTable from '../../components/admin/DataTable.jsx';

export default function Users() {
  return (
    <DataTable
      title="Manage Users"
      endpoint="/admin/users"
      queryKey="admin-users"
      canCreate={false}
      columns={[
        { key: 'email', label: 'Email' },
        { key: 'username', label: 'Username' },
        { key: 'role', label: 'Role', render: (r) => r.role?.name },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? '✅' : '❌') },
        { key: 'isPremium', label: 'Premium', render: (r) => (r.isPremium ? '⭐' : '—') },
      ]}
      formFields={[
        { key: 'isActive', label: 'Active', type: 'checkbox' },
        { key: 'isPremium', label: 'Premium', type: 'checkbox' },
      ]}
    />
  );
}
