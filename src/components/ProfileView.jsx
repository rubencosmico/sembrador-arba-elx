import React, { useState, useRef } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { ArrowLeft, User, Mail, Save, Camera, Globe, Instagram, AlignLeft, Loader2 } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';

const ProfileView = ({ db, user, userProfile, storage, onBack, onUpdateProfile, onNavigate }) => {
    // ... existing states ...
    const [showPasswordModal, setShowPasswordModal] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // ... existing functions ...

    const handleLinkGoogle = async () => {
        setMessage(null);
        const provider = new GoogleAuthProvider();
        try {
            await linkWithCredential(user, provider); // This works if they are already logged in
            setMessage({ type: 'success', text: 'Cuenta de Google vinculada correctamente.' });
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error al vincular Google.' });
        }
    };

    const handleSetPassword = async (e) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            setMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
            return;
        }
        setSaving(true);
        try {
            // In Firebase, setting a password for a Google user effectively "links" email/pass
            // But we use updatePassword if they have a session, 
            // however if they don't have 'password' provider yet, they might need to use linkWithCredential or similar.
            // Actually for Scenario 5: they are logged with Google and want to set a pass.
            // Best way: use linkWithCredential with EmailAuthProvider.credential(user.email, newPassword)
            const credential = EmailAuthProvider.credential(user.email, newPassword);
            await linkWithCredential(user, credential);

            setMessage({ type: 'success', text: 'Contraseña establecida. Ahora puedes entrar con ambos métodos.' });
            setShowPasswordModal(false);
        } catch (err) {
            console.error(err);
            setMessage({ type: 'error', text: 'Error al establecer la contraseña.' });
        } finally {
            setSaving(false);
        }
    };
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
            <header className="flex items-center space-x-4 mb-8 text-left">
                <button onClick={onBack} className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 transition-colors">
                    <ArrowLeft className="w-6 h-6" />
                </button>
                <div className="flex flex-col">
                    <Breadcrumbs currentView="profile" onNavigate={onNavigate} />
                    <h2 className="text-2xl font-bold">Mi Perfil</h2>
                </div>
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

                {/* Account Settings (Scenario 5 & 6) */}
                <div className="mt-12 pt-8 border-t border-slate-800 space-y-6">
                    <h3 className="text-xl font-bold text-white mb-4">Seguridad y Cuenta</h3>

                    {/* Link Google */}
                    <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50 flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                            <div className="p-2 bg-white/10 rounded-lg">
                                <svg className="w-5 h-5" viewBox="0 0 24 24">
                                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-sm font-bold">Google</p>
                                <p className="text-xs text-slate-500">
                                    {user.providerData.some(p => p.providerId === 'google.com') ? 'Vinculado' : 'No vinculado'}
                                </p>
                            </div>
                        </div>
                        {!user.providerData.some(p => p.providerId === 'google.com') && (
                            <button
                                onClick={handleLinkGoogle}
                                className="text-xs font-bold bg-emerald-500/10 text-emerald-400 px-3 py-2 rounded-lg hover:bg-emerald-500/20 transition-colors"
                            >
                                Vincular
                            </button>
                        )}
                    </div>

                    {/* Password Setting (Scenario 5) */}
                    <div className="bg-slate-800/30 rounded-2xl p-4 border border-slate-700/50">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center space-x-3">
                                <div className="p-2 bg-emerald-500/10 rounded-lg">
                                    <Mail className="w-5 h-5 text-emerald-500" />
                                </div>
                                <div>
                                    <p className="text-sm font-bold">Email y Contraseña</p>
                                    <p className="text-xs text-slate-500">
                                        {user.providerData.some(p => p.providerId === 'password') ? 'Configurado' : 'Solo Google'}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowPasswordModal(true)}
                            className={`w-full text-xs font-bold py-3 rounded-lg transition-colors ${!user.providerData.some(p => p.providerId === 'password')
                                ? 'bg-emerald-500 text-emerald-950 hover:bg-emerald-600'
                                : 'text-slate-400 hover:text-white bg-slate-800'
                                }`}
                        >
                            {user.providerData.some(p => p.providerId === 'password') ? 'Cambiar contraseña' : 'Establecer contraseña'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Password Modal */}
            {showPasswordModal && (
                <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl animate-fade-in">
                        <h3 className="text-2xl font-bold mb-6">Configurar Contraseña</h3>
                        <form onSubmit={handleSetPassword} className="space-y-4">
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-black mb-2 block tracking-widest">Nueva Contraseña</label>
                                <input
                                    type="password"
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-white"
                                    required
                                />
                            </div>
                            <div>
                                <label className="text-xs text-slate-500 uppercase font-black mb-2 block tracking-widest">Confirmar Contraseña</label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-xl py-4 px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 text-white"
                                    required
                                />
                            </div>
                            <div className="pt-4 flex space-x-4">
                                <button
                                    type="button"
                                    onClick={() => setShowPasswordModal(false)}
                                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-bold py-4 rounded-xl transition-all"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={saving}
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-black py-4 rounded-xl transition-all"
                                >
                                    {saving ? 'Guardando...' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfileView;
