import React, { useState, useEffect } from 'react';
import { QuoteProvider, useQuote } from './context/QuoteContext';
import { supabase } from './services/supabaseClient';
import { SavedQuote, Product, UnitType, DeliveryType } from './types';

// Components
import Login from './components/Login';
import Header from './components/Header';
import Dashboard from './components/Dashboard';
import QuoteWizard from './components/QuoteWizard';
import AdminPanel from './components/AdminPanel';
import AIQueue from './components/AIQueue';

type ViewState = 'home' | 'stepper' | 'admin' | 'ai-queue';

const AppContent: React.FC = () => {
  const { resetQuote, setProducts, setInfo, goToStep } = useQuote();

  const [isLoggedIn, setIsLoggedIn] = useState(() => localStorage.getItem('isLoggedIn') === 'true');
  const [currentView, setCurrentView] = useState<ViewState>('home');
  const [adminTab, setAdminTab] = useState<'quotes' | 'catalog'>('quotes');

  // Data State
  const [history, setHistory] = useState<SavedQuote[]>([]);
  const [catalog, setCatalog] = useState<Product[]>([]);
  const [pendingItems, setPendingItems] = useState<any[]>([]);

  // Load Data Effect
  useEffect(() => {
    if (isLoggedIn) {
      loadData();
    }
  }, [isLoggedIn]);

  const loadData = async () => {
    // History
    const { data: quotesData } = await supabase.from('quotes').select('*').order('created_at', { ascending: false });
    if (quotesData) {
      setHistory(quotesData.map(q => ({ ...q.products_data, id: q.id })));
    }

    // Catalog
    const { data: productsData } = await supabase.from('products').select('*');
    if (productsData) {
      setCatalog(productsData.map(p => ({
        id: p.id,
        name: p.name,
        brand: p.brand || '',
        description: p.description || '',
        unit: (p.unit as UnitType) || 'u',
        netPrice: p.net_price || 0,
        deliveryType: (p.delivery_type as DeliveryType) || 'immediate',
        deliveryDays: p.delivery_days || 0,
        category: p.category || '', // Added Category
        sku: p.sku || '', // Added SKU
        quantity: 1
      })));
    }

    // Pending
    fetchPending();
  };

  const fetchPending = async () => {
    const { data } = await supabase.from('pending_products').select('*').eq('status', 'pending');
    if (data) setPendingItems(data);
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    localStorage.setItem('isLoggedIn', 'true');
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    localStorage.removeItem('isLoggedIn');
    setCurrentView('home');
  };

  // Actions
  const startNewQuote = () => {
    resetQuote();
    setCurrentView('stepper');
  };

  const openAdmin = (tab: 'quotes' | 'catalog') => {
    setAdminTab(tab);
    setCurrentView('admin');
  };

  const handleReopenQuote = (quote: SavedQuote) => {
    if (confirm("¿Deseas cargar esta cotización? Esto reemplazará la sesión actual.")) {
      setProducts(quote.products);
      setInfo(quote.info);
      setCurrentView('stepper');
      goToStep(3); // Jump to adjustment
    }
  };

  const handleDeleteQuote = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Seguro que deseas eliminar esta cotización del historial?")) {
      const { error } = await supabase.from('quotes').delete().eq('id', id);
      if (!error) {
        setHistory(prev => prev.filter(q => q.id !== id));
      } else {
        alert("Error al eliminar.");
      }
    }
  };

  // Catalog Actions
  const handleDeleteProduct = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Seguro que deseas eliminar este producto del catálogo?")) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (!error) {
        setCatalog(prev => prev.filter(p => p.id !== id));
      } else {
        alert("Error al eliminar producto.");
      }
    }
  };

  const handleEditProduct = async (product: Product) => {
    // Logic to update product in DB
    // We assume product object has the updated fields
    const { error } = await supabase.from('products').update({
      name: product.name,
      brand: product.brand,
      description: product.description,
      unit: product.unit,
      net_price: product.netPrice,
      delivery_type: product.deliveryType,
      delivery_days: product.deliveryDays,
      category: product.category,
      sku: product.sku
    }).eq('id', product.id);

    if (!error) {
      setCatalog(prev => prev.map(p => p.id === product.id ? product : p));
      alert("Producto actualizado correctamente.");
    } else {
      alert("Error al actualizar producto.");
    }
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col font-sans text-slate-900 antialiased">
      {/* Global Header (hidden in Stepper) */}
      {currentView !== 'stepper' && (
        <Header onGoHome={() => setCurrentView('home')} onLogout={handleLogout} />
      )}

      <main className={currentView === 'stepper' ? 'h-screen' : 'flex-grow max-w-7xl w-full mx-auto px-4 py-12 flex flex-col'}>

        {currentView === 'home' && (
          <Dashboard
            onStartNewQuote={startNewQuote}
            onOpenAdmin={openAdmin}
            onOpenAIQueue={() => setCurrentView('ai-queue')}
            pendingCount={pendingItems.length}
          />
        )}

        {currentView === 'stepper' && (
          <QuoteWizard
            onExit={() => {
              loadData(); // Refresh history
              setCurrentView('home');
            }}
          />
        )}

        {currentView === 'admin' && (
          <AdminPanel
            activeTab={adminTab}
            setActiveTab={setAdminTab}
            history={history}
            catalog={catalog}
            onBack={() => setCurrentView('home')}
            onReopenQuote={handleReopenQuote}
            onDeleteQuote={handleDeleteQuote}
            onDeleteProduct={handleDeleteProduct}
            onEditProduct={handleEditProduct}
          />
        )}

        {currentView === 'ai-queue' && (
          <AIQueue
            items={pendingItems}
            onRefresh={fetchPending}
            onBack={() => setCurrentView('home')}
          />
        )}

      </main>
    </div>
  );
};

export default function App() {
  return (
    <QuoteProvider>
      <AppContent />
    </QuoteProvider>
  );
}
