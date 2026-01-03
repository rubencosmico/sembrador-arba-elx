import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, orderBy, addDoc, serverTimestamp, doc, getDoc } from 'firebase/firestore';

const ChatWindow = ({ db, user, otherUserId, onBack }) => {
    const [messages, setMessages] = useState([]);
    const [newMessage, setNewMessage] = useState('');
    const [otherUser, setOtherUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Fetch other user profile
        const fetchOtherUser = async () => {
            const userDoc = await getDoc(doc(db, 'users', otherUserId));
            if (userDoc.exists()) setOtherUser(userDoc.data());
        };
        fetchOtherUser();

        // Query messages (simple 1-to-1)
        // In reality, we'd need a composite index for [senderId, receiverId]
        // or a 'chatId' field. For simplicity, we filter on client or use two queries.
        const q = query(
            collection(db, 'messages'),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            const all = snap.docs.map(d => ({ id: d.id, ...d.data() }));
            // Filter only messages between these two
            const filtered = all.filter(m =>
                (m.senderId === user.uid && m.receiverId === otherUserId) ||
                (m.senderId === otherUserId && m.receiverId === user.uid)
            );
            setMessages(filtered);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [db, user.uid, otherUserId]);

    const sendMessage = async (e) => {
        e.preventDefault();
        if (!newMessage.trim() || newMessage.length > 500) return;

        try {
            await addDoc(collection(db, 'messages'), {
                senderId: user.uid,
                receiverId: otherUserId,
                text: newMessage,
                type: 'text',
                createdAt: serverTimestamp()
            });
            setNewMessage('');
        } catch (err) {
            console.error(err);
        }
    };

    return (
        <div className="flex flex-col h-screen bg-slate-900 text-white animate-slide-in">
            {/* Header */}
            <header className="p-4 bg-slate-800 border-b border-slate-700 flex items-center space-x-4">
                <button onClick={onBack} className="p-2 hover:bg-slate-700 rounded-lg">
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-500 font-bold">
                        {otherUser?.displayName?.charAt(0) || 'U'}
                    </div>
                    <div>
                        <div className="font-bold">{otherUser?.displayName || 'Cargando...'}</div>
                        <div className="text-[10px] text-emerald-500">EN LÍNEA</div>
                    </div>
                </div>
            </header>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map(m => {
                    const isMe = m.senderId === user.uid;
                    return (
                        <div key={m.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[80%] p-4 rounded-2xl ${isMe ? 'bg-emerald-500 text-white rounded-tr-none' : 'bg-slate-800 border border-slate-700 rounded-tl-none'
                                }`}>
                                {m.type === 'reference' ? (
                                    <div className="flex flex-col space-y-2">
                                        <div className="text-xs uppercase font-extrabold opacity-60 tracking-wider">ELEMENTO COMPARTIDO</div>
                                        <div className="bg-slate-900/50 p-2 rounded-lg border border-white/10 text-xs">
                                            {m.referenceType}: {m.referenceId}
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-sm leading-relaxed">{m.text}</p>
                                )}
                                <div className={`text-[9px] mt-1 opacity-50 ${isMe ? 'text-right' : 'text-left'}`}>
                                    {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Input Area */}
            <form onSubmit={sendMessage} className="p-4 bg-slate-800 border-t border-slate-700 flex items-center space-x-2">
                <input
                    type="text"
                    placeholder="Escribe un mensaje..."
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-4 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value.slice(0, 500))}
                />
                <button
                    type="submit"
                    className="p-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl transition-all active:scale-95"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                </button>
            </form>
            <div className="px-4 pb-2 text-[10px] text-slate-500 text-right">
                {newMessage.length} / 500
            </div>
        </div>
    );
};

export default ChatWindow;
