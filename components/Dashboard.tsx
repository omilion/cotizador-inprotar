import React from 'react';
import {
    DocumentPlusIcon,
    ClockIcon,
    CubeIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';

interface DashboardProps {
    onStartNewQuote: () => void;
    onOpenAdmin: (tab: 'quotes' | 'catalog') => void;
    onOpenAIQueue: () => void;
    pendingCount: number;
}

const Dashboard: React.FC<DashboardProps> = ({
    onStartNewQuote,
    onOpenAdmin,
    onOpenAIQueue,
    pendingCount
}) => {
    return (
        <div className="max-w-4xl mx-auto w-full my-auto animate-in fade-in duration-700">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-10">
                {/* Tool 1: New Quote */}
                <button
                    onClick={onStartNewQuote}
                    className="group bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl hover:border-blue-500 hover:shadow-blue-500/10 transition-all text-center flex flex-col items-center gap-6"
                >
                    <div className="w-24 h-24 bg-blue-50 rounded-[2rem] flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500 group-hover:scale-110 shadow-inner">
                        <DocumentPlusIcon className="w-12 h-12 text-blue-600 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Nueva Cotización</h3>
                        <p className="text-slate-400 text-xs font-medium px-4">Crea un documento profesional usando IA o carga manual.</p>
                    </div>
                </button>

                {/* Tool 2: History */}
                <button
                    onClick={() => onOpenAdmin('quotes')}
                    className="group bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl hover:border-slate-900 hover:shadow-slate-900/10 transition-all text-center flex flex-col items-center gap-6"
                >
                    <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center group-hover:bg-slate-900 transition-all duration-500 group-hover:scale-110 shadow-inner">
                        <ClockIcon className="w-12 h-12 text-slate-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Cotizaciones</h3>
                        <p className="text-slate-400 text-xs font-medium px-4">Revisa, re-abre y gestiona tus cotizaciones pasadas.</p>
                    </div>
                </button>

                {/* Tool 3: Catalog */}
                <button
                    onClick={() => onOpenAdmin('catalog')}
                    className="group bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl hover:border-blue-600 hover:shadow-blue-600/10 transition-all text-center flex flex-col items-center gap-6"
                >
                    <div className="w-24 h-24 bg-blue-50/50 rounded-[2rem] flex items-center justify-center group-hover:bg-blue-600 transition-all duration-500 group-hover:scale-110 shadow-inner">
                        <CubeIcon className="w-12 h-12 text-blue-400 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Panel de Administración</h3>
                        <p className="text-slate-400 text-xs font-medium px-4">Gestiona el inventario maestro de productos y precios.</p>
                    </div>
                </button>

                {/* Tool 4: Pending IA */}
                <button
                    onClick={onOpenAIQueue}
                    className="group bg-white p-10 rounded-[3.5rem] border border-slate-200 shadow-xl hover:border-amber-500 hover:shadow-amber-500/10 transition-all text-center flex flex-col items-center gap-6 relative"
                >
                    {pendingCount > 0 && (
                        <span className="absolute top-8 right-12 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-full animate-bounce shadow-lg">
                            {pendingCount} PENDIENTES
                        </span>
                    )}
                    <div className="w-24 h-24 bg-amber-50 rounded-[2rem] flex items-center justify-center group-hover:bg-amber-500 transition-all duration-500 group-hover:scale-110 shadow-inner">
                        <SparklesIcon className="w-12 h-12 text-amber-500 group-hover:text-white transition-colors" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight">Cola de IA</h3>
                        <p className="text-slate-400 text-xs font-medium px-4">Valida nuevos productos detectados automágicamente.</p>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default Dashboard;
