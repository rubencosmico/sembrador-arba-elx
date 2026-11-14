/**
 * Validates password strength and returns score and requirements.
 * Score: 0 (very weak) to 4 (strong)
 */
export const validatePassword = (password) => {
    const requirements = [
        { id: 'length', label: 'Mínimo 8 caracteres', test: (p) => p.length >= 8 },
        { id: 'upper', label: 'Una mayúscula', test: (p) => /[A-Z]/.test(p) },
        { id: 'number', label: 'Un número', test: (p) => /[0-9]/.test(p) },
        { id: 'special', label: 'Un carácter especial (@$!%*?&)', test: (p) => /[@$!%*?&]/.test(p) }
    ];

    const results = requirements.map(req => ({
        ...req,
        met: req.test(password)
    }));

    const score = results.filter(r => r.met).length;

    return {
        score,
        results,
        isValid: score === requirements.length
    };
};

export const getStrengthLabel = (score) => {
    switch (score) {
        case 0: return { label: 'Muy débil (No válida)', color: 'bg-red-500' };
        case 1: return { label: 'Débil (No válida)', color: 'bg-orange-500' };
        case 2: return { label: 'Media (No válida)', color: 'bg-yellow-500' };
        case 3: return { label: 'Buena (No válida)', color: 'bg-emerald-400' };
        case 4: return { label: 'Fuerte (Válida)', color: 'bg-emerald-600' };
        default: return { label: '', color: 'bg-slate-700' };
    }
};
