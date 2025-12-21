# sembrador-arba-elx

Asistente para las jornadas de siembra de ARBA Elx.

## Configuración de Firebase

### Índices de Firestore

La aplicación requiere los siguientes índices compuestos en Firestore:

| Colección | Campos | Orden |
|-----------|--------|-------|
| `logs` | `campaignId`, `timestamp` | Ascendente, Descendente |
| `logs` | `groupId`, `timestamp` | Ascendente, Descendente |

Para crear los índices:
1. Ve a [Firebase Console](https://console.firebase.google.com)
2. Selecciona tu proyecto
3. Ve a **Firestore Database → Índices → Compuestos**
4. Haz clic en **Agregar índice** y configura cada uno

### Configuración de Storage CORS

Para permitir subida de fotos desde localhost o tu dominio de producción:

1. Crea un archivo `cors.json`:
```json
[
  {
    "origin": ["http://localhost:5173", "https://tu-dominio.com"],
    "method": ["GET", "POST", "PUT", "DELETE"],
    "maxAgeSeconds": 3600
  }
]
```

2. Aplícalo con gsutil:
```bash
gcloud auth login
gsutil cors set cors.json gs://TU-BUCKET.firebasestorage.app
```

### Reglas de Storage

Asegúrate de tener las reglas adecuadas en Firebase Storage:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /photos/logs/{allPaths=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

## Desarrollo

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
