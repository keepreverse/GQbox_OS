import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from 'react';
import Layout from '@components/layout/Layout';
import FullScreenLoader from '@components/ui/FullScreenLoader';
import type { ViewType, MatrixFilters } from '@app-types';
import { LanguageProvider } from '@context/LanguageContext';
import { DevModeProvider } from '@context/DevModeContext';
import { DataSourceProvider, useDataSourceStatus } from '@api/dataSourceContext';

const Dashboard = lazy(() => import('@features/dashboard/Dashboard'));
const Architecture = lazy(() => import('@features/architecture/Architecture'));
const ProductMatrix = lazy(() => import('@features/product-matrix/ProductMatrix'));
const SKUConstructor = lazy(() => import('@features/sku-constructor/SKUConstructor'));
const DictionaryManager = lazy(() => import('@features/dictionary/DictionaryManager'));
const KitBuilder = lazy(() => import('@features/kit-builder/KitBuilder'));
const MediaManager = lazy(() => import('@features/media/MediaManager'));
const AIHub = lazy(() => import('@features/ai-hub/AIHub'));
const DBInspector = lazy(() => import('@features/db-inspector/DBInspector'));

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
        'db-inspector',
      ];
      if (validViews.includes(saved as ViewType) && saved !== 'db-inspector') {
        return saved as ViewType;
      }
    }
  } catch {}
  return 'dashboard';
}

function AppContent() {
  const status = useDataSourceStatus();
  const [currentView, setCurrentView] = useState<ViewType>(getInitialView);
  const [pendingMatrixFilters, setPendingMatrixFilters] = useState<MatrixFilters | null>(null);
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [showDevFallback, setShowDevFallback] = useState(false);
  const [loaderExiting, setLoaderExiting] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [, startViewTransition] = useTransition();

  useEffect(() => {
    const timer = setTimeout(() => setMinSplashDone(true), 2200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (status.mode !== 'dev' || !status.error) {
      setShowDevFallback(false);
      return;
    }
    const timer = setTimeout(() => setShowDevFallback(true), 5000);
    return () => clearTimeout(timer);
  }, [status.error, status.mode]);

  useEffect(() => {
    try {
      if (currentView !== 'db-inspector') {
        localStorage.setItem('gqbox_view', currentView);
      }
    } catch {}
  }, [currentView]);

  const handleViewChange = useCallback((view: ViewType) => {
    startViewTransition(() => {
      setCurrentView(view);
    });
  }, []);

  const navigateToMatrix = useCallback((filters: MatrixFilters) => {
    setPendingMatrixFilters(filters);
    handleViewChange('matrix');
  }, [handleViewChange]);

  const handleInitialFiltersApplied = useCallback(() => {
    setPendingMatrixFilters(null);
  }, []);

  const viewContent = useMemo(() => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={handleViewChange} onNavigateToMatrix={navigateToMatrix} />;
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
      case 'db-inspector':
        return <DBInspector />;
      default:
        return <Dashboard onViewChange={handleViewChange} onNavigateToMatrix={navigateToMatrix} />;
    }
  }, [currentView, pendingMatrixFilters, handleViewChange, navigateToMatrix, handleInitialFiltersApplied]);

  // Мемоизируем children отдельно, чтобы Layout не ре-рендерился
  // при каждой перерисовке AppContent (например, при isRefreshing).
  const layoutChildren = useMemo(
    () => <Suspense fallback={null}>{viewContent}</Suspense>,
    [viewContent]
  );

  const contentShown = minSplashDone && status.isReady;
  const everShown = useRef(false);

  useEffect(() => {
    if (contentShown) everShown.current = true;
  }, [contentShown]);

  useEffect(() => {
    if (!contentShown) {
      setShowLoader(true);
      setLoaderExiting(false);
    } else if (showLoader) {
      setLoaderExiting(true);
      const timer = setTimeout(() => setShowLoader(false), 550);
      return () => clearTimeout(timer);
    }
  }, [contentShown, showLoader]);

  return (
    <>
      {showLoader && (
        <FullScreenLoader
          exiting={loaderExiting}
          devError={status.mode === 'dev' && showDevFallback ? status.error : null}
        />
      )}

      {contentShown && (
        <div className={everShown.current ? undefined : 'animate-initial-fade'}>
          <Layout currentView={currentView} onViewChange={handleViewChange}>
            {layoutChildren}
          </Layout>
        </div>
      )}
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <DevModeProvider>
        <DataSourceProvider>
          <AppContent />
        </DataSourceProvider>
      </DevModeProvider>
    </LanguageProvider>
  );
}
