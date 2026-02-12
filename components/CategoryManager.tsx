import React, { useState, useEffect } from 'react';
import { supabase } from '../services/supabaseClient';
import { PlusIcon, TrashIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface Category {
    id: string;
    name: string;
}

interface CategoryManagerProps {
    onClose: () => void;
    onCategoryAdded: (category: string) => void;
}

const CategoryManager: React.FC<CategoryManagerProps> = ({ onClose, onCategoryAdded }) => {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    const fetchCategories = async () => {
        const { data } = await supabase.from('categories').select('*').order('name');
        if (data) setCategories(data);
    };

    const handleAdd = async () => {
        if (!newCategory.trim()) return;
        setLoading(true);
        const { data, error } = await supabase.from('categories').insert({ name: newCategory.trim() }).select().single();
        if (error) {
            alert("Error: " + error.message);
        } else {
            setCategories([...categories, data]);
            onCategoryAdded(data.name);
            setNewCategory('');
        }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Eliminar categoría?")) return;
        const { error } = await supabase.from('categories').delete().eq('id', id);
        if (!error) {
            setCategories(categories.filter(c => c.id !== id));
        }
    };

    return (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-[2rem] p-8 w-full max-w-md shadow-2xl animate-in zoom-in-95 relative">
                <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-900">
                    <XMarkIcon className="w-6 h-6" />
                </button>

                <h3 className="text-2xl font-black text-slate-900 mb-6">Administrar Categorías</h3>

                <div className="flex gap-2 mb-6">
                    <input
                        className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 flex-grow outline-none focus:border-blue-500 font-bold text-sm"
                        placeholder="Nueva Categoría"
                        value={newCategory}
                        onChange={e => setNewCategory(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAdd()}
                    />
                    <button
                        onClick={handleAdd}
                        disabled={loading || !newCategory.trim()}
                        className="bg-blue-600 text-white p-2 rounded-xl hover:bg-blue-500 disabled:opacity-50"
                    >
                        <PlusIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                    {categories.map(cat => (
                        <div key={cat.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-100 group">
                            <span className="font-bold text-slate-700 text-sm">{cat.name}</span>
                            <button onClick={() => handleDelete(cat.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                    {categories.length === 0 && <p className="text-center text-xs text-slate-400 font-medium py-4">No hay categorías registradas.</p>}
                </div>
            </div>
        </div>
    );
};

export default CategoryManager;
