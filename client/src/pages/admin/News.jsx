import DataTable from '../../components/admin/DataTable.jsx';

export default function News() {
  return (
    <DataTable
      title="Manage News & Blogs"
      endpoint="/admin/news"
      queryKey="admin-news"
      columns={[
        { key: 'title', label: 'Title' },
        { key: 'slug', label: 'Slug' },
        { key: 'published', label: 'Published', render: (r) => (r.published ? '✅' : '📝 Draft') },
        { key: 'createdAt', label: 'Created', render: (r) => new Date(r.createdAt).toLocaleDateString() },
      ]}
      formFields={[
        { key: 'title', label: 'Title' },
        { key: 'slug', label: 'Slug (unique, e.g. my-article)' },
        { key: 'body', label: 'Body' },
        { key: 'imageUrl', label: 'Image URL' },
        { key: 'published', label: 'Published', type: 'checkbox' },
      ]}
    />
  );
}
