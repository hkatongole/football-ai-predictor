import DataTable from '../../components/admin/DataTable.jsx';

export default function Fixtures() {
  return (
    <DataTable
      title="Manage Fixtures"
      endpoint="/admin/fixtures"
      queryKey="admin-fixtures"
      columns={[
        { key: 'league', label: 'League', render: (r) => r.league?.name },
        { key: 'homeTeam', label: 'Home', render: (r) => r.homeTeam?.name },
        { key: 'awayTeam', label: 'Away', render: (r) => r.awayTeam?.name },
        { key: 'kickoff', label: 'Kickoff', render: (r) => new Date(r.kickoff).toLocaleString() },
        { key: 'status', label: 'Status' },
        { key: 'score', label: 'Score', render: (r) => (r.homeScore != null ? `${r.homeScore} - ${r.awayScore}` : '—') },
      ]}
      formFields={[
        { key: 'externalId', label: 'External ID (unique)' },
        { key: 'leagueId', label: 'League ID (numeric)' },
        { key: 'homeTeamId', label: 'Home Team ID (numeric)' },
        { key: 'awayTeamId', label: 'Away Team ID (numeric)' },
        { key: 'kickoff', label: 'Kickoff (ISO datetime)' },
        { key: 'status', label: 'Status (SCHEDULED/LIVE/FINISHED...)' },
        { key: 'homeScore', label: 'Home Score', type: 'number' },
        { key: 'awayScore', label: 'Away Score', type: 'number' },
      ]}
    />
  );
}
