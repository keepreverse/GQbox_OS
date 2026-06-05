import { useState, useRef, useEffect, useCallback } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Architecture from './components/Architecture';
import ProductMatrix from './components/ProductMatrix';
import SKUConstructor from './components/SKUConstructor';
import DictionaryManager from './components/DictionaryManager';
import KitBuilder from './components/KitBuilder';
import MediaManager from './components/MediaManager';
import AIHub from './components/AIHub';
import type { ViewType, MatrixFilters } from './data/types';
import { LanguageProvider } from './context/LanguageContext';

function getInitialView(): ViewType {
  try {
    const saved = localStorage.getItem('gqbox_view');
    if (saved) {
      const validViews: ViewType[] = ['dashboard', 'architecture', 'matrix', 'sku-constructor', 'dictionary', 'product-detail', 'kit-builder', 'media', 'ai-hub'];
      if (validViews.includes(saved as ViewType)) return saved as ViewType;
    }
  } catch {}
  return 'dashboard';
}

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>(getInitialView);
  const [pendingMatrixFilters, setPendingMatrixFilters] = useState<MatrixFilters | null>(null);
  const viewRef = useRef(currentView);
  viewRef.current = currentView;

  useEffect(() => {
    try { localStorage.setItem('gqbox_view', viewRef.current); } catch {}
  }, [currentView]);

  const navigateToMatrix = useCallback((filters: MatrixFilters) => {
    setPendingMatrixFilters(filters);
    setCurrentView('matrix');
  }, []);

  const handleInitialFiltersApplied = useCallback(() => {
    setPendingMatrixFilters(null);
  }, []);

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} onNavigateToMatrix={navigateToMatrix} />;
      case 'architecture':
        return <Architecture />;
      case 'matrix':
        return <ProductMatrix initialFilters={pendingMatrixFilters} onInitialFiltersApplied={handleInitialFiltersApplied} />;
      case 'sku-constructor':
        return <SKUConstructor />;
      case 'dictionary':
        return <DictionaryManager />;
      case 'kit-builder':
        return <KitBuilder />;
      case 'media':
        return <MediaManager />;
      case 'ai-hub':
        return <AIHub />;
      default:
        return <Dashboard onViewChange={setCurrentView} onNavigateToMatrix={navigateToMatrix} />;
    }
  };

  return (
    <LanguageProvider>
      <Layout currentView={currentView} onViewChange={setCurrentView}>
        {renderView()}
      </Layout>
    </LanguageProvider>
  );
}
