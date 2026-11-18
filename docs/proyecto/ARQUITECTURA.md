# Arquitectura del Sistema — Sembrador ARBA Elx

## 1. Stack Técnico
- **Frontend:** React 18 + Vite 7 (SPA / PWA Offline-First con `vite-plugin-pwa`).
- **Estilos e Iconografía:** Tailwind CSS 3.4 + Lucide React.
- **Cartografía y Posicionamiento:**
  - Leaflet + React-Leaflet (`MapView.jsx`, `PrecisionMapPicker.jsx`, `MonitoringRadarView.jsx` y mapa global en `LandingPage.jsx`).
  - Capas base multi-proveedor (`src/utils/mapLayers.js`, `MapLayerControl.jsx`): **Ortofoto Satélite PNOA (IGN España)** por defecto (`maxNativeZoom: 20`, `maxZoom: 22`), Satélite Global (Esri World Imagery) y Callejero/Topográfico (OpenStreetMap).
  - Posicionamiento GPS submétrico en siembra (`navigator.geolocation.watchPosition` con retención de mejor precisión + pin arrastrable y cruceta de micro-ajuste de `25 cm` / `1 m`) y radar geodésico Haversine en tiempo real para seguimiento (`src/utils/monitoringUtils.js`).
- **Meteorología y Ciencia Ciudadana:**
  - Integración cliente con **Open-Meteo Archive API** (sin API key) para contextualizar la supervivencia con precipitación acumulada post-siembra (mm), días de lluvia y temperatura máxima extrema.
  - Exportación abierta en **GeoJSON** (`FeatureCollection` EPSG:4326 compatible con QGIS/ArcGIS/uMap) y **CSV enriquecido** (`src/utils/csvUtils.js`).
- **Backend / BaaS:** Firebase v12 (`arba-elx-siembra`):
  - **Firestore:** Base de datos NoSQL con caché local persistente multi-pestaña (`persistentLocalCache` + `persistentMultipleTabManager`) e IndexedDB (`src/utils/db.js`) para cola de fotos offline (`useOfflineQueue`).
  - **Authentication:** Google OAuth (`signInWithPopup`), Email/Contraseña con validación de robustez (`src/utils/auth-utils.js`) y verificación de correo, Magic Link (`sendSignInLinkToEmail`) y sesión anónima silenciosa (`signInAnonymously`) para lectura pública.
  - **Cloud Storage:** Almacenamiento de evidencias fotográficas de siembra (`/photos/logs/*`), seguimiento longitudinal (`/photos/logs/checkups/*`) y avatares (`/users/{uid}/profile.jpg`) con compresión cliente en Canvas (`src/utils/imageUtils.js`).
  - **Cloud Messaging (FCM):** Notificaciones push mediante Service Worker (`public/firebase-messaging-sw.js`).
- **Testing:** Vitest + React Testing Library (unitarios/integración, 9 suites / 24 tests) y Playwright + Playwright-BDD (E2E/aceptación).
- **Despliegue:** Vercel (Production en `main`, Preview en ramas de desarrollo).

