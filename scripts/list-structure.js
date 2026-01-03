import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function listStructure() {
    console.log('--- LISTANDO COLECCIÓN "artifacts" ---');
    const artifactsSnap = await db.collection('artifacts').get();
    artifactsSnap.forEach(doc => {
        console.log(`Artifact ID (appId): "${doc.id}"`);
    });

    const appId = 'arba-elx';
    console.log(`\n--- EXPLORANDO RUTA: artifacts/${appId}/public/data ---`);
    const collections = await db.doc(`artifacts/${appId}/public/data`).listCollections();
    console.log('Colecciones encontradas:', collections.map(c => c.id));

    for (const coll of collections) {
        const subSnap = await coll.limit(1).get();
        console.log(`Muestra de ${coll.id}:`, subSnap.empty ? 'VACÍA' : subSnap.docs[0].id);
    }
}

listStructure().catch(console.error);
