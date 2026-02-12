import React from 'react';
import { ArrowLeftStartOnRectangleIcon } from '@heroicons/react/24/outline';

interface HeaderProps {
    onGoHome: () => void;
    onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ onGoHome, onLogout }) => {
    return (
        <header className="bg-slate-900 text-white py-6 px-4 sticky top-0 z-40 shadow-xl border-b border-white/5">
            <div className="max-w-7xl mx-auto flex justify-between items-center">
                <div className="flex items-center gap-4 cursor-pointer" onClick={onGoHome}>
                    <img src="https://inprotar.cl/wp-content/uploads/2024/06/LOGO-fondo-oscuro2.png" alt="Inprotar" className="h-10 w-auto object-contain" />
                    <div className="h-8 w-px bg-slate-700 mx-2 hidden md:block"></div>
                    <span className="text-xl font-black tracking-widest text-blue-500 uppercase">Cotizador <span className="text-white/20 ml-2 font-mono text-[10px] tracking-normal">Premium v2.0</span></span>
                </div>

                <div className="flex items-center gap-4">
                    <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-full transition-colors group" title="Cerrar Sesión">
                        <ArrowLeftStartOnRectangleIcon className="w-6 h-6 text-slate-400 group-hover:text-red-400 font-bold" strokeWidth={2.5} />
                    </button>
                </div>
            </div>
        </header>
    );
};

export default Header;
