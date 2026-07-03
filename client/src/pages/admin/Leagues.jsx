import DataTable from '../../components/admin/DataTable.jsx';

export default function Leagues() {
  return (
    <DataTable
      title="Manage Leagues"
      endpoint="/admin/leagues"
      queryKey="admin-leagues"
      columns={[
        { key: 'name', label: 'Name' },
        { key: 'season', label: 'Season' },
        { key: 'type', label: 'Type' },
        { key: 'isWomens', label: "Women's", render: (r) => (r.isWomens ? '✅' : '—') },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? '✅' : '❌') },
        { key: 'teams', label: 'Teams', render: (r) => r._count?.teams ?? '—' },
        { key: 'matches', label: 'Matches', render: (r) => r._count?.matches ?? '—' },
      ]}
      formFields={[
        { key: 'externalId', label: 'External ID (unique)' },
        { key: 'name', label: 'League Name' },
        { key: 'season', label: 'Season (e.g. 2025-2026)' },
        { key: 'type', label: 'Type (league/cup/international)' },
        { key: 'isWomens', label: "Women's League", type: 'checkbox' },
        { key: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
