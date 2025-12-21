/**
 * Script de Migración: Fotos base64 → Firebase Storage
 * 
 * Este script migra las fotos almacenadas como base64 en Firestore
 * a Firebase Storage, y actualiza los documentos con la URL.
 * 
 * USO:
 *   1. Ejecutar con --dry-run para ver qué se migrarría sin hacer cambios
 *   2. Ejecutar sin flags para migrar realmente
 * 
 * NOTAS:
 *   - El campo 'photo' se mantiene como respaldo hasta verificación
 *   - El nuevo campo 'photoUrl' contiene la URL de Storage
 *   - Solo procesa logs que tienen 'photo' pero no 'photoUrl'
 */

import React, { useState } from 'react';
import { collection, getDocs, updateDoc, doc, deleteField } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';

const MigratePhotos = ({ db, appId, storage }) => {
    const [status, setStatus] = useState('idle');
    const [progress, setProgress] = useState({ current: 0, total: 0 });
    const [logs, setLogs] = useState([]);
    const [dryRun, setDryRun] = useState(true);
    const [mode, setMode] = useState('migrate'); // 'migrate' | 'cleanup'

    const addLog = (msg) => {
        console.log(msg);
        setLogs(prev => [...prev, `${new Date().toISOString().slice(11, 19)} - ${msg}`]);
    };

    const runMigration = async () => {
        setStatus('running');
        setLogs([]);
        try {
            addLog(`🚀 Iniciando migración ${dryRun ? '(DRY RUN)' : '(REAL)'}`);
            const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
            const snapshot = await getDocs(logsRef);
            addLog(`📊 Total de logs: ${snapshot.docs.length}`);

            const logsToMigrate = snapshot.docs.filter(d => d.data().photo && !d.data().photoUrl);
            addLog(`📊 Logs para migrar: ${logsToMigrate.length}`);
            setProgress({ current: 0, total: logsToMigrate.length });

            if (logsToMigrate.length === 0) { addLog('✅ Nada que migrar'); setStatus('done'); return; }

            let migrated = 0, errors = 0;
            for (let i = 0; i < logsToMigrate.length; i++) {
                const logDoc = logsToMigrate[i];
                try {
                    if (dryRun) {
                        addLog(`[DRY] ${i + 1}/${logsToMigrate.length} - ${logDoc.id.slice(0, 8)}...`);
                    } else {
                        const photoRef = ref(storage, `photos/logs/${logDoc.id}.jpg`);
                        await uploadString(photoRef, logDoc.data().photo, 'data_url');
                        const photoUrl = await getDownloadURL(photoRef);
                        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', logDoc.id), { photoUrl });
                        addLog(`✅ ${i + 1}/${logsToMigrate.length} - Migrado`);
                    }
                    migrated++;
                } catch (err) { addLog(`❌ Error: ${err.message}`); errors++; }
                setProgress({ current: i + 1, total: logsToMigrate.length });
            }
            addLog(`\n📊 Migrados: ${migrated}, Errores: ${errors}`);
            setStatus('done');
        } catch (error) { addLog(`❌ Error fatal: ${error.message}`); setStatus('error'); }
    };

    const runCleanup = async () => {
        setStatus('running');
        setLogs([]);
        try {
            addLog(`🧹 Iniciando limpieza ${dryRun ? '(DRY RUN)' : '(REAL)'}`);
            const logsRef = collection(db, 'artifacts', appId, 'public', 'data', 'logs');
            const snapshot = await getDocs(logsRef);
            addLog(`📊 Total de logs: ${snapshot.docs.length}`);

            // Logs que tienen AMBOS photo Y photoUrl (ya migrados, se puede eliminar photo)
            const logsToClean = snapshot.docs.filter(d => d.data().photo && d.data().photoUrl);
            let totalSize = 0;
            logsToClean.forEach(d => totalSize += (d.data().photo?.length || 0));
            addLog(`📊 Logs para limpiar: ${logsToClean.length} (${(totalSize / 1024 / 1024).toFixed(2)} MB)`);
            setProgress({ current: 0, total: logsToClean.length });

            if (logsToClean.length === 0) { addLog('✅ Nada que limpiar'); setStatus('done'); return; }

            let cleaned = 0, errors = 0;
            for (let i = 0; i < logsToClean.length; i++) {
                const logDoc = logsToClean[i];
                try {
                    if (dryRun) {
                        addLog(`[DRY] ${i + 1}/${logsToClean.length} - ${logDoc.id.slice(0, 8)}... (${(logDoc.data().photo.length / 1024).toFixed(0)} KB)`);
                    } else {
                        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'logs', logDoc.id), { photo: deleteField() });
                        addLog(`✅ ${i + 1}/${logsToClean.length} - Limpiado`);
                    }
                    cleaned++;
                } catch (err) { addLog(`❌ Error: ${err.message}`); errors++; }
                setProgress({ current: i + 1, total: logsToClean.length });
            }
            addLog(`\n📊 Limpiados: ${cleaned}, Errores: ${errors}`);
            setStatus('done');
        } catch (error) { addLog(`❌ Error fatal: ${error.message}`); setStatus('error'); }
    };

    return (
        <div style={{ padding: 20, fontFamily: 'monospace', background: '#1a1a2e', color: '#eee', minHeight: '100vh' }}>
            <h1 style={{ color: '#00ff88' }}>🔄 Migración de Fotos</h1>

            <div style={{ marginBottom: 20, display: 'flex', gap: 10 }}>
                <button onClick={() => setMode('migrate')}
                    style={{ padding: '8px 16px', background: mode === 'migrate' ? '#00ff88' : '#333', color: mode === 'migrate' ? '#000' : '#fff', border: 'none', borderRadius: 5 }}>
                    📤 Migrar
                </button>
                <button onClick={() => setMode('cleanup')}
                    style={{ padding: '8px 16px', background: mode === 'cleanup' ? '#ff8800' : '#333', color: mode === 'cleanup' ? '#000' : '#fff', border: 'none', borderRadius: 5 }}>
                    🧹 Limpiar base64
                </button>
            </div>

            <div style={{ marginBottom: 20 }}>
                <label style={{ marginRight: 20 }}>
                    <input type="checkbox" checked={dryRun} onChange={(e) => setDryRun(e.target.checked)} disabled={status === 'running'} />
                    {' '}Dry Run
                </label>
                <button onClick={mode === 'migrate' ? runMigration : runCleanup} disabled={status === 'running'}
                    style={{ padding: '10px 20px', background: dryRun ? '#4a90d9' : '#ff4444', color: 'white', border: 'none', borderRadius: 5 }}>
                    {status === 'running' ? 'Ejecutando...' : dryRun ? '🔍 Ver' : mode === 'migrate' ? '🚀 Migrar REAL' : '🧹 Limpiar REAL'}
                </button>
            </div>

            {progress.total > 0 && (
                <div style={{ marginBottom: 20 }}>
                    <div style={{ background: '#333', borderRadius: 10, overflow: 'hidden' }}>
                        <div style={{ width: `${(progress.current / progress.total) * 100}%`, background: mode === 'cleanup' ? '#ff8800' : '#00ff88', height: 20 }} />
                    </div>
                    <span>{progress.current} / {progress.total}</span>
                </div>
            )}

            <div style={{ background: '#0d0d1a', padding: 15, borderRadius: 5, maxHeight: 400, overflow: 'auto', fontSize: 12 }}>
                {logs.length === 0 ? <span style={{ color: '#666' }}>Logs...</span> :
                    logs.map((log, i) => <div key={i} style={{ color: log.includes('❌') ? '#ff4444' : log.includes('✅') ? '#00ff88' : '#aaa' }}>{log}</div>)}
            </div>

            {!dryRun && status !== 'running' && (
                <div style={{ marginTop: 20, padding: 15, background: '#442200', borderRadius: 5 }}>
                    ⚠️ <strong>CUIDADO:</strong> Modo REAL activo. {mode === 'cleanup' && 'Se eliminarán los campos photo base64.'}
                </div>
            )}
        </div>
    );
};

export default MigratePhotos;
