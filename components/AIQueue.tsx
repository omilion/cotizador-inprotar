import React, { useState, useEffect } from 'react';
import { SparklesIcon, TrashIcon, CheckCircleIcon, ArrowLeftStartOnRectangleIcon, TagIcon } from '@heroicons/react/24/outline';
import { supabase } from '../services/supabaseClient';
import CategoryManager from './CategoryManager';

interface AIQueueProps {
    items: any[];
    onRefresh: () => void;
    onBack: () => void;
}

const AIQueue: React.FC<AIQueueProps> = ({ items, onRefresh, onBack }) => {
    const [categories, setCategories] = useState<{ id: string, name: string }[]>([]);
    const [showCategoryManager, setShowCategoryManager] = useState(false);
    const [approvingItem, setApprovingItem] = useState<string | null>(null);
    const [approvalForm, setApprovalForm] = useState({
        price: '',
        category: '',
        unit: 'u',
        deliveryType: 'immediate',
        deliveryDays: 0
    });

    useEffect(() => {
        fetchCategories();
    }, [showCategoryManager]); // Refresh when manager closes

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) setCategories(data);
    };

    const initiateApproval = (item: any) => {
        setApprovingItem(item.id);
        const suggestedCat = categories.find(c => c.name.toLowerCase() === item.category?.toLowerCase())?.name || '';
        setApprovalForm({
            price: '0',
            category: suggestedCat,
            unit: item.suggested_unit || 'u',
            deliveryType: 'immediate',
            deliveryDays: 0
        });
    };

    const confirmApproval = async (item: any) => {
        if (!approvalForm.category) {
            alert("Selecciona una categoría.");
            return;
        }

        const { error } = await supabase.from('products').insert({
            name: item.name,
            brand: item.brand,
            description: item.description,
            unit: approvalForm.unit,
            net_price: parseFloat(approvalForm.price),
            delivery_type: approvalForm.deliveryType,
            delivery_days: approvalForm.deliveryDays,
            category: approvalForm.category
        });

        if (!error) {
            await supabase.from('pending_products').update({ status: 'approved' }).eq('id', item.id);
            alert("Producto aprobado y añadido al catálogo.");
            setApprovingItem(null);
            onRefresh();
        } else {
            alert("Error: " + error.message);
        }
    };

    const handleReject = async (item: any) => {
        if (confirm("¿Rechazar producto?")) {
            await supabase.from('pending_products').update({ status: 'rejected' }).eq('id', item.id);
            onRefresh();
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 py-12 animate-in fade-in duration-500">
            {showCategoryManager && (
                <CategoryManager
                    onClose={() => setShowCategoryManager(false)}
                    onCategoryAdded={(newCat) => setApprovalForm(prev => ({ ...prev, category: newCat }))}
                />
            )}

            <div className="flex flex-col md:flex-row justify-between items-center mb-10 gap-6">
                <div className="flex items-center gap-4">
                    <div className="bg-amber-100 p-3 rounded-2xl">
                        <SparklesIcon className="w-8 h-8 text-amber-600" />
                    </div>
                    <div>
                        <h2 className="text-3xl font-black text-slate-900 tracking-tighter">Cola de IA</h2>
                        <p className="text-slate-500 font-medium">Validación y Categorización</p>
                    </div>
                </div>
                <div className="flex gap-4">
                    <button onClick={() => setShowCategoryManager(true)} className="flex items-center gap-2 bg-white border border-slate-200 px-6 py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-slate-50 shadow-sm transition-all text-blue-600">
                        <TagIcon className="w-5 h-5" />
                        Gestionar Categorías
                    </button>
                    <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black uppercase tracking-widest text-xs transition-colors px-4">
                        <ArrowLeftStartOnRectangleIcon className="w-5 h-5" />
                        Volver
                    </button>
                </div>
            </div>

            {items.length === 0 ? (
                <div className="text-center py-32 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                    <SparklesIcon className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                    <p className="text-slate-400 font-black uppercase tracking-[0.2em]">No hay productos pendientes</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {items.map(item => (
                        <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex flex-col gap-4 relative group hover:border-blue-400 transition-all">
                            {/* Header */}
                            <div className="flex justify-between items-start">
                                <span className="bg-amber-50 text-amber-600 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-widest border border-amber-100">Pendiente</span>
                                {item.category && <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-md max-w-[100px] truncate">{item.category}</span>}
                            </div>

                            <div>
                                <h3 className="text-lg font-black text-slate-900 mb-2 line-clamp-2 leading-tight">{item.name}</h3>
                                <p className="text-xs text-slate-500 font-medium bg-slate-50 p-3 rounded-xl line-clamp-3">{item.description}</p>
                            </div>

                            {/* Approval Form Inline */}
                            {approvingItem === item.id ? (
                                <div className="bg-blue-50/50 p-4 rounded-2xl border border-blue-100 animate-in fade-in space-y-3">
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Precio Neto</label>
                                            <input
                                                type="number"
                                                className="w-full bg-white border border-blue-200 rounded-lg px-2 py-2 text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={approvalForm.price}
                                                onChange={e => setApprovalForm({ ...approvalForm, price: e.target.value })}
                                                autoFocus
                                            />
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Unidad</label>
                                            <select
                                                className="w-full bg-white border border-blue-200 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={approvalForm.unit}
                                                onChange={e => setApprovalForm({ ...approvalForm, unit: e.target.value })}
                                            >
                                                <option value="u">UNIDAD</option>
                                                <option value="m">METROS</option>
                                                <option value="kg">KILOS</option>
                                                <option value="cm">CM</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Delivery & Category */}
                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Entrega</label>
                                            <select
                                                className="w-full bg-white border border-blue-200 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={approvalForm.deliveryType}
                                                onChange={e => setApprovalForm({ ...approvalForm, deliveryType: e.target.value })}
                                            >
                                                <option value="immediate">Inmediata</option>
                                                <option value="import">Importación</option>
                                            </select>
                                            {approvalForm.deliveryType === 'import' && (
                                                <input
                                                    type="number"
                                                    placeholder="Días"
                                                    className="w-full mt-1 bg-blue-50 border border-blue-200 rounded-lg px-2 py-1 text-xs font-bold outline-none text-blue-600"
                                                    value={approvalForm.deliveryDays || ''}
                                                    onChange={e => setApprovalForm({ ...approvalForm, deliveryDays: Number(e.target.value) })}
                                                />
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-1">Categoría</label>
                                            <select
                                                className="w-full bg-white border border-blue-200 rounded-lg px-2 py-2 text-xs font-bold outline-none focus:ring-2 focus:ring-blue-500"
                                                value={approvalForm.category}
                                                onChange={e => setApprovalForm({ ...approvalForm, category: e.target.value })}
                                            >
                                                <option value="">Seleccionar...</option>
                                                {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 pt-2">
                                        <button onClick={() => setApprovingItem(null)} className="flex-1 py-2 text-[10px] font-black uppercase text-slate-400 hover:text-slate-900">Cancelar</button>
                                        <button onClick={() => confirmApproval(item)} className="flex-1 bg-blue-600 text-white py-2 rounded-lg text-[10px] font-black uppercase shadow-md hover:bg-blue-500">Confirmar</button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex gap-3 mt-auto pt-4">
                                    <button onClick={() => handleReject(item)} className="p-3 rounded-xl bg-red-50 text-red-500 hover:bg-red-100 transition-colors">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => initiateApproval(item)} className="flex-grow bg-slate-900 text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:bg-blue-600 transition-all shadow-lg active:scale-95 flex items-center justify-center gap-2">
                                        <CheckCircleIcon className="w-4 h-4" />
                                        Revisar
                                    </button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AIQueue;
