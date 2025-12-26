import React from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { LeadManagement } from './components/LeadManagement';
import { RouteOptimizer } from './components/RouteOptimizer';
import { LeadDetail } from './components/LeadDetail';

const App: React.FC = () => {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="leads" element={<LeadManagement />} />
          <Route path="leads/:id" element={<LeadDetail />} />
          <Route path="route" element={<RouteOptimizer />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </HashRouter>
  );
};

export default App;
