import admin from 'firebase-admin';
import fs from 'fs';

const serviceAccount = JSON.parse(fs.readFileSync('./service-account.json', 'utf8'));

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

async function inspectDoc() {
    const logSnap = await db.collection('artifacts/arba-elx/public/data/logs').limit(1).get();
    if (!logSnap.empty) {
        console.log('--- LOG SAMPLE ---');
        console.log(JSON.stringify(logSnap.docs[0].data(), null, 2));
    }

    const campaignSnap = await db.collection('artifacts/arba-elx/public/data/campaigns').limit(1).get();
    if (!campaignSnap.empty) {
        console.log('\n--- CAMPAIGN SAMPLE ---');
        console.log(JSON.stringify(campaignSnap.docs[0].data(), null, 2));
    }
}

inspectDoc().catch(console.error);
