import { StatsPanel } from '../components/StatsPanel';
import { DealList } from '../components/DealList';

export function DashboardPage() {
  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <div className="subtitle">Live deal feed · Kleinanzeigen</div>
        </div>
      </div>

      <StatsPanel />
      <DealList />
    </div>
  );
}
