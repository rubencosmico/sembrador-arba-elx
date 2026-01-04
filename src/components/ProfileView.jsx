import React, { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, User, Mail, Save, Camera, Globe, Instagram, AlignLeft, Loader2 } from 'lucide-react';

const ProfileView = ({ db, user, userProfile, storage, onBack, onUpdateProfile }) => {
    const [displayName, setDisplayName] = useState(userProfile?.displayName || '');
    const [photoURL, setPhotoURL] = useState(userProfile?.photoURL || '');
    const [bio, setBio] = useState(userProfile?.bio || '');
    const [website, setWebsite] = useState(userProfile?.website || '');
    const [instagram, setInstagram] = useState(userProfile?.instagram || '');

    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState(null);
    const fileInputRef = useRef(null);

    const handleImageClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Check file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            setMessage({ type: 'error', text: 'La imagen es demasiado grande. Máximo 2MB.' });
            return;
        }

        setUploading(true);
        setMessage(null);

        try {
            const storageRef = ref(storage, `users/${user.uid}/profile.jpg`);
            await uploadBytes(storageRef, file);
            const downloadURL = await getDownloadURL(storageRef);

            setPhotoURL(downloadURL);

            // Also update the Firestore document immediately for the photo
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { photoURL: downloadURL });

            if (onUpdateProfile) {
                onUpdateProfile({ ...userProfile, photoURL: downloadURL });
            }

            setMessage({ type: 'success', text: 'Imagen de perfil actualizada.' });
            setTimeout(() => setMessage(null), 3000);
        } catch (err) {
            console.error("Error uploading image:", err);
            setMessage({ type: 'error', text: 'Error al subir la imagen.' });
        } finally {
            setUploading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const userRef = doc(db, 'users', user.uid);
            const updates = {
                displayName,
                bio,
                website,
                instagram
            };

            await updateDoc(userRef, updates);

            if (onUpdateProfile) {
                onUpdateProfile({ ...userProfile, ...updates, photoURL });
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
                    <div className="relative group cursor-pointer" onClick={handleImageClick}>
                        <div className="relative">
                            {photoURL ? (
                                <img src={photoURL} alt="Avatar" className="w-32 h-32 rounded-full border-4 border-emerald-500/30 object-cover shadow-2xl transition-all group-hover:brightness-75" />
                            ) : (
                                <div className="w-32 h-32 rounded-full bg-slate-800 border-4 border-slate-700 flex items-center justify-center text-slate-500 shadow-2xl group-hover:bg-slate-700 transition-colors">
                                    <User className="w-16 h-16" />
                                </div>
                            )}

                            {uploading && (
                                <div className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center">
                                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                                </div>
                            )}

                            {!uploading && (
                                <div className="absolute -bottom-1 -right-1 p-2 bg-emerald-500 rounded-full shadow-lg border-4 border-slate-900 text-white">
                                    <Camera className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    </div>
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept="image/*"
                        className="hidden"
                    />
                    <p className="mt-4 text-slate-400 text-sm font-medium">{user.email}</p>
                </div>

                {message && (
                    <div className={`mb-6 p-4 rounded-2xl text-sm font-medium animate-fade-in ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                        {message.text}
                    </div>
                )}

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Nombre Público</label>
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
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Biografía</label>
                        <div className="relative">
                            <AlignLeft className="absolute left-4 top-4 w-5 h-5 text-slate-500" />
                            <textarea
                                value={bio}
                                onChange={(e) => setBio(e.target.value)}
                                placeholder="Cuéntanos un poco sobre ti..."
                                rows="3"
                                className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-slate-800 transition-all font-medium resize-none"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Sitio Web</label>
                            <div className="relative">
                                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="url"
                                    value={website}
                                    onChange={(e) => setWebsite(e.target.value)}
                                    placeholder="https://tusitio.com"
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-slate-800 transition-all font-medium text-sm"
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-2">Instagram</label>
                            <div className="relative">
                                <Instagram className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                                <input
                                    type="text"
                                    value={instagram}
                                    onChange={(e) => setInstagram(e.target.value)}
                                    placeholder="@usuario o URL"
                                    className="w-full bg-slate-800/50 border border-slate-700 rounded-2xl py-4 pl-12 pr-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:bg-slate-800 transition-all font-medium text-sm"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={saving || uploading}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-emerald-950 font-black py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center space-x-2"
                        >
                            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                            <span>{saving ? 'Guardando...' : 'Guardar Cambios'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProfileView;