## 2. Estructura del Proyecto
```text
├── firestore.rules                # Reglas de seguridad RBAC, esquemas y optimización AST en Firestore
├── storage.rules                  # Reglas de seguridad para fotos de logs, checkups y avatares
├── firebase.json / .firebaserc    # Configuración de proyecto Firebase CLI
├── vercel.json                    # Rewrite SPA hacia /index.html
├── public/
│   └── firebase-messaging-sw.js   # Service Worker para notificaciones push FCM
├── scripts/                       # Scripts administrativos Node.js (backup, migración idempotente)
└── src/
    ├── App.jsx                    # Orquestador de sesión, navegación, listeners y auto-logout
    ├── firebase.js                # Inicialización de Firebase SDK y exportaciones Auth/DB/Storage
    ├── hooks/useOfflineQueue.js   # Sincronización diferida de fotos en modo sin conexión
    ├── utils/
    │   ├── auth-utils.js          # Validación y medidor de seguridad de contraseñas
    │   ├── csvUtils.js            # Exportación abierta a CSV enriquecido y GeoJSON (QGIS)
    │   ├── db.js                  # Cola local en IndexedDB para fotos offline
    │   ├── imageUtils.js          # Compresión de imágenes en cliente mediante Canvas
    │   ├── logUtils.js            # Filtrado y ordenación de registros de siembra
    │   ├── mapLayers.js           # Definición de capas satélite PNOA/Esri y callejero OSM
    │   ├── monitoringUtils.js     # Distancia Haversine, rumbo, analítica de supervivencia y Open-Meteo
    │   └── seedProtocolsCatalog.js# Catálogo base (10 especies) y métricas empíricas Open Seed Lab
    └── components/
        ├── LandingPage.jsx        # Entrada pública con mapa satélite global y acceso a Open Seed Lab
        ├── LoginScreen.jsx        # Autenticación (Email/Password, Magic Link, Google)
        ├── ProfileView.jsx        # Edición de perfil, vinculación de proveedores, cambio de clave
        ├── CampaignDashboard.jsx  # Panel de jornada (KPIs, Modo Seguimiento/Radar, Timelapse, GeoJSON/CSV)
        ├── CampaignManager.jsx    # Gestión de jornadas (Ajustes + bioma, Lotes + Open Seed Lab, Datos)
        ├── SeedLabView.jsx        # Biblioteca pública Open Seed Lab (buscador, talleres, aportaciones)
        ├── MonitoringRadarView.jsx# Radar GPS en campo, mapa de supervivencia, clima Open-Meteo y analítica
        ├── CheckupFormModal.jsx   # Formulario ágil de revisión longitudinal (1 toque + conteo + foto T+N)
        ├── SowerView.jsx          # Vista de campo del sembrador (híbrida: personal o por equipo)
        ├── SowingForm.jsx         # Formulario unificado de registro/edición de golpes de siembra
        ├── PrecisionMapPicker.jsx # Selector GPS satélite con pin arrastrable y cruceta submétrica (25cm/1m)
        ├── MapView.jsx            # Mapa interactivo de golpes coloreados por especie o estado de revisión
        ├── MapLayerControl.jsx    # Selector flotante de capas cartográficas (PNOA, Esri, OSM)
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
  - **Metadatos multi-colectivo (opcionales, retrocompatibles):** `organizationName` (por defecto `"ARBA Elx"`), `locationName` (por defecto `"Elche, España"`), `biome` (`'mediterranean_steppe'` | `'mediterranean_forest'` | `'post_fire'` | `'riparian'` | `'coastal_dune'` | `'mountain'` | `'other'`).
- **`seeds/{seedId}`**:
  - `campaignId`, `species`, `provider`, `treatment`, `photo`, `createdAt`, `deleted`
  - `protocolId` (opcional, referencia a catálogo/colección `seedProtocols`), `originLocation` (procedencia genética), `harvestYear` (año de cosecha)
  - `totalQuantity`, `remainingQuantity` (numéricos; en datos legacy existe `quantity`)
  - `userAssignments`: `[{ userId, quantity }]` (modelo moderno centrado en usuario).
- **`seedProtocols/{protocolId}`** *(Biblioteca Pública Open Seed Lab)*:
  - `scientificName`, `commonName`, `family`, `dormancyType` (`'physical'` | `'physiological'` | `'morphophysiological'` | `'none'`)
  - `scarification`, `hydrationHours`, `stratification`, `inoculation`, `pelleting`, `harvestSeason`, `sowingSeason`, `summaryRecipe`, `workshopTips`
  - `status` (`'community'` | `'verified'`), `authorId`, `authorName`, `verifiedBy`, `verifiedAt`, `createdAt`, `updatedAt`.
- **`groups/{groupId}`** *(Legacy / Retrocompatibilidad)*:
  - `campaignId`, `name`, `assignedSeeds`: `[seedId]`, `createdAt`.
- **`logs/{logId}`**:
  - `campaignId`, `seedId`, `seedName`, `holeCount`, `quantity`, `microsite`, `orientation`, `withSubstrate`, `withProtector`, `notes`, `location` (`{ lat, lng, acc }`), `photoUrl`, `syncStatus`, `timestamp`
  - **Atribución híbrida:** `groupId`, `groupName` (nombre del equipo en `main` o `displayName` en modo personal), `userId` (UID del autor) y `ownerId` (`uid` del propietario reclamado/autenticado o `null` si está pendiente de reclamar).
  - **Resumen desnormalizado de seguimiento longitudinal (opcional):** `lastCheckupStatus` (`'alive'` | `'dormant'` | `'dead'` | `'predated'` | `'not_found'`), `lastCheckupAt`, `lastSurvivingCount`, `lastGrowthStage` (`'cotyledons'` | `'seedling'` | `'juvenile'` | `'established'`), `checkupCount`, `lastCheckupBy`, `updatedAt`.
- **`checkups/{checkupId}`** *(Revisiones longitudinales en campo)*:
  - `campaignId`, `logId`, `status` (`'alive'` | `'dormant'` | `'dead'` | `'predated'` | `'not_found'`)
  - `survivingCount` (`0..1000`, requerido cuando `'alive'`), `growthStage` (`'cotyledons'` | `'seedling'` | `'juvenile'` | `'established'`, opcional)
  - `causes` (`string[]` de `['drought', 'herbivory', 'boar', 'ants_rodents', 'competition']`), `notes`, `photoUrl`
  - `reviewerId` (`request.auth.uid`), `reviewerName`, `timestamp`.

## 4. Flujo de Autenticación y Permisos
1. **Inicio Silencioso:** Si el visitante no tiene sesión iniciada, `App.jsx` ejecuta `signInAnonymously(auth)` para habilitar lecturas en Firestore bajo la regla `isSignedIn()`.
2. **Autenticación Real:** El usuario puede autenticarse mediante Google OAuth, Email + Contraseña (con bloqueo hasta verificar el correo si solo usa proveedor `password`) o Magic Link por correo.
3. **Colaboración en Seguimiento (`checkups` y resumen en `logs`):** Cualquier usuario autenticado no anónimo (`isRealUser()`) puede crear un documento en `checkups` y actualizar exclusivamente los 7 campos resumen de revisión en `logs/{logId}` dentro de jornadas públicas (o si es participante/coordinador/dueño/admin en jornadas privadas), manteniendo inmutables los campos de autoría y siembra original.
4. **Vinculación de Proveedores y Auto-Logout:** Desde `ProfileView.jsx` se pueden vincular Google y Contraseña; tras 2 horas de inactividad, las sesiones no anónimas se cierran automáticamente.
