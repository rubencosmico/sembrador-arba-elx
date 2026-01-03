import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function analyzeLegacyData() {
    console.log('--- ANALIZANDO CAMPAÑAS ---');
    // Ajustar ruta según tu estructura (artifacts/arba-elx/public/data/campaigns)
    const campaignsSnap = await db.collection('artifacts').doc('arba-elx').collection('public').doc('data').collection('campaigns').limit(5).get();

    if (campaignsSnap.empty) {
        console.log('No se encontraron campañas en la ruta artifacts/arba-elx/public/data/campaigns');
    } else {
        campaignsSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Campaña ID: ${doc.id} | Visibilidad: ${data.visibility} | Propietario: ${data.ownerId}`);
        });
    }

    console.log('\n--- ANALIZANDO LOGS (PARA RECLAMAR) ---');
    const logsSnap = await db.collection('artifacts').doc('arba-elx').collection('public').doc('data').collection('logs').limit(5).get();

    if (logsSnap.empty) {
        console.log('No se encontraron logs en la ruta artifacts/arba-elx/public/data/logs');
    } else {
        logsSnap.forEach(doc => {
            const data = doc.data();
            console.log(`Log ID: ${doc.id} | Propietario (ownerId): ${data.ownerId} | Sower (uid): ${data.uid}`);
        });
    }
}

analyzeLegacyData().catch(console.error);
