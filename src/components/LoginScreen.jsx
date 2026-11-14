import React, { useState } from 'react';
import {
    auth,
    GoogleAuthProvider,
    EmailAuthProvider,
    signInWithPopup,
    fetchSignInMethodsForEmail,
    sendPasswordResetEmail,
    sendEmailVerification,
    linkWithCredential,
    sendSignInLinkToEmail
} from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider as GoogleAuth
} from 'firebase/auth';
import { validatePassword, getStrengthLabel } from '../utils/auth-utils';
import { Eye, EyeOff, Check, X, Mail, ArrowLeft } from 'lucide-react';

const LoginScreen = ({ onLoginSuccess, onBack }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [passwordError, setPasswordError] = useState(null);

    const handleGoogleLogin = async () => {
        setLoading(true);
        setError('');
        setMessage('');
        const provider = new GoogleAuthProvider();
        try {
            // First check if email exists with another method
            // Note: Firebase signInWithPopup handles many things, but for scenario 4/6:
            const result = await signInWithPopup(auth, provider);
            const userEmail = result.user.email;

            // If we successfully login but we want to check if they should link
            // Actually Firebase often throws an error if already linkable, 
            // but if they just logged in, we check if they have other methods.
            const methods = await fetchSignInMethodsForEmail(auth, userEmail);
            if (methods.includes('password') && methods.length > 1) {
                // Already has password, successful login with Google is fine.
            }

            onLoginSuccess(result.user);
        } catch (err) {
            if (err.code === 'auth/account-exists-with-different-credential') {
                setError('Ya existe una cuenta con este correo usando otro método. Inicia sesión con tu correo para vincular esta cuenta de Google.');
            } else {
                setError('Error al iniciar sesión con Google.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleEmailAuth = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            if (isRegistering) {
                if (password !== confirmPassword) {
                    setError('Las contraseñas no coinciden.');
                    setLoading(false);
                    return;
                }
                const validation = validatePassword(password);
                if (!validation.isValid) {
                    setError('La contraseña no cumple los requisitos de seguridad.');
                    setLoading(false);
                    return;
                }
                try {
                    const result = await createUserWithEmailAndPassword(auth, email, password);
                    await sendEmailVerification(result.user);
                    setMessage('Cuenta creada. Por favor, revisa tu correo para verificar tu cuenta antes de entrar.');
                    setIsRegistering(false);
                } catch (err) {
                    if (err.code === 'auth/email-already-in-use') {
                        setError('Este correo ya está registrado. Por favor, inicia sesión con tu contraseña o con Google si vinculaste tu cuenta.');
                        setIsRegistering(false); // Sugerimos ir a login
                    } else if (err.code === 'auth/weak-password') {
                        setError('La contraseña es demasiado débil. Usa al menos 6 caracteres.');
                    } else if (err.code === 'auth/invalid-email') {
                        setError('El correo electrónico no es válido.');
                    } else {
                        throw err;
                    }
                }
            } else {
                try {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    const hasOtherProviders = result.user.providerData.length > 1;
                    if (!result.user.emailVerified && !hasOtherProviders) {
                        setError('Por favor, verifica tu correo electrónico antes de continuar.');
                        await auth.signOut();
                        setLoading(false);
                        return;
                    }
                    onLoginSuccess(result.user);
                } catch (err) {
                    // Con protección de enumeración activada, Firebase suele devolver 'auth/invalid-credential'
                    // para cualquier fallo de login (usuario no existe o clave mal).
                    if (err.code === 'auth/wrong-password' || err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential') {
                        setError('Correo o contraseña incorrectos.');
                    } else {
                        throw err;
                    }
                }
            }
        } catch (err) {
            setError('Error en la autenticación. Por favor, reinténtalo.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setMessage('');
        try {
            await sendPasswordResetEmail(auth, email);
            setMessage('Se ha enviado un correo para restablecer tu contraseña.');
            setIsForgotPassword(false);
        } catch (err) {
            setError('Error al enviar el correo de recuperación.');
        } finally {
            setLoading(false);
        }
    };

    const handleMagicLink = async (e) => {
        e.preventDefault();
        if (!email) {
            setError('Por favor, introduce tu email primero.');
            return;
        }
        setLoading(true);
        setError('');
        setMessage('');
        try {
            const actionCodeSettings = {
                url: window.location.href,
                handleCodeInApp: true,
            };
            await sendSignInLinkToEmail(auth, email, actionCodeSettings);
            window.localStorage.setItem('emailForSignIn', email);
            setMessage('¡Enlace enviado! Revisa tu bandeja de entrada para entrar sin contraseña.');
        } catch (err) {
            console.error(err);
            setError('Error al enviar el enlace de acceso.');
        } finally {
            setLoading(false);
        }
    };

    if (isForgotPassword) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
                <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                    <h2 className="text-2xl font-bold text-white mb-6 text-center">Recuperar Contraseña</h2>
                    <form onSubmit={handlePasswordReset} className="space-y-4">
                        <input
                            type="email"
                            placeholder="Tu email"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                        <button type="submit" disabled={loading} className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-semibold py-3 rounded-xl">
                            {loading ? 'Enviando...' : 'Enviar Email de Recuperación'}
                        </button>
                    </form>
                    <button onClick={() => setIsForgotPassword(false)} className="mt-4 w-full text-slate-400 hover:text-white transition-colors">Volver</button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4 transition-all duration-500">
            <div className="relative max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
                {onBack && (
                    <button
                        type="button"
                        onClick={onBack}
                        className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={16} />
                        <span>Volver</span>
                    </button>
                )}
                <div className="text-center mb-10">
                    <div className="inline-block p-4 rounded-2xl bg-emerald-500/10 mb-4">
                        <svg className="w-12 h-12 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Sembrador Elx</h1>
                    <p className="text-slate-400">Únete a la reforestación impulsada por la comunidad</p>
                </div>

                {error && (
                    <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                        {error}
                    </div>
                )}
                {message && (
                    <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
                        {message}
                    </div>
                )}

                <form onSubmit={handleEmailAuth} className="space-y-4">
                    <div>
                        <input
                            type="email"
                            placeholder="Tu email"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>
                    <div className="relative group">
                        <input
                            type={showPassword ? "text" : "password"}
                            placeholder="Contraseña"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                        >
                            {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                    </div>

                    {isRegistering && password.length > 0 && (
                        <div className="space-y-4 animate-fade-in">
                            <div className="space-y-3">
                                <div className="flex justify-between items-center mb-1">
                                    <div className="flex flex-col">
                                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seguridad</span>
                                        <span className="text-[9px] text-slate-600">Completa todos los requisitos para continuar</span>
                                    </div>
                                    <span className={`text-xs font-bold ${getStrengthLabel(validatePassword(password).score).color.replace('bg-', 'text-')}`}>
                                        {getStrengthLabel(validatePassword(password).score).label}
                                    </span>
                                </div>
                                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex gap-0.5">
                                    {[...Array(4)].map((_, i) => (
                                        <div
                                            key={i}
                                            className={`h-full flex-1 transition-all duration-500 ${i < validatePassword(password).score ? getStrengthLabel(validatePassword(password).score).color : 'bg-slate-700'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <div className="grid grid-cols-2 gap-2 mt-2">
                                    {validatePassword(password).results.map(res => (
                                        <div key={res.id} className="flex items-center space-x-2">
                                            {res.met ? <Check size={12} className="text-emerald-500" /> : <X size={12} className="text-slate-600" />}
                                            <span className={`text-[10px] ${res.met ? 'text-slate-300' : 'text-slate-500'}`}>{res.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="relative group">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Repite tu contraseña"
                                    className={`w-full bg-slate-900/50 border rounded-xl px-4 py-3 text-white focus:outline-none transition-all ${confirmPassword.length > 0
                                        ? (password === confirmPassword ? 'border-emerald-500 focus:ring-emerald-500/50' : 'border-red-500 focus:ring-red-500/50')
                                        : 'border-slate-700 focus:ring-2 focus:ring-emerald-500/50'
                                        }`}
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                />
                                {confirmPassword.length > 0 && (
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2">
                                        {password === confirmPassword
                                            ? <Check size={18} className="text-emerald-500" />
                                            : <X size={18} className="text-red-500" />
                                        }
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="text-right">
                        {!isRegistering && (
                            <button type="button" onClick={() => setIsForgotPassword(true)} className="text-sm text-slate-400 hover:text-emerald-500 transition-colors">
                                ¿Olvidaste tu contraseña?
                            </button>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white font-semibold py-3 rounded-xl shadow-lg shadow-emerald-500/20 transition-all transform active:scale-[0.98]"
                    >
                        {loading ? 'Procesando...' : (isRegistering ? 'Crear Cuenta' : 'Iniciar Sesión')}
                    </button>

                    {!isRegistering && (
                        <button
                            type="button"
                            onClick={handleMagicLink}
                            disabled={loading}
                            className="w-full bg-slate-800 hover:bg-slate-700 text-emerald-400 font-semibold py-3 rounded-xl border border-slate-700 transition-all flex items-center justify-center space-x-2"
                        >
                            <Mail size={18} />
                            <span>Entrar sin contraseña (Magic Link)</span>
                        </button>
                    )}
                </form>

                <div className="relative my-8">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-slate-700"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-[#1a2233] text-slate-500">O continua con</span>
                    </div>
                </div>

                <button
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full bg-white hover:bg-slate-100 text-slate-900 font-semibold py-3 rounded-xl shadow-lg flex items-center justify-center space-x-3 transition-all transform active:scale-[0.98]"
                >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" />
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                    </svg>
                    <span>Google</span>
                </button>

                <div className="mt-8 text-center text-sm text-slate-400">
                    {isRegistering ? '¿Ya tienes cuenta?' : '¿Eres nuevo aquí?'}
                    <button
                        onClick={() => setIsRegistering(!isRegistering)}
                        className="ml-2 text-emerald-500 font-semibold hover:text-emerald-400 transition-colors"
                    >
                        {isRegistering ? 'Inicia sesión' : 'Regístrate'}
                    </button>
                </div>

                {onBack && (
                    <div className="mt-4 text-center">
                        <button
                            type="button"
                            onClick={onBack}
                            className="text-xs text-slate-400 hover:text-white underline underline-offset-4 transition-colors"
                        >
                            Continuar como invitado / Volver
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default LoginScreen;
