import React, { useState, useEffect } from 'react';
import { ref, listAll, getMetadata, getDownloadURL } from 'firebase/storage';
import { collection, getDocs, query } from 'firebase/firestore';

const StorageDiagnostic = ({ db, storage, appId }) => {
    const [files, setFiles] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [orphanFiles, setOrphanFiles] = useState([]);
    const [analyzing, setAnalyzing] = useState(false);

    const runDiagnostic = async () => {
        setLoading(true);
        setFiles([]);
        setLogs([]);
        setOrphanFiles([]);

        try {
            // 1. List files in storage photos/logs
            const listRef = ref(storage, 'photos/logs');
            const res = await listAll(listRef);

            const filePromises = res.items.map(async (itemRef) => {
                try {
                    const url = await getDownloadURL(itemRef);
                    const metadata = await getMetadata(itemRef);
                    return {
                        name: itemRef.name,
                        fullPath: itemRef.fullPath,
                        url,
                        timeCreated: metadata.timeCreated,
                        size: metadata.size,
                        ref: itemRef
                    };
                } catch (e) {
                    console.error("Error fetching metadata for", itemRef.name, e);
                    return { name: itemRef.name, error: true };
                }
            });

            const storageFiles = await Promise.all(filePromises);
            setFiles(storageFiles);

            // 2. Fetch all logs from Firestore to compare
            // Note: We need to search ALL campaigns potentially, or at least the current structure.
            // Structure is artifacts/{appId}/public/data/logs
            const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
            const logsSnap = await getDocs(query(logsRef)); // Get EVERYTHING
            const dbLogs = logsSnap.docs.map(doc => ({
                id: doc.id,
                photoUrl: doc.data().photoUrl,
                ...doc.data()
            }));
            setLogs(dbLogs);

            // 3. Analyze Orphans
            analyzeOrphans(storageFiles, dbLogs);

        } catch (error) {
            console.error("Diagnostic error:", error);
            alert("Error running diagnostic: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    const analyzeOrphans = (storageFiles, dbLogs) => {
        setAnalyzing(true);
        // Extract all photo URLs used in DB
        const usedUrls = new Set(dbLogs.map(l => l.photoUrl).filter(Boolean));

        // Find files whose URL is NOT in the used set
        const orphans = storageFiles.filter(f => {
            if (f.error) return false;
            // Simple check: is the download URL present in any log?
            // Note: Token parameters in URL might change, causing strict equality check to fail?
            // Usually getDownloadURL returns a stable URL with a token. Firestore saves that same URL.
            // A more robust check is to check if the filename is part of the stored URL.

            // Storage URL format: .../o/photos%2Flogs%2F<filename>?alt=media&token=...
            // Encoded path: photos/logs/<filename> -> photos%2Flogs%2F<filename>

            const encodedName = encodeURIComponent(f.name);
            const isUsed = Array.from(usedUrls).some(dbUrl => dbUrl.includes(encodedName));
            return !isUsed;
        });

        setOrphanFiles(orphans);
        setAnalyzing(false);
    };

    return (
        <div className="min-h-screen bg-gray-100 p-8">
            <div className="max-w-4xl mx-auto bg-white rounded-3xl shadow-xl p-8">
                <h1 className="text-3xl font-bold text-gray-800 mb-6">Diagnóstico de Almacenamiento</h1>

                <div className="mb-8">
                    <button
                        onClick={runDiagnostic}
                        disabled={loading}
                        className="bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? 'Escaneando...' : 'Ejecutar Diagnóstico Completo'}
                    </button>
                    <a href="/" className="ml-4 text-gray-500 underline">Volver a Inicio</a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="bg-blue-50 p-6 rounded-2xl">
                        <h2 className="text-xl font-bold text-blue-900 mb-2">Storage (Nube)</h2>
                        <div className="text-4xl font-black text-blue-600">{files.length}</div>
                        <p className="text-sm text-blue-800/60">Archivos encontrados en photos/logs</p>
                    </div>
                    <div className="bg-emerald-50 p-6 rounded-2xl">
                        <h2 className="text-xl font-bold text-emerald-900 mb-2">Firestore (Base de Datos)</h2>
                        <div className="text-4xl font-black text-emerald-600">{logs.length}</div>
                        <p className="text-sm text-emerald-800/60">Registros totales</p>
                        <div className="mt-2 text-sm">
                            Con Foto: <strong>{logs.filter(l => l.photoUrl).length}</strong>
                        </div>
                    </div>
                </div>

                {files.length > 0 && (
                    <div className="mt-8 border-t pt-8">
                        <h2 className="text-2xl font-bold text-red-900 mb-4 flex items-center gap-2">
                            Archivos Huérfanos
                            <span className="bg-red-100 text-red-600 px-3 py-1 rounded-full text-sm">{orphanFiles.length}</span>
                        </h2>
                        <p className="mb-4 text-gray-600">Archivos que existen en Storage pero NO están enlazados en ningún registro de la base de datos.</p>

                        <div className="bg-gray-50 rounded-xl overflow-hidden border border-gray-200">
                            {orphanFiles.map((file, idx) => (
                                <div key={idx} className="p-4 border-b border-gray-100 hover:bg-gray-100 flex gap-4 items-center">
                                    <div className="w-20 h-20 bg-gray-200 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={file.url} alt="Preview" className="w-full h-full object-cover" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <div className="font-bold text-sm truncate" title={file.name}>{file.name}</div>
                                        <div className="text-xs text-gray-500">
                                            {new Date(file.timeCreated).toLocaleString()}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {(file.size / 1024).toFixed(1)} KB
                                        </div>
                                        <a href={file.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline mt-1 block">
                                            Ver original
                                        </a>
                                    </div>
                                </div>
                            ))}
                            {orphanFiles.length === 0 && !analyzing && (
                                <div className="p-8 text-center text-gray-400 font-bold">
                                    ¡Todo limpio! No se encontraron archivos huérfanos.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StorageDiagnostic;
