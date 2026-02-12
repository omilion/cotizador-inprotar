import React, { useState } from 'react';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [loginForm, setLoginForm] = useState({ user: '', pass: '' });
    const [loginError, setLoginError] = useState('');

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (loginForm.user === 'enzo' && loginForm.pass === 'Inprotar15#') {
            onLogin();
        } else {
            setLoginError('Credenciales incorrectas');
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4 font-sans text-slate-900">
            <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 to-indigo-600"></div>
                <div className="text-center mb-10">
                    <img src="https://inprotar.cl/wp-content/uploads/2024/06/LOGO-fondo-oscuro2.png" className="h-12 mx-auto mb-6 brightness-0" alt="Inprotar" />
                    <h1 className="text-2xl font-black uppercase tracking-tighter">Acceso de Personal</h1>
                    <p className="text-slate-400 font-medium text-sm mt-2">Cotizador Industrial Premium</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-6">
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Usuario</label>
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                            value={loginForm.user}
                            onChange={e => setLoginForm({ ...loginForm, user: e.target.value })}
                            placeholder="Ej: enzo"
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-2">Contraseña</label>
                        <input
                            type="password"
                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 outline-none focus:ring-2 focus:ring-blue-500 transition-all font-bold"
                            value={loginForm.pass}
                            onChange={e => setLoginForm({ ...loginForm, pass: e.target.value })}
                            placeholder="••••••••"
                        />
                    </div>
                    {loginError && <p className="text-red-500 text-xs font-bold text-center">{loginError}</p>}
                    <button className="w-full bg-slate-900 text-white py-5 rounded-[1.5rem] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-xl active:scale-95">
                        Entrar al Sistema
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;
