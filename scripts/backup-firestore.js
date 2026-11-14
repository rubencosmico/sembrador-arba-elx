import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';

const SERVICE_ACCOUNT_PATH = './service-account.json';
const BACKUP_DIR = './backups';
const APP_ID = 'arba-elx';

if (!fs.existsSync(SERVICE_ACCOUNT_PATH)) {
    console.error(`Error: No se encuentra ${SERVICE_ACCOUNT_PATH}`);
    process.exit(1);
}

const serviceAccount = JSON.parse(fs.readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

function serializeValue(value) {
    if (value === null || value === undefined) return value;
    if (value instanceof admin.firestore.Timestamp) {
        return {
            __type: 'Timestamp',
            iso: value.toDate().toISOString(),
            seconds: value.seconds,
            nanoseconds: value.nanoseconds
        };
    }
    if (value instanceof admin.firestore.GeoPoint) {
        return {
            __type: 'GeoPoint',
            latitude: value.latitude,
            longitude: value.longitude
        };
    }
    if (value instanceof admin.firestore.DocumentReference) {
        return {
            __type: 'DocumentReference',
            path: value.path
        };
    }
    if (Buffer.isBuffer(value)) {
        return {
            __type: 'Bytes',
            base64: value.toString('base64')
        };
    }
    if (Array.isArray(value)) {
        return value.map(serializeValue);
    }
    if (typeof value === 'object') {
        const result = {};
        for (const [k, v] of Object.entries(value)) {
            result[k] = serializeValue(v);
        }
        return result;
    }
    return value;
}

async function exportCollection(collectionRef, summary) {
    const snap = await collectionRef.get();
    const docs = {};
    for (const docSnap of snap.docs) {
        const subcollections = await docSnap.ref.listCollections();
        const nested = {};
        for (const subCol of subcollections) {
            nested[subCol.id] = await exportCollection(subCol, summary);
        }
        docs[docSnap.id] = {
            data: serializeValue(docSnap.data()),
            ...(Object.keys(nested).length > 0 ? { subcollections: nested } : {})
        };
    }
    summary[collectionRef.path] = snap.size;
    return docs;
}

async function runBackup() {
    console.log(`Iniciando backup completo de Firestore (${serviceAccount.project_id})...`);
    const summary = {};
    const collectionsData = {};

    const rootCollections = await db.listCollections();
    for (const colRef of rootCollections) {
        if (colRef.id === 'artifacts') continue;
        collectionsData[colRef.id] = await exportCollection(colRef, summary);
    }

    const artifactDataPath = `artifacts/${APP_ID}/public/data`;
    const artifactDataRef = db.doc(artifactDataPath);
    const artifactSubcollections = await artifactDataRef.listCollections();
    const artifactData = {};

    for (const subCol of artifactSubcollections) {
        artifactData[subCol.id] = await exportCollection(subCol, summary);
    }

    const payload = {
        metadata: {
            projectId: serviceAccount.project_id,
            appId: APP_ID,
            createdAt: new Date().toISOString(),
            documentCounts: summary
        },
        rootCollections: collectionsData,
        [artifactDataPath]: artifactData
    };

    if (!fs.existsSync(BACKUP_DIR)) {
        fs.mkdirSync(BACKUP_DIR, { recursive: true });
    }

    const safeTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = path.join(BACKUP_DIR, `firestore-backup-${safeTimestamp}.json`);
    fs.writeFileSync(outputFile, JSON.stringify(payload, null, 2), 'utf8');

    const stats = fs.statSync(outputFile);
    const sizeKb = (stats.size / 1024).toFixed(1);
    const sizeMb = (stats.size / (1024 * 1024)).toFixed(2);

    console.log('\nBackup completado con éxito:');
    console.log(`Archivo: ${outputFile} (${sizeKb} KB / ${sizeMb} MB)`);
    console.log('Documentos exportados por ruta:');
    for (const [colPath, count] of Object.entries(summary)) {
        console.log(`  - ${colPath}: ${count}`);
    }
}

runBackup()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error('Error durante el backup:', err);
        process.exit(1);
    });

