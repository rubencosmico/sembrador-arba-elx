import React from 'react';
import { ArrowLeft, MapPin, Target, Check, Shield } from 'lucide-react';

const ManualView = ({ onBack }) => {
    return (
        <div className="absolute inset-0 bg-[#f1f5f0] z-50 overflow-y-auto animate-slideRight">
            {/* Header Sticky */}
            <header className="glass-card sticky top-0 z-30 px-6 py-4 flex items-center gap-4 border-b border-amber-100/50 shadow-sm">
                <button
                    onClick={onBack}
                    className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-emerald-950 shadow-sm border border-emerald-100 active:scale-95 transition-all"
                >
                    <ArrowLeft size={20} />
                </button>
                <h2 className="text-xl font-extrabold text-emerald-950">Manual del Sembrador</h2>
            </header>

            <div className="p-6 pb-24 space-y-8 max-w-2xl mx-auto">
                <div className="prose prose-emerald prose-sm">
                    <p className="text-emerald-800/80 font-medium text-lg leading-relaxed">
                        Bienvenido a la aplicación de <span className="font-bold text-emerald-950">Sembrador ARBA Elx</span>.
                        Esta herramienta te permite registrar de manera fácil y rápida las siembras y plantaciones de nuestras jornadas.
                    </p>
                </div>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-200 rounded-full flex items-center justify-center text-xs text-emerald-800">1</span>
                        Estrategia de Trabajo
                    </h3>
                    <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 shadow-sm space-y-3">
                        <p className="font-bold text-amber-900 text-sm">¡Simplifica para ser más eficiente!</p>
                        <ul className="space-y-3 text-sm text-amber-900/80">
                            <li className="flex gap-3">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                <div><strong className="text-amber-950">Configuración Fija:</strong> Elige un tipo de semilla, micrositio y estrategia (sustrato/protector) y mantenla durante un buen rato.</div>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                <div><strong className="text-amber-950">Siembra en Serie:</strong> Muévete y registra sin cambiar las opciones en la app, solo pulsando "Registrar". Irás mucho más rápido.</div>
                            </li>
                            <li className="flex gap-3">
                                <span className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-1.5 flex-shrink-0"></span>
                                <div><strong className="text-amber-950">Cambio de Ciclo:</strong> Cuando cambies de zona o semilla, reconfigura la app y repite el proceso.</div>
                            </li>
                        </ul>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-200 rounded-full flex items-center justify-center text-xs text-emerald-800">2</span>
                        Registrando paso a paso
                    </h3>

                    <div className="space-y-6">
                        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm">
                            <h4 className="font-bold text-emerald-950 mb-2 flex items-center gap-2">
                                <Target size={18} className="text-emerald-500" /> Selección de Semilla
                            </h4>
                            <p className="text-sm text-emerald-800/70">
                                Pulsa el botón grande con la especie que vas a sembrar. Se pondrá <span className="text-emerald-600 font-bold">Verde Intenso</span> cuando esté activa.
                            </p>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm">
                            <h4 className="font-bold text-emerald-950 mb-2">Detalles del Golpe</h4>
                            <ul className="space-y-2 text-sm text-emerald-800/70">
                                <li><strong className="text-emerald-950">Micrositio:</strong> ¿Dónde siembras? (Nodriza Viva, Muerta o Alcorque).</li>
                                <li><strong className="text-emerald-950">Orientación:</strong> ¿Hacia dónde mira el hoyo respecto a la protección?</li>
                                <li><strong className="text-emerald-950">Sustrato:</strong> Márcalo si añades tierra mejorada.</li>
                                <li><strong className="text-emerald-950">Protector:</strong> Márcalo si pones rejilla o tubo.</li>
                            </ul>
                        </div>

                        <div className="bg-white p-5 rounded-3xl border border-emerald-100 shadow-sm">
                            <h4 className="font-bold text-emerald-950 mb-2 flex items-center gap-2">
                                <MapPin size={18} className="text-emerald-500" /> GPS (Importante)
                            </h4>
                            <p className="text-sm text-emerald-800/70 mb-2">
                                Pulsa <strong>Activar GPS</strong> en cada registro o deja que se actualice si te mueves poco.
                            </p>
                            <div className="flex items-center gap-2 text-xs font-bold bg-emerald-50 text-emerald-700 px-3 py-2 rounded-lg inline-flex">
                                <Check size={14} /> Debe poner "GPS OK" antes de guardar
                            </div>
                        </div>
                    </div>
                </section>

                <section className="space-y-4">
                    <h3 className="text-lg font-black text-emerald-900 uppercase tracking-tight flex items-center gap-2">
                        <span className="w-6 h-6 bg-emerald-200 rounded-full flex items-center justify-center text-xs text-emerald-800">3</span>
                        Cuaderno de Campo
                    </h3>
                    <p className="text-sm text-emerald-800/70 leading-relaxed">
                        En la pestaña inferior <strong>Cuaderno</strong> puedes ver todo lo que tu equipo ha registrado. Úsalo para comprobar que tus siembras se están guardando, buscar una especie concreta o ver el total de golpes.
                    </p>
                </section>

                <div className="text-center pt-8 opacity-50">
                    <p className="text-xs font-bold text-emerald-900 uppercase tracking-widest">Gracias por reforestar con ARBA Elx</p>
                </div>
            </div>
        </div>
    );
};

export default ManualView;
