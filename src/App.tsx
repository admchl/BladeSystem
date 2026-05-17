import { useState } from 'react';
import './styles/global.css';
import './styles/sidebar.css';
import './styles/components.css';

import { Sidebar, Page } from './components/Sidebar';
import { Header } from './components/Header';

import { Dashboard } from './pages/Dashboard';
import { QuickFix } from './pages/QuickFix';
import { Optimizer } from './pages/Optimizer';
import { Cleaner } from './pages/Cleaner';
import { Triggers } from './pages/Triggers';
import { Automation } from './pages/Automation';
import { Startup } from './pages/Startup';
import { Processes } from './pages/Processes';
import { Setup } from './pages/Setup';
import { Backup } from './pages/Backup';
import { Network } from './pages/Network';
import { Hardware } from './pages/Hardware';
import { Repair } from './pages/Repair';
import { Settings } from './pages/Settings';

const pageMap: Record<Page, React.ReactNode> = {
  dashboard:  <Dashboard />,
  quickfix:   <QuickFix />,
  optimizer:  <Optimizer />,
  cleaner:    <Cleaner />,
  triggers:   <Triggers />,
  automation: <Automation />,
  startup:    <Startup />,
  processes:  <Processes />,
  setup:      <Setup />,
  backup:     <Backup />,
  network:    <Network />,
  hardware:   <Hardware />,
  repair:     <Repair />,
  settings:   <Settings />,
};

export default function App() {
  const [page, setPage] = useState<Page>('dashboard');

  return (
    <div className="app-layout">
      <Header />
      <div className="app-body">
        <Sidebar active={page} onChange={setPage} />
        <main className="main-content">
          {pageMap[page]}
        </main>
      </div>
    </div>
  );
}
