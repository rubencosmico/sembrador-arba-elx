import React from 'react';
import { Sprout } from 'lucide-react';

const LoadingScreen = () => (
    <div className="flex flex-col items-center justify-center h-screen bg-[#f1f5f0] text-emerald-800">
        <div className="relative">
            <div className="w-20 h-20 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
            <Sprout className="w-10 h-10 text-emerald-600 absolute inset-0 m-auto animate-pulse" />
        </div>
        <p className="mt-6 font-semibold tracking-wide animate-pulse-subtle">Sincronizando con la tierra...</p>
    </div>
);

export default LoadingScreen;
