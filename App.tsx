
import React, { useState, useRef, useEffect } from 'react';
import { Product, QuoteInfo, UnitType, ProductData, ExtractionResult, DeliveryType, SavedQuote } from './types';
import { extractProductInfo } from './services/geminiService';
import { generateQuotePDF } from './services/pdfService';
import {
  PlusIcon,
  TrashIcon,
  SparklesIcon,
  DocumentArrowDownIcon,
  CalculatorIcon,
  UserIcon,
  BuildingOfficeIcon,
  EnvelopeIcon,
  XMarkIcon,
  CheckCircleIcon,
  IdentificationIcon,
  BriefcaseIcon,
  ArrowUpTrayIcon,
  CameraIcon,
  MagnifyingGlassIcon,
  DocumentIcon,
  ClockIcon,
  TruckIcon
} from '@heroicons/react/24/outline';

const IVA_RATE = 0.19;

const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [pendingProducts, setPendingProducts] = useState<ProductData[] | null>(null);
  const [stagedFile, setStagedFile] = useState<{ data: string, type: string, name: string } | null>(null);
  const [info, setInfo] = useState<QuoteInfo>({
    customerName: '',
    customerEmail: '',
    customerCompany: '',
    customerRut: '',
    customerGiro: '',
    quoteNumber: `COT-${Math.floor(1000 + Math.random() * 9000)}`,
    date: new Date().toLocaleDateString('es-CL'),
    ivaRate: IVA_RATE
  });

  const [history, setHistory] = useState<SavedQuote[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Load history from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('inprotar_quotes_history');
    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch (e) {
        console.error("Error loading history", e);
      }
    }
  }, []);

  // Sync history to localStorage
  useEffect(() => {
    localStorage.setItem('inprotar_quotes_history', JSON.stringify(history));
  }, [history]);

  const saveToHistory = () => {
    if (products.length === 0) {
      alert("No hay productos para guardar.");
      return;
    }
    const newSavedQuote: SavedQuote = {
      id: Math.random().toString(36).substr(2, 9),
      quoteNumber: info.quoteNumber,
      customerName: info.customerName || 'Sin Nombre',
      customerCompany: info.customerCompany || 'Sin Empresa',
      date: info.date,
      products: [...products],
      info: { ...info },
      total: total
    };
    setHistory(prev => [newSavedQuote, ...prev]);
    alert("Cotización guardada en el historial.");
  };

  const loadFromHistory = (quote: SavedQuote) => {
    if (confirm("¿Deseas cargar esta cotización? Esto reemplazará la sesión actual.")) {
      setProducts(quote.products);
      setInfo(quote.info);
      setShowHistory(false);
    }
  };

  const deleteFromHistory = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm("¿Seguro que deseas eliminar esta cotización del historial?")) {
      setHistory(prev => prev.filter(q => q.id !== id));
    }
  };

  const startNewQuote = () => {
    if (products.length > 0 && confirm("¿Deseas iniciar una nueva cotización? Se perderán los cambios no guardados.")) {
      setProducts([]);
      setInfo({
        customerName: '',
        customerEmail: '',
        customerCompany: '',
        customerRut: '',
        customerGiro: '',
        quoteNumber: `COT-${Math.floor(1000 + Math.random() * 9000)}`,
        date: new Date().toLocaleDateString('es-CL'),
        ivaRate: IVA_RATE
      });
    }
  };

  const netTotal = products.reduce((sum, p) => sum + (p.quantity * (p.netPrice || 0)), 0);
  const iva = netTotal * IVA_RATE;
  const total = netTotal + iva;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setStagedFile({
        data: event.target?.result as string,
        type: file.type,
        name: file.name
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleIAAnalysis = async () => {
    if (!stagedFile) return;
    setLoading(true);
    try {
      const result: ExtractionResult = await extractProductInfo(stagedFile.data, stagedFile.type);
      if (result.products.length === 0) {
        alert("No se detectaron productos claros.");
      } else if (result.products.length === 1 && !result.multipleModelsFound) {
        addProductFromData(result.products[0]);
      } else {
        setPendingProducts(result.products);
      }
      setStagedFile(null);
    } catch (err) {
      console.error(err);
      alert("Error al analizar el archivo.");
    } finally {
      setLoading(false);
    }
  };

  const addProductFromData = (data: ProductData) => {
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: data.specDetails ? `${data.name} (${data.specDetails})` : data.name,
      brand: 'Inprotar',
      description: data.description,
      quantity: 1,
      unit: data.suggestedUnit,
      netPrice: 0,
      deliveryType: 'immediate',
      deliveryDays: 0
    };
    setProducts(prev => [...prev, newProduct]);
    setPendingProducts(null);
  };

  const addEmptyProduct = () => {
    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      brand: 'Inprotar',
      description: '',
      quantity: 1,
      unit: 'u',
      netPrice: 0,
      deliveryType: 'immediate',
      deliveryDays: 0
    };
    setProducts(prev => [...prev, newProduct]);
  };

  const updateProduct = (id: string, updates: Partial<Product>) => {
    setProducts(prev => prev.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const removeProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleDownloadPDF = async () => {
    if (products.length === 0) {
      alert("Agregue al menos un producto.");
      return;
    }
    if (!info.customerName || !info.customerCompany) {
      alert("Complete los datos del cliente.");
      return;
    }
    await generateQuotePDF(products, info);
    saveToHistory();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col antialiased">
      {/* Modal Variantes */}
      {pendingProducts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-blue-700 text-white">
              <h3 className="text-xl font-bold">Variantes Detectadas</h3>
              <button onClick={() => setPendingProducts(null)}><XMarkIcon className="w-6 h-6" /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-3 bg-slate-50">
              {pendingProducts.map((p, i) => (
                <button key={i} onClick={() => addProductFromData(p)} className="w-full text-left p-4 bg-white border rounded-2xl hover:border-blue-500 transition-all flex justify-between items-center group">
                  <div>
                    <span className="text-[10px] font-bold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">{p.specDetails || 'Estándar'}</span>
                    <h4 className="font-bold text-slate-900">{p.name}</h4>
                    <p className="text-[10px] text-slate-500 italic mt-1">{p.description}</p>
                  </div>
                  <CheckCircleIcon className="w-6 h-6 text-slate-200 group-hover:text-blue-600 transition-colors" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-slate-900 text-white border-b-4 border-blue-600 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-4">
            <img
              src="https://inprotar.cl/wp-content/uploads/2024/06/LOGO-fondo-oscuro2.png"
              alt="Inprotar"
              className="h-10 w-auto object-contain cursor-pointer"
            />
            <div className="h-8 w-px bg-slate-700 mx-2 hidden md:block"></div>
            <span className="text-xl font-black tracking-widest text-blue-500 uppercase">Cotizador <span className="text-white/20 ml-2 font-mono text-[10px] tracking-normal">Premium v2.0</span></span>
          </div>
          <div className="flex items-center gap-6">
            <div className="text-right border-r border-slate-700 pr-6 hidden lg:block">
              <p className="text-[10px] text-slate-500 uppercase font-black">Nº de Documento</p>
              <p className="text-sm font-mono text-white font-bold">{info.quoteNumber}</p>
            </div>

            <button
              onClick={() => setShowHistory(true)}
              className="hidden lg:flex items-center gap-3 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 px-4 py-2 rounded-xl border border-blue-600/30 transition-all group"
            >
              <ClockIcon className="w-5 h-5 group-hover:rotate-[-20deg] transition-transform" />
              <div className="text-left">
                <p className="text-[9px] font-black uppercase leading-none mb-0.5">Historial</p>
                <p className="text-[10px] font-bold text-white leading-none">Ver Cotizaciones</p>
              </div>
            </button>
          </div>
        </div>
      </header>

      <main className="flex-grow max-w-7xl w-full mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Sidebar */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-24 max-h-screen lg:overflow-y-auto no-scrollbar pb-8 order-2 lg:order-1">
          <section className="bg-white rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-200 p-6 lg:p-8">
            <h2 className="text-[10px] font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-2">
              <div className="bg-blue-100 p-1.5 rounded-lg">
                <UserIcon className="w-3.5 h-3.5 text-blue-600" />
              </div>
              Información Cliente
            </h2>
            <div className="space-y-4">
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={info.customerName} onChange={e => setInfo({ ...info, customerName: e.target.value })} placeholder="Nombre Contacto" />
              <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm outline-none focus:ring-2 focus:ring-blue-500" value={info.customerCompany} onChange={e => setInfo({ ...info, customerCompany: e.target.value })} placeholder="Empresa / Razón Social" />
              <div className="grid grid-cols-2 gap-3">
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" value={info.customerRut} onChange={e => setInfo({ ...info, customerRut: e.target.value })} placeholder="RUT" />
                <input type="text" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" value={info.customerGiro} onChange={e => setInfo({ ...info, customerGiro: e.target.value })} placeholder="Giro" />
              </div>
              <input type="email" className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm" value={info.customerEmail} onChange={e => setInfo({ ...info, customerEmail: e.target.value })} placeholder="Email de envío" />
            </div>
          </section>

          {/* Carga IA con Revisión */}
          <section className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
            <h3 className="font-bold mb-4 flex items-center gap-3">
              <SparklesIcon className="w-5 h-5 text-blue-400" /> Carga con Inteligencia Artificial
            </h3>

            {!stagedFile && !loading && (
              <div className="grid grid-cols-2 gap-3 mb-4">
                <button onClick={() => fileInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-6 transition-all group">
                  <ArrowUpTrayIcon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase">Subir Archivo</span>
                </button>
                <button onClick={() => cameraInputRef.current?.click()} className="flex flex-col items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-2xl py-6 transition-all group">
                  <CameraIcon className="w-6 h-6 text-blue-400 group-hover:scale-110 transition-transform" />
                  <span className="text-[10px] font-bold uppercase">Usar Cámara</span>
                </button>
              </div>
            )}

            {stagedFile && !loading && (
              <div className="bg-white/5 border border-blue-500/50 rounded-2xl p-4 mb-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="bg-blue-600/20 p-2 rounded-lg"><DocumentIcon className="w-5 h-5 text-blue-400" /></div>
                  <div className="overflow-hidden">
                    <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter">Archivo Seleccionado</p>
                    <p className="text-xs font-bold truncate">{stagedFile.name}</p>
                  </div>
                  <button onClick={() => setStagedFile(null)} className="ml-auto p-1 hover:bg-white/10 rounded-full"><XMarkIcon className="w-4 h-4 text-slate-400" /></button>
                </div>
                <button onClick={handleIAAnalysis} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-900/40">
                  <MagnifyingGlassIcon className="w-4 h-4" />
                  Revision IA
                </button>
              </div>
            )}

            {loading && (
              <div className="py-12 text-center animate-pulse">
                <div className="w-10 h-10 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[10px] font-black uppercase tracking-widest text-blue-400">Analizando Material...</p>
              </div>
            )}

            <p className="text-[10px] text-slate-500 italic mt-4">Soporta PDFs y Fotos de fichas técnicas Inprotar.</p>
            <input ref={fileInputRef} type="file" className="hidden" accept="image/*,application/pdf" onChange={handleFileSelect} />
            <input ref={cameraInputRef} type="file" className="hidden" accept="image/*" capture="environment" onChange={handleFileSelect} />
          </section>

          {/* Overlay para cerrar al hacer clic fuera (solo desktop) */}
          {showHistory && (
            <div
              className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 hidden lg:block"
              onClick={() => setShowHistory(false)}
            />
          )}

          {/* Modal Historial Retráctil (Desktop Side Drawer) */}
          <div className={`fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out border-l border-slate-200 hidden lg:block ${showHistory ? 'translate-x-0' : 'translate-x-full'}`}>
            <div className="p-6 h-full flex flex-col">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 text-blue-600" /> Historial de Cotizaciones
                </h2>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors group"
                >
                  <XMarkIcon className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:rotate-90 transition-all" />
                </button>
              </div>

              <div className="flex-grow overflow-y-auto no-scrollbar space-y-3 pb-4">
                {history.length === 0 ? (
                  <div className="text-center py-12">
                    <ClockIcon className="w-8 h-8 text-slate-200 mx-auto mb-2" />
                    <p className="text-slate-400 text-[10px] font-bold uppercase">Sin historial</p>
                  </div>
                ) : (
                  history.map(q => (
                    <div key={q.id} onClick={() => loadFromHistory(q)} className="group p-4 bg-slate-50 hover:bg-blue-50 border border-slate-100 rounded-2xl cursor-pointer transition-all relative">
                      <div className="flex justify-between items-start mb-1">
                        <span className="text-[9px] font-black text-blue-600">{q.quoteNumber}</span>
                        <button onClick={(e) => deleteFromHistory(q.id, e)} className="p-1 text-slate-300 hover:text-red-500 transition-all opacity-0 group-hover:opacity-100">
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <p className="text-[11px] font-bold text-slate-900 truncate">{q.customerCompany}</p>
                      <div className="flex justify-between items-center mt-3">
                        <span className="text-[9px] text-slate-400">{q.date}</span>
                        <span className="text-xs font-black text-slate-900">${q.total.toLocaleString('es-CL')}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="pt-6 border-t border-slate-100 space-y-2">
                <button onClick={saveToHistory} className="w-full py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all">
                  Guardar Borrador
                </button>
                <button onClick={startNewQuote} className="w-full py-3 border border-dashed border-slate-300 hover:border-blue-400 text-slate-400 hover:text-blue-500 rounded-xl text-[10px] font-black uppercase transition-all">
                  Nueva Cotización
                </button>
              </div>
            </div>
          </div>

          {/* Historial móvil (al final) */}
          <section className="bg-white rounded-3xl shadow-sm border border-slate-200 p-6 lg:hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                <ClockIcon className="w-4 h-4 text-blue-600" /> Historial Reciente
              </h2>
            </div>
            <div className="space-y-3">
              {history.slice(0, 3).map(q => (
                <div key={q.id} onClick={() => loadFromHistory(q)} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <div className="flex justify-between items-center">
                    <p className="text-xs font-bold text-slate-900">{q.customerCompany}</p>
                    <span className="text-[10px] font-black text-blue-600">{q.quoteNumber}</span>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={startNewQuote}
              className="w-full mt-4 py-3 border border-dashed border-slate-300 text-slate-400 rounded-xl text-[10px] font-black uppercase"
            >
              + Nueva Cotización
            </button>
          </section>
        </div>


        {/* Content */}
        <div className="lg:col-span-8 space-y-6 flex flex-col order-1 lg:order-2">
          <div className="flex justify-between items-center mb-2">
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">Detalle de Materiales</h2>
            <button onClick={addEmptyProduct} className="text-[10px] font-black text-blue-600 bg-blue-50 border border-blue-100 px-4 py-2 rounded-xl uppercase hover:bg-blue-600 hover:text-white transition-all shadow-sm">
              + Item Manual
            </button>
          </div>

          {/* Table Header - Visible only on Desktop */}
          {products.length > 0 && (
            <div className="hidden lg:grid grid-cols-12 gap-6 px-10 py-3 bg-slate-100/50 rounded-2xl border border-slate-200/60 mb-2">
              <div className="col-span-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Descripción del Material</div>
              <div className="col-span-3 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cant / Unidad</div>
              <div className="col-span-4 text-[10px] font-black text-slate-500 uppercase tracking-widest">Precio Unitario / Subtotal</div>
            </div>
          )}

          <div className="space-y-4 flex-grow">
            {products.length === 0 ? (
              <div className="bg-white border-2 border-dashed border-slate-200 rounded-[2.5rem] py-40 text-center shadow-inner mt-4">
                <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 border border-slate-100">
                  <CalculatorIcon className="w-12 h-12 text-slate-300" />
                </div>
                <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em] mb-2">Estado: Esperando Datos</p>
                <p className="text-slate-900 font-black text-2xl mb-8">Inicia tu cotización</p>
                <div className="flex justify-center gap-4">
                  <span className="px-4 py-2 bg-blue-50 text-blue-600 rounded-full text-[9px] font-black uppercase border border-blue-100">Escáner IA</span>
                  <span className="px-4 py-2 bg-slate-50 text-slate-400 rounded-full text-[9px] font-black uppercase border border-slate-100">Item Manual</span>
                </div>
              </div>
            ) : (
              products.map((product) => (
                <div key={product.id} className="bg-white rounded-2xl border border-slate-200 p-5 group relative transition-all hover:border-blue-400 hover:shadow-md">
                  <button onClick={() => removeProduct(product.id)} className="absolute -top-2 -right-2 bg-white text-red-500 p-1.5 rounded-full border border-slate-200 opacity-0 group-hover:opacity-100 transition-all z-10 shadow-sm hover:scale-110 hover:border-red-200">
                    <TrashIcon className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col gap-5">
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                      {/* Información Básica */}
                      <div className="lg:col-span-5">
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest">Material / Descripción</label>
                        <input className="w-full bg-slate-50 rounded-xl p-3 text-sm font-bold outline-none border border-transparent focus:border-blue-500 transition-all" value={product.name} onChange={e => updateProduct(product.id, { name: e.target.value })} placeholder="Ej: Cable XLPE 4mm2" />
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-[9px] font-black text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase">Marca: {product.brand}</span>
                          <span className="text-[9px] text-slate-400 italic truncate">{product.description}</span>
                        </div>
                      </div>

                      {/* Cantidad y Unidad */}
                      <div className="lg:col-span-3">
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest">Cant. y Unidad</label>
                        <div className="flex bg-slate-50 rounded-xl overflow-hidden border border-slate-100 p-1">
                          <input type="number" className="w-1/2 bg-transparent p-2 text-sm font-bold text-center outline-none" value={product.quantity} onChange={e => updateProduct(product.id, { quantity: Number(e.target.value) })} />
                          <select className="w-1/2 bg-white rounded-lg text-[9px] font-black px-2 outline-none cursor-pointer border border-slate-100 shadow-sm" value={product.unit} onChange={e => updateProduct(product.id, { unit: e.target.value as UnitType })}>
                            <option value="u">UNID</option>
                            <option value="m">METROS</option>
                            <option value="kg">KILOS</option>
                            <option value="cm">CM</option>
                          </select>
                        </div>
                      </div>

                      {/* Precio */}
                      <div className="lg:col-span-4">
                        <label className="text-[9px] font-black text-slate-400 uppercase mb-1.5 block tracking-widest text-right lg:text-left">Precio Unit. Neto</label>
                        <div className="flex items-center gap-4">
                          <div className="relative flex-grow">
                            <span className="absolute left-3 top-3 text-slate-400 text-sm font-mono">$</span>
                            <input type="number" className="w-full bg-slate-50 rounded-xl p-3 pl-7 text-sm font-mono font-bold outline-none border border-transparent focus:border-blue-500 transition-all" value={product.netPrice || ''} onChange={e => updateProduct(product.id, { netPrice: Number(e.target.value) })} placeholder="0" />
                          </div>
                          <div className="text-right min-w-[100px]">
                            <p className="text-[9px] font-black text-slate-400 uppercase">Total Item</p>
                            <p className="text-lg font-mono font-black text-slate-900 leading-none">
                              ${(product.quantity * (product.netPrice || 0)).toLocaleString('es-CL')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Logística integrada */}
                    <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex gap-2 p-1 bg-slate-50 rounded-xl w-fit border border-slate-100">
                            <button
                              onClick={() => updateProduct(product.id, { deliveryType: 'immediate', deliveryDays: 0 })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${product.deliveryType === 'immediate' ? 'bg-white text-blue-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              <TruckIcon className="w-3.5 h-3.5" />
                              Entrega Inmediata
                            </button>
                            <button
                              onClick={() => updateProduct(product.id, { deliveryType: 'import', deliveryDays: 15 })}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all ${product.deliveryType === 'import' ? 'bg-white text-orange-600 shadow-sm border border-slate-100' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                              <ArrowUpTrayIcon className="w-3.5 h-3.5 rotate-180" />
                              Importación
                            </button>
                          </div>
                        </div>

                        {product.deliveryType === 'import' && (
                          <div className="flex items-center gap-3 animate-in slide-in-from-left duration-300">
                            <div className="h-8 w-px bg-slate-100 mx-2"></div>
                            <div className="flex items-center gap-2 bg-orange-50/50 px-3 py-1.5 rounded-xl border border-orange-100">
                              <ClockIcon className="w-3.5 h-3.5 text-orange-600" />
                              <input
                                type="number"
                                className="w-8 bg-transparent text-xs font-black text-orange-700 outline-none"
                                value={product.deliveryDays}
                                onChange={e => updateProduct(product.id, { deliveryDays: Number(e.target.value) })}
                                min="1"
                              />
                              <span className="text-[9px] font-bold text-orange-600 uppercase">Días</span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Resumen Final */}
          {products.length > 0 && (
            <div className="mt-4 space-y-4">
              <div className="bg-white rounded-[2rem] p-8 border border-slate-200 shadow-xl">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-4">
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Neto</span>
                      <span className="text-xl font-mono font-bold text-slate-900">${netTotal.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">IVA (19%)</span>
                      <span className="text-xl font-mono font-bold text-slate-400">${iva.toLocaleString('es-CL')}</span>
                    </div>
                    <div className="flex justify-between items-end pt-2">
                      <span className="text-sm font-black text-blue-600 uppercase tracking-[0.2em]">Total Final</span>
                      <span className="text-4xl font-black text-slate-900 tracking-tighter">${total.toLocaleString('es-CL')}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button
                      onClick={handleDownloadPDF}
                      className="w-full flex items-center justify-center gap-4 bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-[1.5rem] font-black text-lg transition-all shadow-xl shadow-blue-500/30 active:scale-95 group"
                    >
                      <DocumentArrowDownIcon className="w-8 h-8 group-hover:translate-y-1 transition-transform" />
                      GENERAR COTIZACIÓN PDF
                    </button>
                    <p className="text-[10px] text-center text-slate-400 font-medium uppercase tracking-widest">Documento oficial válido por 15 días</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <footer className="py-8 bg-white border-t border-slate-200 text-center mt-12">
        <p className="text-[9px] text-slate-400 font-black uppercase tracking-widest">&copy; INPROTAR SpA - Santiago de Chile</p>
      </footer>
    </div>
  );
};

export default App;
