import React, { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ArrowLeft, User, Mail, Save, Camera } from 'lucide-react';

const ProfileView = ({ db, user, userProfile, onBack, onUpdateProfile }) => {
    const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
    const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, {
                displayName,
                photoURL
            });

            if (onUpdateProfile) {
                onUpdateProfile({ ...userProfile, displayName, photoURL });
            }

            setMessage({ type: 'success', text: '¡Perfil actualizado correctamente!' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error("Error actualizando perfil:", err);
            setMessage({ type: 'error', text: 'Error al actualizar el perfil.' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 pb-24 font-sans">
            <header className="flex items-center space-x-4 mb-8">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <h2 className="text-2xl font-bold">Mi Perfil</h2>
            </header>

            <div className="max-w-md mx-auto animate-fade-in">
                {/* Avatar Preview */}
                <div className="flex flex-col items-center mb-10">
                    <div className="relative group">
                        {photoURL ? (
                            <img src={photoURL} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-emerald-500/30 object-cover shadow-2xl" />
                        ) : (
                            <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center text-slate-500 shadow-2xl">
                                <User className="w-16 h-16" />
                            </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                            <Camera className="w-8 h-8 text-white" />
                        </div>
                    </div>
                    <p className="mt-4 text-slate-400 text-sm">{user.email}</p>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-2xl text-sm font-medium ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Nombre Público</label>
                        <div className="relative">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="text"
                                value={displayName}
                                onChange={(e) => setDisplayName(e.target.value)}
                                placeholder="Tu nombre..."
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-slate-800 transition-all font-medium"
                                required
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-widest ml-2">Foto de Perfil (URL)</label>
                        <div className="relative">
                            <Camera className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                            <input
                                type="url"
                                value={photoURL}
                                onChange={(e) => setPhotoURL(e.target.value)}
                                placeholder="https://ejemplo.com/foto.jpg"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-slate-800 transition-all font-medium"
                            />
                        </div>
                        <p className="text-[10px] text-slate-500 ml-2">Pega la URL de una imagen para tu avatar.</p>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={saving}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                        >
                            <Save className="w-5 h-5" />
                            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileView;
