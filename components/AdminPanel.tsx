import React from 'react';
import {
    ChevronLeftIcon,
    ClockIcon,
    UserIcon,
    TrashIcon,
    MagnifyingGlassIcon,
    PlusIcon,
    PencilIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { SavedQuote, Product } from '../types';

interface AdminPanelProps {
    activeTab: 'quotes' | 'catalog';
    setActiveTab: (tab: 'quotes' | 'catalog') => void;
    history: SavedQuote[];
    catalog: Product[];
    onBack: () => void;
    onReopenQuote: (quote: SavedQuote) => void;
    onDeleteQuote: (id: string, e: React.MouseEvent) => void;
    onDeleteProduct: (id: string, e: React.MouseEvent) => void; // New
    onEditProduct: (product: Product) => void; // New
}

const AdminPanel: React.FC<AdminPanelProps> = ({
    activeTab,
    setActiveTab,
    history,
    catalog,
    onBack,
    onReopenQuote,
    onDeleteQuote,
    onEditProduct,
    onDeleteProduct
}) => {
    const [editingProduct, setEditingProduct] = React.useState<Product | null>(null);

    const handleSaveEdit = () => {
        if (editingProduct) {
            onEditProduct(editingProduct);
            setEditingProduct(null);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-5 duration-500">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                {/* ... Header ... */}
                <div className="flex flex-col gap-4">
                    <h2 className="text-3xl lg:text-4xl font-black tracking-tighter text-slate-900">
                        {activeTab === 'catalog' ? 'Panel de Administración' : 'Cotizaciones'}
                    </h2>
                    {/* Tabs removed for strict separation */}
                </div>
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-sm font-black uppercase tracking-widest text-slate-500 hover:text-slate-900 px-8 py-4 bg-slate-50 rounded-full border border-slate-200 transition-all hover:shadow-md"
                >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Volver al Dashboard
                </button>
            </div>

            {activeTab === 'quotes' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {history.length === 0 ? (
                        <div className="col-span-full py-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-200">
                            <ClockIcon className="w-20 h-20 text-slate-100 mx-auto mb-6" />
                            <p className="text-slate-400 font-black uppercase tracking-[0.2em] text-sm">No hay registros guardados aún</p>
                        </div>
                    ) : (
                        history.map(q => (
                            <div key={q.id} className="bg-white p-8 rounded-[3rem] border border-slate-200 shadow-lg hover:shadow-2xl hover:scale-[1.02] transition-all flex flex-col gap-6 group">
                                <div className="flex justify-between items-start">
                                    <span className="bg-blue-50 text-blue-600 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-widest border border-blue-100">{q.quoteNumber}</span>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{q.date}</p>
                                </div>
                                <div>
                                    <h4 className="text-xl font-black text-slate-900 truncate mb-1">{q.customerCompany}</h4>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                        <UserIcon className="w-3 h-3" /> {q.customerName}
                                    </p>
                                </div>
                                <div className="flex justify-between items-center mt-4 pt-6 border-t border-slate-50">
                                    <div className="flex flex-col">
                                        <span className="text-[9px] font-black text-slate-300 uppercase">Total Final</span>
                                        <span className="text-2xl font-black text-slate-900 font-mono">${q.total.toLocaleString('es-CL')}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button onClick={(e) => onDeleteQuote(q.id, e)} className="p-3 text-slate-300 hover:text-red-500 transition-colors bg-slate-50 rounded-2xl hover:bg-red-50"><TrashIcon className="w-6 h-6" /></button>
                                        <button
                                            onClick={() => onReopenQuote(q)}
                                            className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg active:scale-95"
                                        >
                                            Re-abrir
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="space-y-12">
                    {/* Main Catalog Table */}
                    <div className="bg-white rounded-[3rem] border border-slate-200 shadow-xl overflow-hidden">
                        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="text-2xl font-black text-slate-900">Catálogo Oficial Inprotar</h3>
                            <div className="relative">
                                <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                                <input type="text" placeholder="Buscar producto..." className="pl-12 pr-6 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-blue-500 transition-all w-64 text-sm font-medium" />
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest border-b border-slate-100">
                                        <th className="px-6 py-6">Código (SKU)</th>
                                        <th className="px-6 py-6">Producto</th>
                                        <th className="px-6 py-6">Categoría</th>
                                        <th className="px-6 py-6">Precio Neto</th>
                                        <th className="px-6 py-6 text-right">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {catalog.map(p => (
                                        <tr key={p.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-6">
                                                <span className="text-xs font-black text-blue-600 bg-blue-50 px-3 py-1 rounded-full uppercase tracking-wider">{p.sku || 'N/A'}</span>
                                            </td>
                                            <td className="px-6 py-6 max-w-md">
                                                <p className="text-sm font-black text-slate-900 uppercase tracking-tight truncate">{p.name}</p>
                                                <p className="text-xs text-slate-400 font-medium truncate max-w-xs">{p.description}</p>
                                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1 block">{p.brand}</span>
                                            </td>
                                            <td className="px-6 py-6">
                                                <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-md uppercase">{p.category || 'Sin Cat.'}</span>
                                            </td>
                                            <td className="px-6 py-6 font-black font-mono text-slate-900">${p.netPrice.toLocaleString('es-CL')}</td>
                                            <td className="px-6 py-6 text-right">
                                                <div className="flex justify-end gap-2">
                                                    <button onClick={() => setEditingProduct(p)} className="p-2 text-slate-300 hover:text-blue-500 hover:bg-blue-50 rounded-xl transition-all"><PencilIcon className="w-5 h-5" /></button>
                                                    <button onClick={(e) => onDeleteProduct(p.id, e)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"><TrashIcon className="w-5 h-5" /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {editingProduct && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl p-8 animate-in zoom-in-95 duration-300">
                        <div className="flex justify-between items-center mb-8">
                            <h3 className="text-2xl font-black text-slate-900">Editar Producto</h3>
                            <button onClick={() => setEditingProduct(null)} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors">
                                <XMarkIcon className="w-6 h-6 text-slate-500" />
                            </button>
                        </div>

                        <div className="space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">SKU</label>
                                    <input value={editingProduct.sku || ''} onChange={e => setEditingProduct({ ...editingProduct, sku: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Categoría</label>
                                    <input value={editingProduct.category || ''} onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Nombre</label>
                                <input value={editingProduct.name} onChange={e => setEditingProduct({ ...editingProduct, name: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Descripción</label>
                                <textarea rows={3} value={editingProduct.description} onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Precio Neto</label>
                                    <input type="number" value={editingProduct.netPrice} onChange={e => setEditingProduct({ ...editingProduct, netPrice: Number(e.target.value) })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Marca</label>
                                    <input value={editingProduct.brand} onChange={e => setEditingProduct({ ...editingProduct, brand: e.target.value })} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-bold text-slate-700 outline-none focus:border-blue-500" />
                                </div>
                            </div>
                        </div>

                        <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end gap-3">
                            <button onClick={() => setEditingProduct(null)} className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-50 transition-colors">Cancelar</button>
                            <button onClick={handleSaveEdit} className="px-8 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors shadow-lg hover:shadow-blue-500/30">Guardar Cambios</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPanel;
