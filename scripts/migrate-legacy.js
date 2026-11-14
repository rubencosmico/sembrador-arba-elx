import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function migrateLegacy() {
    console.log('Iniciando migración de datos heredados...');
    const appId = 'arba-elx';
    const dataPath = `artifacts/${appId}/public/data`;

    // 1. Campañas -> Public
    const campaignsSnap = await db.collection(`${dataPath}/campaigns`).get();
    console.log(`Procesando ${campaignsSnap.size} campañas...`);

    const batch = db.batch();
    campaignsSnap.forEach(doc => {
        if (!doc.data().visibility) {
            batch.update(doc.ref, { visibility: 'public' });
        }
    });

    // 2. Logs -> ownerId: null (si no existe)
    // Nota: Solo procesamos los primeros 400 para no exceder el batch
    const logsSnap = await db.collection(`${dataPath}/logs`).where('ownerId', '==', null).get(); // Esto solo funciona si ya existen con null
    // Mejor buscamos todos los que NO tienen el campo ownerId
    const allLogsSnap = await db.collection(`${dataPath}/logs`).limit(400).get();
    console.log(`Revisando ${allLogsSnap.size} logs...`);

    allLogsSnap.forEach(doc => {
        if (doc.data().ownerId === undefined) {
            batch.update(doc.ref, { ownerId: null });
        }
    });

    await batch.commit();
    console.log('Migración completada (o primera fase).');
}

migrateLegacy().catch(console.error);
