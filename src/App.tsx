import { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Architecture from './components/Architecture';
import ProductMatrix from './components/ProductMatrix';
import SKUConstructor from './components/SKUConstructor';
import DictionaryManager from './components/DictionaryManager';
import KitBuilder from './components/KitBuilder';
import MediaManager from './components/MediaManager';
import AIHub from './components/AIHub';
import type { ViewType } from './data/types';
import { LanguageProvider } from './context/LanguageContext';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');

  const renderView = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard onViewChange={setCurrentView} />;
      case 'architecture':
        return <Architecture />;
      case 'matrix':
        return <ProductMatrix />;
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
        return <Dashboard onViewChange={setCurrentView} />;
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
