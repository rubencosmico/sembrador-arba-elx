import React, { useState, useEffect } from 'react';
import { collection, query, getDocs, doc, setDoc, deleteDoc, onSnapshot, where } from 'firebase/firestore';

const SocialView = ({ db, user, onBack, onChatClick }) => {
    const [users, setUsers] = useState([]);
    const [following, setFollowing] = useState(new Set());
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // 1. Fetch all users
        const fetchUsers = async () => {
            const snap = await getDocs(collection(db, 'users'));
            setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.id !== user.uid));
        };
        fetchUsers();

        // 2. Listen to my follows
        const q = query(collection(db, 'follows'), where('followerId', '==', user.uid));
        const unsubscribe = onSnapshot(q, (snap) => {
            setFollowing(new Set(snap.docs.map(d => d.data().followingId)));
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, user.uid]);

    const handleFollow = async (targetId) => {
        const followId = `${user.uid}_${targetId}`;
        const followRef = doc(db, 'follows', followId);

        if (following.has(targetId)) {
            await deleteDoc(followRef);
        } else {
            await setDoc(followRef, {
                followerId: user.uid,
                followingId: targetId,
                createdAt: new Date()
            });
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <header className="flex items-center justify-between mb-10">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold italic tracking-tighter">COMUNIDAD</h2>
                <div className="w-10"></div>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {users.map(u => (
                    <div key={u.id} className="bg-slate-800/40 border border-slate-700/50 rounded-3xl p-6 flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/20">
                                {u.displayName?.charAt(0) || 'U'}
                            </div>
                            <div>
                                <div className="font-bold text-slate-100">{u.displayName}</div>
                                <div className="text-xs text-slate-500 uppercase tracking-widest">{u.defaultRole || 'Sembrador'}</div>
                            </div>
                        </div>

                        <div className="flex space-x-2">
                            <button
                                onClick={() => onChatClick(u.id)}
                                className="p-2 bg-slate-700 hover:bg-slate-600 rounded-xl transition-all"
                                title="Enviar Mensaje"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                                </svg>
                            </button>
                            <button
                                onClick={() => handleFollow(u.id)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${following.has(u.id)
                                        ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/30'
                                        : 'bg-emerald-500 text-white'
                                    }`}
                            >
                                {following.has(u.id) ? 'SIGUIENDO' : 'SEGUIR'}
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default SocialView;
