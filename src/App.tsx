import { useState, useRef, useEffect, useCallback } from 'react';
import Layout from '@components/layout/Layout';
import Dashboard from '@features/dashboard/Dashboard';
import Architecture from '@features/architecture/Architecture';
import ProductMatrix from '@features/product-matrix/ProductMatrix';
import SKUConstructor from '@features/sku-constructor/SKUConstructor';
import DictionaryManager from '@features/dictionary/DictionaryManager';
import KitBuilder from '@features/kit-builder/KitBuilder';
import MediaManager from '@features/media/MediaManager';
import AIHub from '@features/ai-hub/AIHub';
import type { ViewType, MatrixFilters } from '@app-types';
import { LanguageProvider } from '@context/LanguageContext';

function getInitialView(): ViewType {
  try {
    const saved = localStorage.getItem('gqbox_view');
    if (saved) {
      const validViews: ViewType[] = [
        'dashboard',
        'architecture',
        'matrix',
        'sku-constructor',
        'dictionary',
        'product-detail',
        'kit-builder',
        'media',
        'ai-hub',
      ];
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
    try {
      localStorage.setItem('gqbox_view', viewRef.current);
    } catch {}
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
        return (
          <ProductMatrix
            initialFilters={pendingMatrixFilters}
            onInitialFiltersApplied={handleInitialFiltersApplied}
          />
        );
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
