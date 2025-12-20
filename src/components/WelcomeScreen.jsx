import React from 'react';
import { Leaf, ClipboardList, ArrowRight, Users, LogOut } from 'lucide-react';

const WelcomeScreen = ({ setRole, campaignName, onBack }) => (
    <div className="relative flex flex-col items-center justify-center h-screen bg-[#f1f5f0] p-6 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute -top-24 -left-24 w-64 h-64 bg-emerald-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-pulse delay-700"></div>

        {/* Back Button */}
        <button
            onClick={onBack}
            className="absolute top-6 left-6 z-20 flex items-center gap-2 text-emerald-800/50 hover:text-emerald-800 font-bold text-sm bg-white/50 p-2 rounded-xl backdrop-blur-sm transition-all hover:bg-white"
        >
            <LogOut size={16} className="rotate-180" />
            <span>Salir de {campaignName}</span>
        </button>

        <div className="relative z-10 text-center space-y-2 mb-12 animate-slideUp">
            <div className="inline-flex p-4 rounded-3xl glass-card mb-4 text-emerald-700 shadow-xl border border-emerald-50">
                <Leaf size={48} strokeWidth={1.5} />
            </div>
            <h1 className="text-4xl font-extrabold text-emerald-950 tracking-tight">
                Sembrador <span className="text-emerald-600">ARBA</span>
            </h1>
            <p className="text-emerald-800/60 font-medium">{campaignName}</p>
        </div>

        <div className="relative z-10 w-full max-w-sm space-y-4 animate-slideUp [animation-delay:200ms]">
            <button
                onClick={() => setRole('coordinator')}
                className="btn-premium w-full group flex items-center p-1 rounded-3xl bg-white border border-emerald-100 hover:border-emerald-500 transition-all hover:scale-[1.02]"
            >
                <div className="bg-emerald-600 text-white p-4 rounded-2xl group-hover:bg-emerald-700 transition-colors shadow-lg">
                    <ClipboardList size={24} />
                </div>
                <div className="flex-1 text-left pl-4">
                    <div className="text-emerald-950 font-bold text-lg">Soy Coordinador</div>
                    <div className="text-emerald-800/50 text-xs font-semibold">Gestionar semillas y equipos</div>
                </div>
                <div className="pr-4 text-emerald-200 group-hover:text-emerald-500 transition-colors">
                    <ArrowRight size={20} />
                </div>
            </button>

            <button
                onClick={() => setRole('sower')}
                className="btn-premium w-full group flex items-center p-1 rounded-3xl bg-white border border-amber-100 hover:border-amber-500 transition-all hover:scale-[1.02]"
            >
                <div className="bg-amber-600 text-white p-4 rounded-2xl group-hover:bg-amber-700 transition-colors shadow-lg">
                    <Users size={24} />
                </div>
                <div className="flex-1 text-left pl-4">
                    <div className="text-emerald-950 font-bold text-lg">Soy Sembrador</div>
                    <div className="text-emerald-800/50 text-xs font-semibold">Registrar golpes en campo</div>
                </div>
                <div className="pr-4 text-emerald-100 group-hover:text-amber-500 transition-colors">
                    <ArrowRight size={20} />
                </div>
            </button>
        </div>

        <div className="absolute bottom-8 text-[10px] font-bold text-emerald-900/40 uppercase tracking-[0.2em]">
            ARBA Elx • Sistema de Jornadas
        </div>
    </div>
);

export default WelcomeScreen;
