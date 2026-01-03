import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';

const MessagesView = ({ db, user, onSelectChat, onBack }) => {
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Find users I've messaged or who messaged me
        const q = query(collection(db, 'messages'));
        const unsubscribe = onSnapshot(q, async (snap) => {
            const msgs = snap.docs.map(d => d.data());
            const partnerIds = new Set();

            msgs.forEach(m => {
                if (m.senderId === user.uid) partnerIds.add(m.receiverId);
                if (m.receiverId === user.uid) partnerIds.add(m.senderId);
            });

            const conversationData = await Promise.all(
                Array.from(partnerIds).map(async (pId) => {
                    const uDoc = await getDoc(doc(db, 'users', pId));
                    const lastMsg = msgs.filter(m => (m.senderId === user.uid && m.receiverId === pId) || (m.senderId === pId && m.receiverId === user.uid))
                        .sort((a, b) => b.createdAt?.seconds - a.createdAt?.seconds)[0];
                    return {
                        id: pId,
                        profile: uDoc.exists() ? uDoc.data() : { displayName: 'Usuario desconocido' },
                        lastMessage: lastMsg
                    };
                })
            );

            setConversations(conversationData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, user.uid]);

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6">
            <header className="flex items-center justify-between mb-8">
                <button onClick={onBack} className="p-2 hover:bg-slate-800 rounded-lg">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <h2 className="text-xl font-bold">Mensajes</h2>
                <button className="p-2 text-emerald-500">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                </button>
            </header>

            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => <div key={i} className="h-20 bg-slate-800/30 rounded-2xl animate-pulse"></div>)}
                </div>
            ) : conversations.length === 0 ? (
                <div className="py-20 text-center">
                    <p className="text-slate-500">No tienes conversaciones todavía.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {conversations.map(conv => (
                        <div
                            key={conv.id}
                            onClick={() => onSelectChat(conv.id)}
                            className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-2xl flex items-center space-x-4 cursor-pointer transition-all"
                        >
                            <div className="relative">
                                <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold border border-emerald-500/10">
                                    {conv.profile.displayName?.charAt(0) || 'U'}
                                </div>
                                <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-800 rounded-full"></div>
                            </div>
                            <div className="flex-1 min-w-0">
                                <div className="flex justify-between items-baseline mb-1">
                                    <h4 className="font-bold text-sm text-slate-200 truncate">{conv.profile.displayName}</h4>
                                    <span className="text-[10px] text-slate-500">
                                        {conv.lastMessage?.createdAt?.toDate ? conv.lastMessage.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                    </span>
                                </div>
                                <p className="text-xs text-slate-500 truncate">
                                    {conv.lastMessage?.text || 'Envió un elemento'}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MessagesView;
