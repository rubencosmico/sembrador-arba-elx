# Arquitectura del Sistema — Sembrador ARBA Elx

## 1. Stack Técnico
- **Frontend:** React 18 + Vite 7 (SPA / PWA Offline-First con `vite-plugin-pwa`).
- **Estilos e Iconografía:** Tailwind CSS 3.4 + Lucide React.
- **Cartografía:** Leaflet + React-Leaflet (`MapView.jsx` y mapa global en `LandingPage.jsx`).
- **Backend / BaaS:** Firebase v12 (`arba-elx-siembra`):
  - **Firestore:** Base de datos NoSQL con caché local persistente multi-pestaña (`persistentLocalCache` + `persistentMultipleTabManager`) e IndexedDB (`src/utils/db.js`) para cola de fotos offline (`useOfflineQueue`).
  - **Authentication:** Google OAuth (`signInWithPopup`), Email/Contraseña con validación de robustez (`src/utils/auth-utils.js`) y verificación de correo, Magic Link (`sendSignInLinkToEmail`) y sesión anónima silenciosa (`signInAnonymously`) para lectura pública.
  - **Cloud Storage:** Almacenamiento de evidencias fotográficas (`/photos/logs/*`) y avatares (`/users/{uid}/profile.jpg`) con compresión cliente en Canvas (`src/utils/imageUtils.js`).
  - **Cloud Messaging (FCM):** Notificaciones push mediante Service Worker (`public/firebase-messaging-sw.js`).
- **Testing:** Vitest + React Testing Library (unitarios/integración) y Playwright + Playwright-BDD (E2E/aceptación).
- **Despliegue:** Vercel (Production en `main`, Preview en ramas de desarrollo).

## 2. Estructura del Proyecto
```text
├── firestore.rules                # Reglas de seguridad RBAC y privacidad en Firestore
├── storage.rules                  # Reglas de seguridad para fotos de logs y avatares
├── firebase.json / .firebaserc    # Configuración de proyecto Firebase CLI
├── vercel.json                    # Rewrite SPA hacia /index.html
├── public/
│   └── firebase-messaging-sw.js   # Service Worker para notificaciones push FCM
├── scripts/                       # Scripts administrativos Node.js (firebase-admin)
└── src/
    ├── App.jsx                    # Orquestador de sesión, navegación, listeners y auto-logout
    ├── firebase.js                # Inicialización de Firebase SDK y exportaciones Auth/DB
    ├── hooks/useOfflineQueue.js   # Sincronización diferida de fotos en modo sin conexión
    ├── utils/                     # Validadores (auth-utils), compresión, CSV, filtros e IndexedDB
    └── components/
        ├── LandingPage.jsx        # Entrada pública con mapa global de jornadas y menú de usuario
        ├── LoginScreen.jsx        # Autenticación (Email/Password, Magic Link, Google)
        ├── ProfileView.jsx        # Edición de perfil, vinculación de proveedores, cambio de clave
        ├── CampaignDashboard.jsx  # Panel principal de jornada (KPIs, lotes, mapa/lista, acciones)
        ├── CampaignManager.jsx    # Gestión de jornadas (Ajustes, Lotes por usuario, Datos/CSV)
        ├── SowerView.jsx          # Vista de campo del sembrador (híbrida: personal o por equipo)
        ├── SowingForm.jsx         # Formulario unificado de registro/edición de golpes de siembra
        ├── ClaimRecordsView.jsx   # Reclamación de registros históricos por nombre de grupo
        ├── SuperAdminDashboard.jsx# Aprobación de reclamaciones y sincronización de comunidad
        ├── SocialView.jsx         # Directorio de sembradores y sistema de seguimiento (follows)
        ├── MessagesView.jsx       # Bandeja de conversaciones 1 a 1
        └── ChatWindow.jsx         # Ventana de chat en tiempo real
```

## 3. Modelo de Datos en Firestore

### 3.1. Colecciones Globales (Raíz)
- **`users/{uid}`**: `{ displayName, email, photoURL, bio, website, instagram, defaultRole: 'sower', fcmToken, createdAt }`
- **`admins/{uid}`**: `{ email, assignedAt, assignedBy }` (Colección de solo lectura desde cliente; define el rol `isSuperAdmin`).
- **`claimRequests/{requestId}`**: `{ userId, userName, logIds: [id], campaignIds: [id], status: 'pending' | 'approved' | 'rejected', createdAt }`
- **`follows/{followerUid_followingUid}`**: `{ followerId, followingId, createdAt }`
- **`messages/{messageId}`**: `{ senderId, receiverId, text, type: 'text' | 'reference', createdAt }`

### 3.2. Colecciones de Jornadas (`artifacts/arba-elx/public/data/*`)
- **`campaigns/{campId}`**:
  - `name`, `description`, `createdAt`, `status` (`'active'` | `'inactive'` | `'archived'`)
  - `visibility` (`'public'` | `'private'`), `ownerId` (UID creador), `coordinators` (`[uid]`), `participants` (`[uid]`)
  - `coordinates` (`{ lat, lng }` opcional; si no existe, `LandingPage` infiere ubicación aproximada desde los primeros `logs`).
- **`seeds/{seedId}`**:
  - `campaignId`, `species`, `provider`, `treatment`, `photo`, `createdAt`, `deleted`
  - `totalQuantity` (numérico; en datos legacy existe `quantity`)
  - `userAssignments`: `[{ userId, quantity }]` (modelo moderno centrado en usuario).
- **`groups/{groupId}`** *(Legacy / Retrocompatibilidad)*:
  - `campaignId`, `name`, `assignedSeeds`: `[seedId]`, `createdAt`.
- **`logs/{logId}`**:
  - `campaignId`, `seedId`, `seedName`, `holeCount`, `quantity`, `microsite`, `orientation`, `withSubstrate`, `withProtector`, `notes`, `location` (`{ lat, lng, acc }`), `photoUrl`, `syncStatus`, `timestamp`
  - **Atribución híbrida:** `groupId`, `groupName` (nombre del equipo en `main` o `displayName` en modo personal), `userId` (UID del autor) y `ownerId` (`uid` del propietario reclamado/autenticado o `null` si está pendiente de reclamar).

## 4. Flujo de Autenticación y Permisos
1. **Inicio Silencioso:** Si el visitante no tiene sesión iniciada, `App.jsx` ejecuta `signInAnonymously(auth)` para habilitar lecturas en Firestore bajo la regla `isSignedIn()`.
2. **Autenticación Real:** El usuario puede autenticarse mediante Google OAuth, Email + Contraseña (con bloqueo hasta verificar el correo si solo usa proveedor `password`) o Magic Link por correo.
3. **Vinculación de Proveedores:** Desde `ProfileView.jsx`, un usuario con Google puede establecer contraseña (`linkWithCredential`), y un usuario con contraseña puede vincular su cuenta de Google (`linkWithPopup`).
4. **Auto-Logout:** Tras 2 horas de inactividad, las sesiones no anónimas se cierran automáticamente.
