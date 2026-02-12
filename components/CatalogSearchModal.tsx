import React, { useState, useEffect } from 'react';
import { MagnifyingGlassIcon, PlusIcon, XMarkIcon, CubeIcon } from '@heroicons/react/24/outline';
import { supabase } from '../services/supabaseClient';
import { Product } from '../types';

interface CatalogSearchModalProps {
    onClose: () => void;
    onAddProduct: (product: Product) => void;
}

const CatalogSearchModal: React.FC<CatalogSearchModalProps> = ({ onClose, onAddProduct }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (searchTerm.length > 1) {
                searchCatalog();
            } else {
                setResults([]);
            }
        }, 500);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    const searchCatalog = async () => {
        setLoading(true);
        // Search by name, brand, or category
        const { data, error } = await supabase
            .from('products')
            .select('*')
            .or(`name.ilike.%${searchTerm}%,brand.ilike.%${searchTerm}%,category.ilike.%${searchTerm}%`)
            .limit(20);

        if (!error && data) {
            setResults(data);
        }
        setLoading(false);
    };

    const handleAdd = (item: any) => {
        const newProduct: Product = {
            id: Math.random().toString(36).substr(2, 9), // Generate temp ID for the quote session
            name: item.name,
            brand: item.brand,
            description: item.description,
            quantity: 1,
            unit: item.unit || 'u',
            netPrice: item.net_price || 0,
            deliveryType: item.delivery_type || 'immediate',
            deliveryDays: item.delivery_days || 0,
            category: item.category
        };
        onAddProduct(newProduct);
        // Optional: Close after adding? Or keep open to add more? 
        // User might want to add multiple. Let's show a small visual feedback.
    };

    return (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-[2.5rem]">
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight">Buscar en Catálogo</h3>
                        <p className="text-slate-500 text-sm font-medium">Selecciona productos de tu base de datos.</p>
                    </div>
                    <button onClick={onClose} className="p-2 bg-white rounded-full text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all shadow-sm">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                {/* Search Bar */}
                <div className="p-6 pb-2">
                    <div className="relative group">
                        <MagnifyingGlassIcon className="w-6 h-6 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2 group-focus-within:text-blue-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, marca o categoría..."
                            className="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 font-bold text-slate-700 outline-none transition-all shadow-sm"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoFocus
                        />
                    </div>
                </div>

                {/* Results List */}
                <div className="overflow-y-auto flex-1 p-6 space-y-3 custom-scrollbar">
                    {loading ? (
                        <div className="text-center py-10">
                            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-2"></div>
                            <p className="text-slate-400 font-black uppercase text-xs tracking-widest">Buscando...</p>
                        </div>
                    ) : results.length > 0 ? (
                        results.map((item) => (
                            <div key={item.id} className="group bg-white border border-slate-100 p-4 rounded-2xl hover:border-blue-400 hover:shadow-lg transition-all flex justify-between items-center cursor-pointer" onClick={() => handleAdd(item)}>
                                <div className="flex items-start gap-4">
                                    <div className="bg-blue-50 p-3 rounded-xl group-hover:bg-blue-500 transition-colors">
                                        <CubeIcon className="w-6 h-6 text-blue-500 group-hover:text-white" />
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{item.name}</h4>
                                        <p className="text-xs text-slate-500 font-medium line-clamp-1">{item.description}</p>
                                        <div className="flex gap-2 mt-1">
                                            {item.brand && <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded-md font-bold text-slate-500">{item.brand}</span>}
                                            {item.category && <span className="text-[10px] bg-amber-50 px-2 py-0.5 rounded-md font-bold text-amber-600">{item.category}</span>}
                                            <span className="text-[10px] bg-green-50 px-2 py-0.5 rounded-md font-bold text-green-600">${item.net_price?.toLocaleString('es-CL')}</span>
                                        </div>
                                    </div>
                                </div>
                                <button className="bg-slate-50 text-slate-400 p-3 rounded-xl group-hover:bg-blue-600 group-hover:text-white transition-all">
                                    <PlusIcon className="w-5 h-5" />
                                </button>
                            </div>
                        ))
                    ) : searchTerm.length > 1 ? (
                        <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                            <p className="text-slate-400 font-bold">No se encontraron productos.</p>
                        </div>
                    ) : (
                        <div className="text-center py-12 opacity-50">
                            <MagnifyingGlassIcon className="w-12 h-12 mx-auto text-slate-300 mb-2" />
                            <p className="text-slate-400 font-bold">Escribe para buscar</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CatalogSearchModal;
