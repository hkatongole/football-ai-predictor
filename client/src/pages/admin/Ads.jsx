import DataTable from '../../components/admin/DataTable.jsx';

export default function Ads() {
  return (
    <DataTable
      title="Manage Advertisements"
      endpoint="/admin/ads"
      queryKey="admin-ads"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'placement', label: 'Placement' },
        { key: 'isActive', label: 'Active', render: (r) => (r.isActive ? '✅' : '❌') },
      ]}
      formFields={[
        { key: 'title', label: 'Title' },
        { key: 'imageUrl', label: 'Image URL' },
        { key: 'linkUrl', label: 'Link URL' },
        { key: 'placement', label: 'Placement (HOME_BANNER/SIDEBAR/INTERSTITIAL)' },
        { key: 'isActive', label: 'Active', type: 'checkbox' },
      ]}
    />
  );
}
