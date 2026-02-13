import React, { useState, useRef, useEffect } from 'react';
import { useQuote } from '../context/QuoteContext';
import { Product, ProductData, ExtractionResult, UnitType, DeliveryType } from '../types';
import { extractProductInfo } from '../services/geminiService';
import { generateQuotePDF } from '../services/pdfService';
import { supabase } from '../services/supabaseClient';
import { formatRut } from '../utils';
import {
    UserIcon,
    DocumentIcon,
    PhotoIcon,
    CheckCircleIcon,
    TrashIcon,
    ArrowLeftStartOnRectangleIcon,
    ArrowUpTrayIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    ChevronLeftIcon,
    PaperAirplaneIcon,
    PlusIcon,
    PencilSquareIcon,
    PhoneIcon,
    TagIcon
} from '@heroicons/react/24/outline';

import CatalogSearchModal from './CatalogSearchModal';

const QuoteWizard: React.FC<{ onExit: () => void }> = ({ onExit }) => {
    const {
        products,
        info,
        currentStep,
        updateInfo,
        addProduct,
        updateProduct,
        removeProduct,
        nextStep,
        prevStep,
        goToStep
    } = useQuote();

    const [stagedFile, setStagedFile] = useState<{ data: string, type: string, name: string } | null>(null);
    const [loading, setLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Analizando documento...');
    const [pendingProducts, setPendingProducts] = useState<ProductData[] | null>(null);
    const [errors, setErrors] = useState<string[]>([]);

    const [selectedIndices, setSelectedIndices] = useState<number[]>([]);

    // Manual product state for Step 2
    const [showManualModal, setShowManualModal] = useState(false);
    const [showCatalogModal, setShowCatalogModal] = useState(false);
    const [manualForm, setManualForm] = useState({ name: '', description: '' });

    const fileInputRef = useRef<HTMLInputElement>(null);

    const loaderMessages = [
        'Buscando producto...',
        'Revisando detalles técnicos...',
        'Consultando base de datos...',
        'Optimizando descripción...',
        'Extrayendo especificaciones...'
    ];

    useEffect(() => {
        let interval: any;
        if (loading) {
            let i = 0;
            interval = setInterval(() => {
                setLoadingMessage(loaderMessages[i % loaderMessages.length]);
                i++;
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [loading]);

    // -- STEP 1 VALIDATION --
    const validateStep1 = () => {
        const newErrors = [];
        if (!info.customerCompany) newErrors.push('customerCompany');
        if (!info.customerRut) newErrors.push('customerRut');
        if (!info.customerName) newErrors.push('customerName');
        if (!info.customerEmail) newErrors.push('customerEmail');
        setErrors(newErrors);
        return newErrors.length === 0;
    };

    const handleNextStep1 = () => {
        if (validateStep1()) nextStep();
    };

    // -- STEP 2 LOGIC --
    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // CRITICAL: Keep PDF as native "application/pdf" for Gemini.
        // Do NOT convert to Image here. Gemini can read the text layer directly.
        // Fallback to Image conversion happens in groqService if needed.
        if (file.type === 'application/pdf') {
            const reader = new FileReader();
            reader.onload = (event) => {
                setStagedFile({
                    data: event.target?.result as string,
                    type: 'application/pdf',
                    name: file.name
                });
            };
            reader.readAsDataURL(file); // Keep as DataURL
            return;
        }

        // If Image, Resize it to avoid token limits / invalid data errors
        const reader = new FileReader();
        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;
                const MAX_DIM = 1200; // Resize to max 1200px

                if (width > height) {
                    if (width > MAX_DIM) {
                        height *= MAX_DIM / width;
                        width = MAX_DIM;
                    }
                } else {
                    if (height > MAX_DIM) {
                        width *= MAX_DIM / height;
                        height = MAX_DIM;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx?.drawImage(img, 0, 0, width, height);

                // Convert to JPEG with 0.8 quality
                const optimizedDataUrl = canvas.toDataURL('image/jpeg', 0.8);

                setStagedFile({
                    data: optimizedDataUrl,
                    type: 'image/jpeg', // Force JPEG for consistency
                    name: file.name
                });
            };
            img.src = event.target?.result as string;
        };
        reader.readAsDataURL(file);
        e.target.value = '';
    };

    const addProductFromData = async (data: ProductData) => {
        const newProduct: Product = {
            id: Math.random().toString(36).substr(2, 9),
            name: data.specDetails ? `${data.name} (${data.specDetails})` : data.name,
            brand: 'INPROTAR',
            description: data.description,
            quantity: 1,
            unit: data.suggestedUnit,
            netPrice: 0,
            deliveryType: 'immediate',
            deliveryDays: 0,
            category: data.category
        };
        // We only add to local context here, pending products are handled separately now
        addProduct(newProduct);
    };

    const handleIAAnalysis = async () => {
        if (!stagedFile) return;
        setLoading(true);
        try {
            const result: ExtractionResult = await extractProductInfo(stagedFile.data, stagedFile.type);
            if (result.products.length === 0) {
                alert("No se detectaron productos.");
            } else {
                // Select none by default
                setSelectedIndices([]);
                setPendingProducts(result.products);
            }
        } catch (err) {
            console.error(err);
            alert("Error al analizar el archivo.");
        } finally {
            setLoading(false);
        }
    };


    const handleManualAdd = () => {
        if (!manualForm.name) return;
        addProduct({
            id: Math.random().toString(36).substr(2, 9),
            name: manualForm.name,
            brand: 'INPROTAR',
            description: manualForm.description,
            quantity: 1,
            unit: 'u',
            netPrice: 0,
            deliveryType: 'immediate',
            deliveryDays: 0
        });
        setManualForm({ name: '', description: '' });
        setShowManualModal(false);
        nextStep();
    };

    // -- FINALIZATION --
    // -- FINALIZATION --
    const handleFinalize = async () => {
        if (products.length === 0) return;
        setLoading(true);
        setLoadingMessage("Generando códigos y guardando en catálogo...");

        // 1. Auto-Grow Catalog & Assign SKUs
        // We will map over products to enrich them with SKUs before PDF generation
        // 1. Auto-Grow Catalog & Assign SKUs
        // We use a for-of loop to ensure sequential processing and avoid SKU race conditions
        const productsWithSku = [];
        for (const p of products) {
            if (!p.name) {
                productsWithSku.push(p);
                continue;
            }

            // Check if exists
            const { data: existing } = await supabase.from('products').select('sku, id').eq('name', p.name).maybeSingle();

            if (existing) {
                // If exists, use existing SKU
                productsWithSku.push({ ...p, sku: existing.sku || undefined });
            } else {
                // Generate SKU
                const { data: skuData } = await supabase
                    .rpc('get_next_sku', {
                        brand_text: 'INPROTAR',
                        category_name_text: p.category || 'Sin Categoría'
                    });

                const newSku = skuData || 'ERR-000';

                // Insert New Product
                await supabase.from('products').insert({
                    name: p.name,
                    brand: 'INPROTAR',
                    description: p.description,
                    unit: p.unit || 'u',
                    net_price: p.netPrice,
                    delivery_type: p.deliveryType,
                    delivery_days: p.deliveryDays,
                    category: p.category || 'Sin Categoría',
                    sku: newSku
                });

                productsWithSku.push({ ...p, sku: newSku });
            }
        }

        setLoadingMessage("Generando PDF...");

        // 2. Generate PDF using the Enhanced Products (with SKUs)
        await generateQuotePDF(productsWithSku, info);

        const netTotal = productsWithSku.reduce((sum, p) => sum + (p.quantity * (p.netPrice || 0)), 0);
        const iva = netTotal * 0.19;
        const total = netTotal + iva;

        // 3. Save Quote History
        await supabase.from('quotes').insert({
            quote_number: info.quoteNumber,
            customer_name: info.customerName,
            customer_company: info.customerCompany,
            customer_rut: info.customerRut,
            customer_email: info.customerEmail,
            total_net: netTotal,
            total_tax: iva,
            total_final: total,
            products_data: { products: productsWithSku, info, total, date: info.date, quoteNumber: info.quoteNumber }
        });

        setLoading(false);
        alert("Cotización Generada y Catálogo Actualizado!");
        onExit();
    };

    const netTotal = products.reduce((sum, p) => sum + (p.quantity * (p.netPrice || 0)), 0);
    const iva = netTotal * 0.19;
    const total = netTotal + iva;

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* TOP NAVIGATION / HEADER */}
            <div className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200/60 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-4 cursor-pointer" onClick={onExit}>
                        <div className="bg-slate-900 text-white p-2 rounded-xl">
                            <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Volver</p>
                            <h1 className="text-lg font-black text-slate-900 uppercase tracking-tighter">Nueva Cotización</h1>
                        </div>
                    </div>

                    {/* STEPPER */}
                    <div className="hidden md:flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(step => (
                            <div key={step} className="flex items-center">
                                <div
                                    onClick={() => goToStep(step)}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm transition-all cursor-pointer border-2 
                                    ${currentStep === step ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-600/30 scale-110' :
                                            currentStep > step ? 'bg-green-500 text-white border-green-500' : 'bg-white text-slate-300 border-slate-200'}`}
                                >
                                    {currentStep > step ? <CheckCircleIcon className="w-6 h-6" /> : step}
                                </div>
                                {step < 5 && <div className={`w-8 h-1 mx-2 rounded-full ${currentStep > step ? 'bg-green-500' : 'bg-slate-200'}`} />}
                            </div>
                        ))}
                    </div>

                    <div className="bg-slate-50 px-4 py-2 rounded-xl text-right">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Folio</p>
                        <p className="text-sm font-black text-blue-600 font-mono">{info.quoteNumber}</p>
                    </div>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <div className="max-w-5xl mx-auto px-4 py-10">

                {/* STEP 1: CLIENT INFO */}
                {currentStep === 1 && (
                    <div className="animate-in slide-in-from-bottom-10 duration-700">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Información del Cliente</h2>
                            <p className="text-slate-500 font-medium">Completa los datos para iniciar la cotización.</p>
                        </div>

                        <div className="bg-white p-8 md:p-12 rounded-[3rem] shadow-xl border border-slate-100">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3 group">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 group-focus-within:text-blue-500 transition-colors">Razón Social</label>
                                    <div className="relative">
                                        <input
                                            className={`w-full bg-slate-50 border-2 rounded-2xl p-5 pl-12 font-bold text-slate-700 outline-none transition-all ${errors.includes('customerCompany') ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-blue-500 focus:bg-white focus:shadow-lg'}`}
                                            value={info.customerCompany}
                                            onChange={e => updateInfo({ customerCompany: e.target.value })}
                                            placeholder="Ej: Inversiones SpA"
                                        />
                                        <PencilSquareIcon className="w-6 h-6 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                                    </div>
                                    {errors.includes('customerCompany') && <p className="text-red-500 text-xs font-bold pl-2">Campo Requerido</p>}
                                </div>

                                <div className="space-y-3 group">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 group-focus-within:text-blue-500 transition-colors">RUT</label>
                                    <div className="relative">
                                        <input
                                            className={`w-full bg-slate-50 border-2 rounded-2xl p-5 pl-12 font-bold text-slate-700 outline-none transition-all ${errors.includes('customerRut') ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-blue-500 focus:bg-white focus:shadow-lg'}`}
                                            value={info.customerRut}
                                            onChange={e => updateInfo({ customerRut: formatRut(e.target.value) })}
                                            placeholder="76.000.000-0"
                                        />
                                        <UserIcon className="w-6 h-6 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                                    </div>
                                    {errors.includes('customerRut') && <p className="text-red-500 text-xs font-bold pl-2">Campo Requerido</p>}
                                </div>

                                <div className="space-y-3 group">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 group-focus-within:text-blue-500 transition-colors">Nombre Contacto</label>
                                    <input
                                        className={`w-full bg-slate-50 border-2 rounded-2xl p-5 font-bold text-slate-700 outline-none transition-all ${errors.includes('customerName') ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-blue-500 focus:bg-white focus:shadow-lg'}`}
                                        value={info.customerName}
                                        onChange={e => updateInfo({ customerName: e.target.value })}
                                        placeholder="Ej: Juan Pérez"
                                    />
                                    {errors.includes('customerName') && <p className="text-red-500 text-xs font-bold pl-2">Campo Requerido</p>}
                                </div>

                                <div className="space-y-3 group">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 group-focus-within:text-blue-500 transition-colors">Email</label>
                                    <input
                                        className={`w-full bg-slate-50 border-2 rounded-2xl p-5 font-bold text-slate-700 outline-none transition-all ${errors.includes('customerEmail') ? 'border-red-500 bg-red-50' : 'border-transparent focus:border-blue-500 focus:bg-white focus:shadow-lg'}`}
                                        value={info.customerEmail}
                                        onChange={e => updateInfo({ customerEmail: e.target.value })}
                                        placeholder="contacto@empresa.cl"
                                    />
                                    {errors.includes('customerEmail') && <p className="text-red-500 text-xs font-bold pl-2">Campo Requerido</p>}
                                </div>

                                <div className="space-y-3 group">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 group-focus-within:text-blue-500 transition-colors">Giro (Opcional)</label>
                                    <div className="relative">
                                        <input
                                            className={`w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white focus:shadow-lg rounded-2xl p-5 pl-12 font-bold text-slate-700 outline-none transition-all`}
                                            value={info.customerGiro || ''}
                                            onChange={e => updateInfo({ customerGiro: e.target.value })}
                                            placeholder="Ej: Servicios de Ingeniería"
                                        />
                                        <TagIcon className="w-6 h-6 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                                    </div>
                                </div>

                                <div className="space-y-3 group">
                                    <label className="text-xs font-black text-slate-400 uppercase tracking-widest pl-2 group-focus-within:text-blue-500 transition-colors">Teléfono (Opcional)</label>
                                    <div className="relative">
                                        <input
                                            className={`w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white focus:shadow-lg rounded-2xl p-5 pl-12 font-bold text-slate-700 outline-none transition-all`}
                                            value={info.customerPhone || ''}
                                            onChange={e => updateInfo({ customerPhone: e.target.value })}
                                            placeholder="+56 9 1234 5678"
                                            type="tel"
                                        />
                                        <PhoneIcon className="w-6 h-6 text-slate-300 absolute left-4 top-1/2 -translate-y-1/2" />
                                    </div>
                                </div>
                            </div>

                            <button onClick={handleNextStep1} className="w-full mt-10 bg-slate-900 text-white py-5 rounded-2xl font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95 text-lg">
                                Continuar
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 2: SELECTION */}
                {currentStep === 2 && (
                    <div className="animate-in slide-in-from-bottom-10 duration-700 text-center">
                        <div className="text-center mb-12">
                            <h2 className="text-4xl font-black text-slate-900 tracking-tighter mb-4">Seleccionar Productos</h2>
                            <p className="text-slate-500 font-medium">Elige cómo quieres agregar los ítems a la cotización.</p>
                        </div>

                        {!stagedFile && !pendingProducts && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
                                {/* Option 1: IA Upload */}
                                <div
                                    onClick={() => fileInputRef.current?.click()}
                                    className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-blue-500 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group relative overflow-hidden"
                                >
                                    <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileSelect} />
                                    <div className="absolute top-0 right-0 bg-blue-500 text-white text-[9px] font-black px-3 py-1.5 rounded-bl-2xl uppercase tracking-widest">IA Auto</div>
                                    <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-blue-500 transition-colors">
                                        <ArrowUpTrayIcon className="w-8 h-8 text-blue-500 group-hover:text-white transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">Cargar con IA</h3>
                                    <p className="text-slate-400 text-xs font-medium">Sube PDF o Foto. La IA detectará los productos.</p>
                                </div>

                                {/* Option 2: Catalog Search */}
                                <div
                                    onClick={() => setShowCatalogModal(true)}
                                    className="bg-slate-900 p-8 rounded-[2.5rem] border-2 border-slate-900 hover:bg-blue-600 hover:border-blue-600 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group relative"
                                >
                                    <div className="absolute top-0 right-0 bg-white/20 text-white text-[9px] font-black px-3 py-1.5 rounded-bl-2xl uppercase tracking-widest">Base de Datos</div>
                                    <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-white/20 transition-colors">
                                        <DocumentIcon className="w-8 h-8 text-white" />
                                    </div>
                                    <h3 className="text-xl font-black text-white mb-2">Buscar en Catálogo</h3>
                                    <p className="text-slate-300 text-xs font-medium">Agrega productos existentes desde tu base de datos.</p>
                                </div>

                                {/* Option 3: Manual Entry */}
                                <div
                                    onClick={() => setShowManualModal(true)}
                                    className="bg-white p-8 rounded-[2.5rem] border-2 border-slate-100 hover:border-slate-900 hover:shadow-2xl hover:-translate-y-2 transition-all cursor-pointer group"
                                >
                                    <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:bg-slate-900 transition-colors">
                                        <PencilSquareIcon className="w-8 h-8 text-slate-400 group-hover:text-white transition-colors" />
                                    </div>
                                    <h3 className="text-xl font-black text-slate-900 mb-2">Ingreso Manual</h3>
                                    <p className="text-slate-400 text-xs font-medium">Escribe nombre y descripción paso a paso.</p>
                                </div>
                            </div>
                        )}

                        {/* Loading / Staged AI View */}
                        {stagedFile && !pendingProducts && (
                            <div className="max-w-xl mx-auto bg-slate-900 rounded-[3rem] p-12 text-white shadow-2xl relative overflow-hidden">
                                {loading && (
                                    <div className="absolute inset-0 bg-blue-600/95 z-20 flex flex-col items-center justify-center">
                                        <ArrowPathIcon className="w-16 h-16 animate-spin mb-6" />
                                        <p className="text-xl font-black uppercase tracking-widest animate-pulse">{loadingMessage}</p>
                                    </div>
                                )}
                                <DocumentIcon className="w-20 h-20 text-blue-400 mx-auto mb-6" />
                                <h3 className="text-2xl font-black mb-2 truncate">{stagedFile.name}</h3>
                                <div className="grid grid-cols-2 gap-4 mt-8">
                                    <button onClick={() => setStagedFile(null)} className="py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-white/10 hover:bg-white/20">Cancelar</button>
                                    <button onClick={handleIAAnalysis} disabled={loading} className="py-4 rounded-xl font-black uppercase tracking-widest text-xs bg-blue-500 hover:bg-blue-400 shadow-lg shadow-blue-500/50 disabled:opacity-50 disabled:cursor-not-allowed">Procesar con IA</button>
                                </div>
                            </div>
                        )}

                        {/* Multi Product Selection */}
                        {pendingProducts && (
                            <div className="max-w-3xl mx-auto bg-white rounded-[3rem] p-8 border border-slate-200 shadow-xl">
                                <h3 className="text-2xl font-black text-slate-900 mb-6">Productos Detectados ({pendingProducts.length})</h3>
                                <p className="text-slate-500 mb-6 text-sm">Selecciona los productos que quieres cotizar ahora. El resto se guardará para revisión.</p>

                                <div className="space-y-4 text-left max-h-96 overflow-y-auto pr-2 custom-scrollbar">
                                    {pendingProducts.map((p, idx) => {
                                        const isSelected = selectedIndices.includes(idx);
                                        return (
                                            <div key={idx}
                                                className={`p-4 rounded-2xl border-2 cursor-pointer flex justify-between items-center group transition-all ${isSelected ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 hover:border-slate-300'}`}
                                                onClick={() => {
                                                    if (isSelected) {
                                                        setSelectedIndices(prev => prev.filter(i => i !== idx));
                                                    } else {
                                                        setSelectedIndices(prev => [...prev, idx]);
                                                    }
                                                }}>
                                                <div className="flex items-start gap-4">
                                                    <div className={`w-6 h-6 rounded-full border-2 mt-1 flex items-center justify-center transition-all ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-slate-300'}`}>
                                                        {isSelected && <CheckCircleIcon className="w-4 h-4 text-white" />}
                                                    </div>
                                                    <div>
                                                        <p className={`font-bold transition-colors ${isSelected ? 'text-blue-700' : 'text-slate-800'}`}>{p.name}</p>
                                                        <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="mt-8 space-y-3">
                                    <button
                                        onClick={async () => {
                                            if (selectedIndices.length === 0) return;

                                            // Process Selected
                                            for (const idx of selectedIndices) {
                                                await addProductFromData(pendingProducts[idx]);
                                            }

                                            // Remove selected from pending list, KEEPING the rest
                                            const unselected = pendingProducts.filter((_, i) => !selectedIndices.includes(i));

                                            setPendingProducts(unselected.length > 0 ? unselected : null);
                                            setSelectedIndices([]); // Reset selection

                                            // If no products left, we could clear stagedFile, but keeping it is safer for "back" navigation context if needed
                                            if (unselected.length === 0) {
                                                setStagedFile(null);
                                            }

                                            nextStep();
                                        }}
                                        disabled={selectedIndices.length === 0}
                                        className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-sm hover:bg-blue-600 shadow-xl disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                                    >
                                        Cotizar {selectedIndices.length} Seleccionados
                                    </button>

                                    {pendingProducts.length > selectedIndices.length && (
                                        <button
                                            onClick={async () => {
                                                const unselected = pendingProducts.filter((_, i) => !selectedIndices.includes(i));
                                                if (unselected.length > 0) {
                                                    const pendingInserts = unselected.map(p => ({
                                                        name: p.name,
                                                        brand: p.brand || 'INPROTAR',
                                                        description: p.description,
                                                        suggested_unit: p.suggestedUnit,
                                                        spec_details: p.specDetails,
                                                        category: p.category,
                                                        status: 'pending'
                                                    }));
                                                    await supabase.from('pending_products').insert(pendingInserts);
                                                    alert(`${unselected.length} productos enviados a la Cola de IA.`);
                                                }
                                                // Clear pending products after sending to queue
                                                setPendingProducts(null);
                                                setStagedFile(null);
                                                nextStep();
                                            }}
                                            className="w-full text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-blue-500 py-2 border-2 border-transparent hover:border-blue-100 rounded-xl transition-all"
                                        >
                                            Enviar los {pendingProducts.length - selectedIndices.length} restantes a Cola IA (Borrar de aquí)
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Catalog Modal */}
                        {showCatalogModal && (
                            <CatalogSearchModal
                                onClose={() => setShowCatalogModal(false)}
                                onAddProduct={(product) => {
                                    addProduct(product);
                                    setShowCatalogModal(false);
                                    nextStep();
                                }}
                            />
                        )}

                        {/* Manual Modal */}
                        {showManualModal && (
                            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                                    <h3 className="text-2xl font-black text-slate-900 mb-6">Nuevo Producto</h3>
                                    <input
                                        className="w-full bg-slate-50 border-2 rounded-2xl p-4 font-bold mb-4 outline-none focus:border-blue-500"
                                        placeholder="Nombre del Producto"
                                        value={manualForm.name}
                                        onChange={e => setManualForm({ ...manualForm, name: e.target.value })}
                                        autoFocus
                                    />
                                    <textarea
                                        className="w-full bg-slate-50 border-2 rounded-2xl p-4 font-bold mb-6 outline-none focus:border-blue-500 h-32 resize-none"
                                        placeholder="Descripción Técnica"
                                        value={manualForm.description}
                                        onChange={e => setManualForm({ ...manualForm, description: e.target.value })}
                                    />
                                    <div className="flex gap-4">
                                        <button onClick={() => setShowManualModal(false)} className="flex-1 py-4 font-black uppercase tracking-widest text-xs text-slate-400 hover:text-slate-900">Cancelar</button>
                                        <button onClick={handleManualAdd} className="flex-1 bg-slate-900 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs hover:bg-blue-600 shadow-xl">Agregar</button>
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="mt-12">
                            <button onClick={prevStep} className="text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-900">Volver Atrás</button>
                        </div>
                    </div>
                )}

                {/* STEP 3: ADJUSTMENT - PREMIUM CARDS */}
                {currentStep === 3 && (
                    <div className="animate-in slide-in-from-right-10 duration-500">
                        <div className="flex justify-between items-end mb-8">
                            <div>
                                <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Ajuste de Productos</h2>
                                <p className="text-slate-500 font-medium text-sm">Define precios y tiempos de entrega.</p>
                            </div>
                            <button onClick={() => setShowManualModal(true)} className="bg-blue-50 text-blue-600 px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-blue-100 flex items-center gap-2">
                                <PlusIcon className="w-4 h-4" /> Agregar Otro
                            </button>
                        </div>

                        <div className="grid grid-cols-1 gap-6">
                            {products.length === 0 && (
                                <div className="text-center py-20 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                                    <p className="text-slate-400 font-bold uppercase tracking-widest">Lista Vacía</p>
                                </div>
                            )}

                            {products.map((product) => (
                                <div key={product.id} className="bg-white rounded-[2.5rem] p-8 shadow-lg border border-slate-100 hover:shadow-2xl transition-all group relative">
                                    <button onClick={() => removeProduct(product.id)} className="absolute top-6 right-6 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 p-2 rounded-full">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>

                                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                                        {/* info */}
                                        <div className="lg:col-span-6 space-y-4">
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Producto</label>
                                                <input
                                                    className="w-full text-xl font-black text-slate-900 bg-transparent border-b-2 border-transparent hover:border-slate-200 focus:border-blue-500 outline-none transition-colors pb-1"
                                                    value={product.name}
                                                    onChange={e => updateProduct(product.id, { name: e.target.value })}
                                                    placeholder="Nombre del Producto"
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría</label>
                                                    {/* Replace with a proper selector if categories are loaded, for now text input with suggestion */}
                                                    <input
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
                                                        value={product.category || ''}
                                                        onChange={e => updateProduct(product.id, { category: e.target.value })}
                                                        placeholder="Ej: Control, Cables..."
                                                    />
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Unidad</label>
                                                    <select
                                                        className="w-full bg-slate-50 border border-slate-200 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-600 outline-none focus:border-blue-500"
                                                        value={product.unit || 'u'}
                                                        onChange={e => updateProduct(product.id, { unit: e.target.value as any })}
                                                    >
                                                        <option value="u">Unidad</option>
                                                        <option value="m">Metros</option>
                                                        <option value="kg">Kilos</option>
                                                        <option value="cm">CM</option>
                                                    </select>
                                                </div>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                                                <textarea
                                                    className="w-full text-sm font-medium text-slate-600 bg-slate-50 rounded-xl p-3 outline-none focus:ring-2 focus:ring-blue-100 resize-none h-20"
                                                    value={product.description || ''}
                                                    onChange={e => updateProduct(product.id, { description: e.target.value })}
                                                    placeholder="Descripción técnica..."
                                                />
                                            </div>
                                        </div>

                                        {/* controls */}
                                        <div className="lg:col-span-6 grid grid-cols-3 gap-4">
                                            <div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">Cantidad</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 text-center font-black text-slate-900 outline-none focus:border-blue-500 text-lg"
                                                    value={product.quantity}
                                                    onChange={e => updateProduct(product.id, { quantity: Number(e.target.value) })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">Unitario</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 text-right pr-4 font-black text-slate-900 outline-none focus:border-green-500 text-lg"
                                                    value={product.netPrice}
                                                    onChange={e => updateProduct(product.id, { netPrice: Number(e.target.value) })}
                                                    placeholder="$"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-2 text-center">Entrega</label>
                                                <div className="flex flex-col gap-2">
                                                    <select
                                                        className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-3 px-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-500 h-[50px]"
                                                        value={product.deliveryType}
                                                        onChange={e => updateProduct(product.id, { deliveryType: e.target.value as DeliveryType })}
                                                    >
                                                        <option value="immediate">Inmediata</option>
                                                        <option value="import">Importación</option>
                                                    </select>
                                                    {product.deliveryType === 'import' && (
                                                        <input
                                                            type="number"
                                                            placeholder="Días"
                                                            className="w-full text-center bg-blue-50 border border-blue-200 rounded-xl py-2 text-xs font-bold text-blue-600 outline-none focus:ring-2 focus:ring-blue-100"
                                                            value={product.deliveryDays || ''}
                                                            onChange={e => updateProduct(product.id, { deliveryDays: Number(e.target.value) })}
                                                        />
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-between pt-10 pb-20">
                            <button onClick={prevStep} className="bg-white border-2 border-slate-200 text-slate-500 px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-slate-50">
                                Atrás
                            </button>
                            <button onClick={nextStep} className="bg-slate-900 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-600 shadow-xl shadow-blue-900/20 active:scale-95 transition-all">
                                Continuar
                            </button>
                        </div>

                        {/* Re-using Manual Modal from Step 2 if triggered */}
                        {showManualModal && (
                            <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-[3rem] p-10 w-full max-w-lg shadow-2xl animate-in zoom-in-95">
                                    <h3 className="text-2xl font-black text-slate-900 mb-6">Agregar Item</h3>
                                    {/* Simplified form for Step 3 manual addition */}
                                    <input
                                        className="w-full bg-slate-50 border-2 rounded-2xl p-4 font-bold mb-4 outline-none focus:border-blue-500"
                                        placeholder="Nombre del Producto"
                                        value={manualForm.name}
                                        onChange={e => setManualForm({ ...manualForm, name: e.target.value })}
                                        autoFocus
                                    />
                                    <button onClick={handleManualAdd} className="w-full bg-slate-900 text-white rounded-2xl py-4 font-black uppercase tracking-widest text-xs hover:bg-blue-600 shadow-xl">Agregar</button>
                                    <button onClick={() => setShowManualModal(false)} className="w-full mt-4 font-black uppercase tracking-widest text-xs text-slate-400">Cancelar</button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* STEP 4: REVIEW */}
                {currentStep === 4 && (
                    <div className="animate-in slide-in-from-bottom-10">
                        <h2 className="text-3xl font-black text-slate-900 mb-8 tracking-tighter">Resumen y Finalización</h2>
                        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-xl overflow-hidden mb-10">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-100">
                                    <tr>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Detalle</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Cant</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Precio</th>
                                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Total</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {products.map((p) => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-8 py-6">
                                                <p className="text-xs text-slate-400 mb-1">{p.name}</p>
                                                {p.description && (
                                                    <p className="font-bold text-slate-800 text-sm leading-relaxed">{p.description}</p>
                                                )}
                                            </td>
                                            <td className="px-8 py-6 text-center font-bold text-slate-600">{p.quantity}</td>
                                            <td className="px-8 py-6 text-right font-mono font-medium text-slate-600">${p.netPrice.toLocaleString('es-CL')}</td>
                                            <td className="px-8 py-6 text-right font-mono font-black text-slate-900">${(p.quantity * p.netPrice).toLocaleString('es-CL')}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot className="bg-slate-900 text-white">
                                    <tr>
                                        <td colSpan={3} className="px-8 py-6 text-right text-xs font-black uppercase tracking-widest opacity-70">Total Final (con IVA)</td>
                                        <td className="px-8 py-6 text-right text-3xl font-mono font-black text-blue-400">${total.toLocaleString('es-CL')}</td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <div className="flex justify-between pb-20">
                            <button onClick={prevStep} className="bg-white border-2 border-slate-200 text-slate-500 px-8 py-3 rounded-xl font-black uppercase tracking-widest hover:bg-slate-50">Atrás</button>
                            <button onClick={nextStep} className="bg-blue-600 text-white px-12 py-4 rounded-xl font-black uppercase tracking-widest hover:bg-blue-500 shadow-xl shadow-blue-600/30 active:scale-95 transition-all text-lg">
                                Finalizar
                            </button>
                        </div>
                    </div>
                )}

                {/* STEP 5: SUCCESS */}
                {currentStep === 5 && (
                    <div className="max-w-xl mx-auto text-center py-20 animate-in zoom-in-95">
                        <div className="w-32 h-32 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-10 shadow-xl shadow-green-500/20">
                            <CheckCircleIcon className="w-16 h-16 text-green-600" />
                        </div>
                        <h2 className="text-5xl font-black text-slate-900 mb-6 tracking-tighter">¡Listo!</h2>
                        <p className="text-xl text-slate-500 font-medium mb-12">La cotización #{info.quoteNumber} ha sido creada correctamente.</p>

                        <button onClick={handleFinalize} className="w-full bg-slate-900 text-white py-6 rounded-2xl font-black uppercase tracking-widest text-lg hover:bg-blue-600 shadow-2xl transition-all flex items-center justify-center gap-3">
                            <PaperAirplaneIcon className="w-6 h-6" /> Generar PDF
                        </button>
                        <button onClick={() => goToStep(1)} className="mt-8 text-slate-400 font-bold uppercase tracking-widest text-xs hover:text-slate-900">Volver al inicio</button>
                    </div>
                )}
            </div>
        </div >
    );
};

export default QuoteWizard;
