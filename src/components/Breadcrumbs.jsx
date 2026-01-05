import React from 'react';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumbs = ({ campaign, role, currentView, onNavigate }) => {
    const items = [{ id: 'home', label: 'Inicio', icon: Home }];

    if (currentView === 'profile') items.push({ id: 'profile', label: 'Mi Perfil' });
    else if (currentView === 'manage' && !campaign) items.push({ id: 'manage', label: 'Mis Jornadas' });
    else if (currentView === 'social') items.push({ id: 'social', label: 'Comunidad' });
    else if (currentView === 'messages' || currentView === 'chat') items.push({ id: 'messages', label: 'Mensajes' });
    else if (currentView === 'claim') items.push({ id: 'claim', label: 'Recuperar Registros' });

    if (campaign) {
        items.push({ id: 'campaign', label: campaign.name });
        if (role === 'sower') {
            items.push({ id: 'sower', label: 'Sembrador' });
        } else if (role === 'coordinator') {
            items.push({ id: 'coordinator', label: 'Gestión' });
        }
    }

    return (
        <nav className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-2 px-1 text-[10px] font-black uppercase tracking-widest text-slate-500">
            {items.map((item, index) => (
                <React.Fragment key={item.id}>
                    {index > 0 && <ChevronRight size={12} className="text-slate-700 mx-0.5" />}
                    <button
                        onClick={() => onNavigate(item.id)}
                        disabled={index === items.length - 1}
                        className={`flex items-center gap-1.5 transition-all whitespace-nowrap ${index === items.length - 1
                                ? 'text-emerald-500 cursor-default'
                                : 'hover:text-slate-300 active:scale-95'
                            }`}
                    >
                        {item.icon && <item.icon size={12} />}
                        {item.label}
                    </button>
                </React.Fragment>
            ))}
        </nav>
    );
};

export default Breadcrumbs;
