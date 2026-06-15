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
import { DevModeProvider, useDevMode } from '@context/DevModeContext';
import { AuthProvider, useAuth } from '@context/AuthContext';
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
const UserManager = lazy(() => import('@features/admin/UserManager'));
const LoginPage = lazy(() => import('@features/login/LoginPage'));

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
        'administration',
      ];
      if (validViews.includes(saved as ViewType) && saved !== 'db-inspector' && saved !== 'administration') {
        return saved as ViewType;
      }
    }
  } catch {}
  return 'dashboard';
}

function AppContent() {
  const status = useDataSourceStatus();
  const { isLoading: authLoading, isAuthenticated, isAdmin } = useAuth();
  const { devMode, setDevMode } = useDevMode();
  const [currentView, setCurrentView] = useState<ViewType>(getInitialView);
  const [pendingMatrixFilters, setPendingMatrixFilters] = useState<MatrixFilters | null>(null);
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [showDevFallback, setShowDevFallback] = useState(false);
  const [loaderExiting, setLoaderExiting] = useState(false);
  const [showLoader, setShowLoader] = useState(true);
  const [, startViewTransition] = useTransition();
  const prevAuth = useRef(isAuthenticated);
  const [authTransition, setAuthTransition] = useState(false);
  const [loginPageExiting, setLoginPageExiting] = useState(false);
  const [layoutExiting, setLayoutExiting] = useState(false);
  const initialAuthChecked = useRef(false);

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

  // Non-admin users cannot access dev mode. If somehow dev mode is active
  // (e.g. leftover localStorage), force it back to demo.
  useEffect(() => {
    if (isAuthenticated && !isAdmin && devMode) {
      setDevMode(false);
    }
  }, [isAuthenticated, isAdmin, devMode, setDevMode]);

  // Mark the initial auth check as done once fetchMe has finished. Transition
  // animations (login page fade-out / layout fade-out) should only start after
  // this point — otherwise a page reload with an existing session would be
  // mistaken for a fresh login and play the login-page exit animation.
  useEffect(() => {
    if (!authLoading) {
      initialAuthChecked.current = true;
    }
  }, [authLoading]);

  // Post-login preloader: hold FullScreenLoader for 1.5s after auth.
  // Detected synchronously in render so the first paint already shows the loader.
  // The login page is kept mounted during a short fade-out so it does not
  // disappear abruptly before the loader appears.
  if (initialAuthChecked.current && isAuthenticated && !prevAuth.current && !loginPageExiting && !authTransition) {
    setLoginPageExiting(true);
  }
  if (initialAuthChecked.current && !isAuthenticated && prevAuth.current && !layoutExiting) {
    setLayoutExiting(true);
  }
  prevAuth.current = isAuthenticated;

  // After the login page fades out, show the post-login loader.
  useEffect(() => {
    if (!loginPageExiting) return;
    const timer = setTimeout(() => {
      setLoginPageExiting(false);
      setAuthTransition(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [loginPageExiting]);

  useEffect(() => {
    if (!authTransition) return;
    const timer = setTimeout(() => setAuthTransition(false), 1500);
    return () => clearTimeout(timer);
  }, [authTransition]);

  // After the authenticated layout fades out, switch straight to the login
  // page without a post-logout preloader — the preloader layer was too brief
  // to read as a deliberate transition step.
  useEffect(() => {
    if (!layoutExiting) return;
    const timer = setTimeout(() => setLayoutExiting(false), 300);
    return () => clearTimeout(timer);
  }, [layoutExiting]);

  // Redirect non-admin away from admin-only views.
  useEffect(() => {
    if (isAuthenticated && !isAdmin && (currentView === 'db-inspector' || currentView === 'administration')) {
      setCurrentView('dashboard');
    }
  }, [isAuthenticated, isAdmin, currentView]);

  useEffect(() => {
    try {
      if (currentView !== 'db-inspector' && currentView !== 'administration') {
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
      case 'administration':
        return <UserManager />;
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

  const contentShown = minSplashDone && status.isReady && !authLoading && !authTransition;
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

  // During the very first auth check (page reload), keep a single loader on
  // screen. This avoids showing the login page / Suspense fallback only to
  // immediately swap it for the authenticated layout.
  if ((authLoading || !initialAuthChecked.current) && !loginPageExiting && !authTransition && !layoutExiting) {
    return <FullScreenLoader exiting={false} devError={null} />;
  }

  // Login flow: render the login page when the user is not authenticated, and
  // keep it mounted during the fade-out phase so it does not remount and replay
  // its entrance animation. A loader overlay fades in while the page fades out,
  // then stays visible during the post-login loader phase.
  if ((!isAuthenticated && !layoutExiting) || loginPageExiting || authTransition) {
    const showLoaderOverlay = loginPageExiting || authTransition;
    return (
      <>
        <div
          className={`fixed inset-0 z-[9998] ${showLoaderOverlay ? 'pointer-events-none' : ''} ${loginPageExiting ? 'animate-auth-fade-out' : ''}`}
          style={{ opacity: authTransition && !loginPageExiting ? 0 : undefined }}
        >
          <Suspense fallback={<FullScreenLoader exiting={false} devError={null} />}>
            <LoginPage />
          </Suspense>
        </div>
        {showLoaderOverlay && (
          <div className="animate-fade-in-fast fixed inset-0 z-[9999]">
            <FullScreenLoader exiting={false} devError={null} />
          </div>
        )}
      </>
    );
  }

  // Authenticated flow: render the layout when the user is authenticated, and
  // keep it mounted during the fade-out phase so open modals (e.g. settings)
  // disappear smoothly together with the rest of the content. Once the fade-out
  // completes, the login page is rendered directly without an extra preloader.
  const shouldAnimateEntrance = !everShown.current && !layoutExiting;
  if ((isAuthenticated && !loginPageExiting && !authTransition) || layoutExiting) {
    return (
      <>
        {showLoader && !layoutExiting && (
          <FullScreenLoader
            exiting={loaderExiting}
            devError={status.mode === 'dev' && showDevFallback ? status.error : null}
          />
        )}

        {(contentShown || layoutExiting) && (
          <div
            className={`${shouldAnimateEntrance ? 'animate-initial-fade' : ''} ${layoutExiting ? 'animate-auth-fade-out pointer-events-none' : ''}`}
          >
            <Layout currentView={currentView} onViewChange={handleViewChange}>
              {layoutChildren}
            </Layout>
          </div>
        )}
      </>
    );
  }

  // Fallback: should never be reached, but keeps TypeScript happy and avoids
  // a blank screen if state ever becomes inconsistent.
  return (
    <Suspense fallback={<FullScreenLoader exiting={false} devError={null} />}>
      <LoginPage />
    </Suspense>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <DevModeProvider>
        <AuthProvider>
          <DataSourceProvider>
            <AppContent />
          </DataSourceProvider>
        </AuthProvider>
      </DevModeProvider>
    </LanguageProvider>
  );
}
