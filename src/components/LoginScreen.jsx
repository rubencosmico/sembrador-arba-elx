import React, { useState } from 'react';
import {
    auth,
    GoogleAuthProvider,
    EmailAuthProvider,
    signInWithPopup,
    fetchSignInMethodsForEmail,
    sendPasswordResetEmail,
    sendEmailVerification,
    linkWithCredential
} from '../firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    GoogleAuthProvider as GoogleAuth
} from 'firebase/auth';

const LoginScreen = ({ onLoginSuccess }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isRegistering, setIsRegistering] = useState(false);
    const [isForgotPassword, setIsForgotPassword] = useState(false);
    const [error, setError] = useState('');
    const [message, setMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [linkAccountMode, setLinkAccountMode] = useState(null); // 'google-to-email' | 'email-to-google'

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
                // Check if already exists with Google (Scenario 3)
                const methods = await fetchSignInMethodsForEmail(auth, email);
                if (methods.includes('google.com')) {
                    setError('Ya existe una cuenta con Google para este correo. Por favor, inicia sesión con Google.');
                    setLoading(false);
                    return;
                }

                const result = await createUserWithEmailAndPassword(auth, email, password);
                await sendEmailVerification(result.user);
                setMessage('Cuenta creada. Por favor, revisa tu correo para verificar tu cuenta antes de entrar.');
                // We don't call onLoginSuccess yet because they need to verify
                setIsRegistering(false);
            } else {
                try {
                    const result = await signInWithEmailAndPassword(auth, email, password);
                    if (!result.user.emailVerified) {
                        setError('Por favor, verifica tu correo electrónico antes de continuar.');
                        await auth.signOut();
                        setLoading(false);
                        return;
                    }
                    onLoginSuccess(result.user);
                } catch (err) {
                    if (err.code === 'auth/user-not-found') {
                        setError('La cuenta no existe. Por favor, regístrate.');
                        setIsRegistering(true); // Scenario 1
                    } else if (err.code === 'auth/wrong-password') {
                        setError('Contraseña incorrecta.');
                    } else {
                        // Check if only has Google (Scenario 5)
                        const methods = await fetchSignInMethodsForEmail(auth, email);
                        if (methods.length > 0 && !methods.includes('password')) {
                            setError('Esta cuenta usa Google. Inicia sesión con Google primero y luego podrás establecer una contraseña desde tu perfil.');
                        } else {
                            setError('Error al iniciar sesión.');
                        }
                    }
                }
            }
        } catch (err) {
            setError('Error en la autenticación.');
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
            <div className="max-w-md w-full bg-slate-800/50 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-2xl">
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
                    <div>
                        <input
                            type="password"
                            placeholder="Contraseña"
                            className="w-full bg-slate-900/50 border border-slate-700 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

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
            </div>
        </div>
    );
};

export default LoginScreen;
