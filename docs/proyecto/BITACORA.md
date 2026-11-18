# Bitácora Técnica del Proyecto

## [2026-11-18] — Entrega 2 (*Open Seed Lab*): Biblioteca Pública de Protocolos, Reglas, Modo Taller y Procedencia Genética (`feature/open-seed-lab`)

### Resumen de la Sesión
Se realizó la limpieza de la rama ya fusionada `feature/citizen-science-monitoring` (local y remota), se creó la rama limpia `feature/open-seed-lab` desde `main` (`e2ae2b0`) y se implementó íntegramente la **Entrega 2 (*Open Seed Lab*)** del plan de ciencia ciudadana.

### Cambios Implementados
- **Catálogo Base y Métricas Empíricas ([seedProtocolsCatalog.js](file:///home/ruben/dev/sembrador-arba-elx/src/utils/seedProtocolsCatalog.js)):**
  - Creado catálogo inicial verificado con 10 especies autóctonas mediterráneas de referencia (`Ceratonia siliqua`, `Quercus coccifera`, `Quercus ilex subsp. ballota`, `Chamaerops humilis`, `Pistacia lentiscus`, `Pinus halepensis`, `Rhamnus lycioides`, `Tetraclinis articulata`, `Olea europaea var. sylvestris`, `Ziziphus lotus`), tipos de latencia `DORMANCY_TYPES`, fusión con aportaciones de Firestore (`mergeProtocolsWithCommunity`) y cálculo del `% de éxito en campo` (`computeProtocolFieldStats`).
- **Seguridad Firebase ([firestore.rules](file:///home/ruben/dev/sembrador-arba-elx/firestore.rules) vía `firestore-rules-author`):**
  - Añadidas reglas para `artifacts/arba-elx/public/data/seedProtocols/{protocolId}` (lectura pública con `isSignedIn()`, creación autenticada `'community'` sin falsificación de sello de verificación, verificación `'verified'` exclusiva para Admin) y validación opcional de `protocolId`, `originLocation` y `harvestYear` en `seeds/{seedId}`.
  - Desplegado ruleset `e26c1055-8ae7-4377-89d3-258afc55ea68` sobre `arba-elx-siembra`.
- **Interfaz Pública Open Seed Lab ([SeedLabView.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/SeedLabView.jsx), [LandingPage.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/LandingPage.jsx), [App.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/App.jsx)):**
  - Acceso directo desde cabecera y hero de `LandingPage.jsx` incluso para usuarios anónimos.
  - Buscador, filtros por latencia/estado, modal interactivo «Modo Taller Paso a Paso» (checklist de 5 fases), formulario de aportación comunitaria, verificación por SuperAdmin y visualización de tasa empírica de germinación/supervivencia en campo.
- **Vinculación en Lotes y Exportación ([CampaignManager.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/CampaignManager.jsx), [csvUtils.js](file:///home/ruben/dev/sembrador-arba-elx/src/utils/csvUtils.js)):**
  - Añadido selector de protocolos del *Open Seed Lab* en el alta de lotes (autocompletando tratamiento y especie), campos de procedencia genética (`originLocation`, `harvestYear`), insignias visuales en tarjetas de lote y columnas/propiedades de trazabilidad genética en CSV y GeoJSON.

### Verificación
- **Tests y Build:** Añadida suite [SeedLabView.test.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/SeedLabView.test.jsx) y ampliados [CampaignManager.test.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/CampaignManager.test.jsx) y [csvUtils.test.js](file:///home/ruben/dev/sembrador-arba-elx/src/utils/csvUtils.test.js). `npm run test:run`: `10/10` archivos, `28/28` tests en verde; `npm run build`: compilación Vite sin errores (`1567` módulos).

---

## [2026-11-18] — Entrega 1 de Ciencia Ciudadana en Producción (`main`): Seguimiento Longitudinal, Radar GPS, Clima Open-Meteo, GeoJSON y Optimización AST de Firestore Rules

### Resumen de la Sesión
Se completó, depuró en vivo, validó y publicó en producción (`main`, commit `e2ae2b0`) la **Entrega 1 del Plan de Ciencia Ciudadana y Metodología de Semillas**, dotando a la plataforma de seguimiento longitudinal de golpes sembrados (`checkups`), radar GPS de localización en el monte, integración meteorológica con Open-Meteo, exportación abierta a GeoJSON/CSV enriquecido y metadatos multi-colectivo. Asimismo, se diagnosticó y resolvió un límite de evaluación AST en Cloud Firestore Security Rules al actualizar documentos reales de `logs`.

### Cambios Implementados
- **Seguimiento Longitudinal y Radar en Campo ([MonitoringRadarView.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/MonitoringRadarView.jsx), [CheckupFormModal.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/CheckupFormModal.jsx), [CampaignDashboard.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/CampaignDashboard.jsx), [MapView.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/MapView.jsx)):**
  - Creación de la colección `artifacts/arba-elx/public/data/checkups/{checkupId}` y desnormalización de 7 campos resumen en `logs/{logId}` (`lastCheckupStatus`, `lastCheckupAt`, `lastSurvivingCount`, `lastGrowthStage`, `checkupCount`, `lastCheckupBy`, `updatedAt`).
  - Modo Radar GPS en tiempo real ordenado por distancia Haversine en metros y rumbo cardinal (`N`, `NE`, `E`...), con miniatura de la foto original *T=0*, mapa satélite coloreado por estado de supervivencia y línea de tiempo (*Timelapse* *T=0 → T+N*) en el detalle de cada golpe.
  - En `handleSaveCheckup` ([CampaignDashboard.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/CampaignDashboard.jsx)), se reordenó la escritura para ejecutar `updateDoc` sobre `logs/{logId}` **antes** de `addDoc` sobre `checkups`, garantizando que nunca se creen revisiones huérfanas si falla la actualización del registro principal.
- **Analítica Científica, Clima Open-Meteo y Exportación GIS ([monitoringUtils.js](file:///home/ruben/dev/sembrador-arba-elx/src/utils/monitoringUtils.js), [csvUtils.js](file:///home/ruben/dev/sembrador-arba-elx/src/utils/csvUtils.js)):**
  - Consulta automática a **Open-Meteo Archive API** (sin API key) desde la fecha de siembra y coordenadas medias de la jornada para obtener precipitación acumulada post-siembra (mm), días de lluvia y temperatura máxima.
  - Desglose comparativo de tasas de supervivencia y emergencia por **Micrositio**, **Orientación** y **Lote/Tratamiento**.
  - Exportación abierta a **GeoJSON** (`generateLogGeoJSON`, estándar EPSG:4326 compatible con QGIS/ArcGIS/uMap) y **CSV enriquecido** con datos del último seguimiento.
- **Metadatos Multi-Colectivo ([CampaignManager.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/CampaignManager.jsx), [LandingPage.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/LandingPage.jsx)):**
  - Añadidos `organizationName` (por defecto `"ARBA Elx"`), `locationName` (por defecto `"Elche, España"`) y `biome` (selector de ecosistema) con retrocompatibilidad total para las 7 campañas existentes.
- **Causa Raíz y Optimización AST en [firestore.rules](file:///home/ruben/dev/sembrador-arba-elx/firestore.rules) (vía `firestore-rules-author`):**
  - Al probar en vivo la actualización de los 7 campos resumen sobre `logs/o6Vs1uRYK297mtx5IbdY` (pasando de 19 a 26 campos), Firestore devolvía `403 PERMISSION_DENIED` por superar el **límite de 1.000 expresiones AST evaluadas por petición**.
  - Se refactorizaron las funciones de validación y autorización usando variables locales `let` y `.get(..., null)`, eliminando claves muertas (`latitude`/`longitude`) en `isValidLocationMap`, separando `isValidLogCheckupSummary(data)`, evaluando `isValidLogCommon(newData)` únicamente cuando se modifican campos distintos a los 7 de revisión, unificando `canUpdateLog` y añadiendo soporte para `remainingQuantity` en `isValidSeed`.
  - Desplegado el ruleset `8cf23a37-017e-47cf-b50d-ee1c026db6ee` y limpiados los 7 documentos duplicados de prueba en `checkups`, conservando `checkups/I7sIPRHN6ND2bhahUp3R` (`checkupCount: 1`).

### Verificación
- **API REST de Firestore en vivo (`logs/o6Vs1uRYK297mtx5IbdY` con 26 campos):** `200 OK` al actualizar los 7 campos resumen tanto como dueño/admin (`uo8s4kCGgrZJwXETFtTGThFAATE2`) como con un voluntario real no-admin/no-dueño (`gsE56DtzULN2K4T3egfXHDLyFd93`); `403` al intentar editar `notes` como voluntario no propietario; `200 OK` al editar `notes` como propietario.
- **Tests y Build:** `npm run test:run` (`9/9` suites, `24/24` tests en verde) y `npm run build` sin errores.
- **Producción:** Merge fast-forward a `main` (`e2ae2b0`) y despliegue en Vercel Production (`7835750995`, `state: "success"`).

---

## [2026-11-15] — Etapa 2 en Producción (`main`): Capas Satélite PNOA por Defecto y Posicionamiento GPS Submétrico

### Resumen de la Sesión
Se investigó la viabilidad técnica del posicionamiento centimétrico/submétrico en smartphones de campo y se implementó y publicó en producción (`main`, commit `496ad5a`) la mejora integral de cartografía satélite y posicionamiento interactivo de golpes de siembra.

### Cambios Implementados
- **Capas Satélite de Alta Resolución ([mapLayers.js](file:///home/ruben/dev/sembrador-arba-elx/src/utils/mapLayers.js), [MapLayerControl.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/MapLayerControl.jsx), [MapView.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/MapView.jsx), [LandingPage.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/LandingPage.jsx)):**
  - Configurada la **Ortofoto PNOA máxima actualidad (IGN España, 15–25 cm/píxel, zoom nativo 20 y sobreescalado digital hasta zoom 22)** como capa activa por defecto en todos los mapas, complementada con Satélite Global (Esri World Imagery) y Callejero/Topográfico (OpenStreetMap).
- **Selector Submétrico y Captura Continua ([PrecisionMapPicker.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/PrecisionMapPicker.jsx), [SowingForm.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/SowingForm.jsx)):**
  - Sustitución de `getCurrentPosition` puntual por escucha continua con `watchPosition`, reteniendo automáticamente la coordenada de menor radio de error (`acc`) e informando mediante indicador semafórico.
  - Mapa satélite interactivo en el formulario de siembra con pin arrastrable y cruceta de micro-ajuste cardinal (`N`, `S`, `E`, `O`) con pasos seleccionables de **`25 cm`** o **`1 m`**, persistiendo exclusivamente `{ lat, lng, acc }` del punto final.

### Verificación
- **Tests y Build:** Añadida suite [SowingForm.test.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/SowingForm.test.jsx) (`5` tests cubriendo `watchPosition`, micro-ajuste de 25 cm, cambio de capas y payload final). `npm run test:run` (`7/7` suites, `19/19` tests) y `npm run build` en verde.
- **Producción:** Fusionado en `main` (`496ad5a`), desplegado en Vercel Production y eliminada la rama temporal `feature/gps-satellite-precision`.

---

## [2026-11-14] — Fase 3 y Fase 4 Completadas: Validación Preview, Migración de Datos, Reglas y Paso a Producción (`main`)

### Resumen de la Sesión
Se completó la validación funcional completa en el entorno Preview de Vercel (con los 2 fixes detectados durante las pruebas) y se ejecutó íntegra la Fase 4: copia de seguridad completa en local, migración aditiva e idempotente sobre Firestore (`arba-elx-siembra`), despliegue de reglas de seguridad y fusión final en `main`.

### Cambios Implementados en Cierre de Fase 3
- **Bloqueo de siembra anónima en campañas legacy (`02bc860`, [CampaignDashboard.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/CampaignDashboard.jsx), [App.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/App.jsx)):** Corregido el flujo en jornadas históricas (`!isModern`, como `24/11/2026`) para impedir entrar en `SowerView` o mostrar «Mi Cuaderno de Campo» sin sesión autenticada (`!user || user.isAnonymous`), añadiendo además botón de acceso en la cabecera.
- **Mejora UX en Login (`a861c02`, [LoginScreen.jsx](file:///home/ruben/dev/sembrador-arba-elx/src/components/LoginScreen.jsx)):** Añadidos botón superior *«Volver»* y enlace inferior *«Continuar como invitado / Volver»* mediante `onBack` para salir de la pantalla de login sin recargar el navegador.
- **Validación en Vercel Preview y Config Cloud:** Añadido `https://*.vercel.app/*` a la API Key correcta (`...jWlQ`) en Google Cloud Console y el dominio estable de rama en Firebase Authorized domains; validados los 5 puntos del checklist funcional y aprobada en producción la reclamación real de 273 registros históricos.

### Ejecución de Fase 4 (Migración, Reglas y Merge a `main`)
- **Backup completo local ([scripts/backup-firestore.js](file:///home/ruben/dev/sembrador-arba-elx/scripts/backup-firestore.js)):** Exportados 492 documentos (colecciones raíz `admins`, `claimRequests`, `follows`, `messages`, `users` y subcolecciones bajo `artifacts/arba-elx/public/data/*`) a `backups/firestore-backup-2026-11-14T21-55-37-184Z.json` (`1,8 MB`, ignorado en `.gitignore`).
- **Migración aditiva e idempotente ([scripts/migrate-legacy-v2.js](file:///home/ruben/dev/sembrador-arba-elx/scripts/migrate-legacy-v2.js)):** Ejecutadas **179 operaciones** en 1 batch:
  - 7/7 campañas con `ownerId: "uo8s4kCGgrZJwXETFtTGThFAATE2"`, `coordinators: []`, `visibility: "public"` donde faltaba y `participants` consistente.
  - 25/25 semillas con `totalQuantity`, `remainingQuantity` y `userAssignments: []` sin alterar datos existentes.
  - 147/420 logs reconciliados sincronizando `userId` y `userName: "Rubén Martínez Candela"` con `ownerId` a partir de las reclamaciones aprobadas.
  - Segunda pasada `--dry-run` verificada con `0` operaciones pendientes.
- **Despliegue de Reglas (`firebase-admin` SecurityRules):** Desplegadas [firestore.rules](file:///home/ruben/dev/sembrador-arba-elx/firestore.rules) (ruleset `eaee2c8d-ff9a-4da3-a862-41279e7d1783`) y [storage.rules](file:///home/ruben/dev/sembrador-arba-elx/storage.rules) (ruleset `be7ec24f-db84-4d9a-9db0-7a398858921f`) sobre `arba-elx-siembra`.
- **Integración en `main`:** Fusionada `feature/user-management-identity` sobre `main` y publicada en `origin/main`.

### Verificación
- `npm run test:run`: 7 archivos / 15 tests en verde.
- `npm run build`: build de producción Vite sin errores.

---

## [2026-11-14] — Fase 3 (Parcial): Despliegue Preview y Fix de Pantalla en Blanco en Producción

### Resumen de la Sesión
Se publicó `feature/user-management-identity` en `origin` para activar el entorno Preview en Vercel. Al abrir la URL Preview se detectó pantalla en blanco (`#root` vacío) y se reprodujo en local con `vite preview` + Chrome headless.

### Causa Raíz y Corrección
- **Chunking circular en [vite.config.js](file:///home/ruben/dev/sembrador-arba-elx/vite.config.js):** `manualChunks` agrupaba todo paquete que contuviera `leaflet` (incluidos `react-leaflet` y `@react-leaflet/core`) en el chunk `leaflet`, separado de `react` (`vendor`), provocando `TypeError: Cannot read properties of undefined (reading 'createContext')` al evaluar el bundle de producción. Se restringió el chunk `leaflet` con `!id.includes('react-leaflet')` para mantener `react-leaflet` y `@react-leaflet/core` junto a `react` en `vendor`.
- **Inicialización defensiva en [src/firebase.js](file:///home/ruben/dev/sembrador-arba-elx/src/firebase.js):** Se envolvió `getMessaging(app)` en un bloque `try / catch` para evitar fallos síncronos en navegadores o contextos sin soporte de Push/FCM.

### Verificación
- `npm run test:run`: 7 ficheros, 15 tests en verde.
- `npm run build` + verificación en navegador headless sobre `vite preview`: `0` errores de página (`PAGEERROR_COUNT: 0`) y render completo de la interfaz (`ROOT_HTML_LEN: 8811`).

---

## [2026-11-14] — Fase 2: Estabilización, Compatibilidad Legacy, Reglas Firestore y Tests

### Resumen de la Sesión
Se completó el Paso 2 del plan de integración sobre `feature/user-management-identity`, resolviendo todos los crashes en tiempo de ejecución, aislando correctamente la sesión anónima de invitados, unificando la atribución `ownerId` / `userId` para datos reclamados y legacy, endureciendo `firestore.rules` (vía `firestore-rules-author`) y actualizando la suite de tests.

### Cambios Implementados
- **Autenticación y Enrutamiento (`src/App.jsx`):** Importados `sendEmailVerification` y `deleteDoc`; añadidos estados `verificationMessage`/`verificationError` y banner de error en Email Verification Gate; evitada la creación de perfiles `/users/{uid}`, lectura de `/admins` y solicitud de notificaciones Push para sesiones anónimas (`u.isAnonymous`); restauradas rutas `?migrate=photos` y `?diagnostic=true`; mejorado el flujo `?join=` con persistencia en `sessionStorage` (`pendingJoinCampaignId`), apertura de login para visitantes anónimos y espera hasta completar verificación de email.
- **Retrocompatibilidad y Gestión (`CampaignDashboard.jsx`, `CampaignManager.jsx`):** Diferenciados visitantes anónimos frente a usuarios reales (`isRealUser = user && !user.isAnonymous`); añadidos `coordinators` y `isSuperAdmin` en permisos de gestión (`canManage`, `toggleCoordinator`, `handleDeleteCampaign`); resuelto crash de `MapPin` y añadido `handleSort` en `CampaignManager.jsx`; eliminada cláusula `orderBy` en `qLogs` para evitar requerir índice compuesto; soportado `seed.totalQuantity ?? seed.quantity ?? 0` y atribución `log.ownerId || log.userId`.
- **Unificación `ownerId` / `userId` (`SuperAdminDashboard.jsx`, `ClaimRecordsView.jsx`, `SowerView.jsx`):** `SuperAdminDashboard` ahora actualiza `{ ownerId: userId, userId: userId, userName }` tanto al aprobar reclamaciones como en el botón de sincronización; `ClaimRecordsView` filtra huérfanos cliente-side (`!log.ownerId`) para incluir logs sin clave `ownerId`; `SowerView` consulta `or(userId == uid, ownerId == uid)` y guarda `ownerId: userId` en nuevos logs.
- **Social, Mensajería y Firebase (`MessagesView.jsx`, `ChatWindow.jsx`, `firebase.json`, `firestore.rules`):** Consultas de mensajes filtradas por `or(senderId == uid, receiverId == uid)` con ordenación en memoria en `ChatWindow.jsx`; eliminada clave `"bucket"` en `firebase.json`. Reglas en `firestore.rules` actualizadas mediante `firestore-rules-author`: `allow read: if isSignedIn()` en `/users`, bloqueo de escrituras anónimas en rutas de usuario real, `isValidSelfJoin` para enlaces `?join=`, separación de reglas `seeds`/`groups`/`logs` con guardas `request.resource != null` en `delete`, `holeCount <= 1000`, validación estricta de esquemas y soporte `ownerId` + legacy sin `ownerId`.
- **Tests (`vitest`):** Eliminado el test obsoleto `src/components/CoordinatorView.test.jsx`; actualizados `src/App.test.jsx` y `src/components/SowerView.test.jsx`; creado `src/components/CampaignManager.test.jsx`.

### Próximos Pasos
- Ejecutar **Fase 3** del `ROADMAP.md`: hacer push de `feature/user-management-identity` a `origin`, validar el entorno Preview en Vercel, autorizar el dominio Preview en Firebase Authentication y completar pruebas funcionales end-to-end antes de tocar `main` o desplegar reglas.

---

## [2026-11-14] — Fase 1: Saneamiento de Ramas Git y Sistema de Memoria Persistente

### Resumen de la Sesión
Se ejecutó el Paso 1 del plan aprobado sobre `feature/user-management-identity` tras confirmar mantener el nombre de la rama, versionar `doc/datos_jornada_hFoDWjxbdbCzFj9rQRh1.csv` y utilizar el UID `uo8s4kCGgrZJwXETFtTGThFAATE2` como propietario por defecto en la futura migración.

### Cambios Implementados
- **Saneamiento Git:** Se actualizó `main` local (`781ead3` → `91b0f14`), se integró `TODO.md` en `feature/user-management-identity` mediante merge limpio sin conflictos y se eliminaron 14 ramas locales y 12 ramas remotas ya integradas en `main`.
- **Limpieza:** Se eliminó `firebase-debug.log` y el archivo huérfano `src/components/CampaignSelector.jsx`. Se versionó `doc/datos_jornada_hFoDWjxbdbCzFj9rQRh1.csv`.
- **Memoria Persistente:** Creados `GEMINI.md`, `docs/proyecto/ARQUITECTURA.md`, `docs/proyecto/ESTADO_ACTUAL.md`, `docs/proyecto/ROADMAP.md`, `docs/proyecto/BITACORA.md` y `.agents/workflows/cerrar-sesion.md`.

### Próximos Pasos
- Abordar la **Fase 2** del `ROADMAP.md` (corrección de bugs críticos, compatibilidad `ownerId`/`userId`, actualización de `firestore.rules` y suite de tests).

---

## [2026-11-14] — Auditoría Inicial de Ramas, Código y Compatibilidad Firebase

### Resumen de la Sesión
Se realizó una auditoría completa en modo lectura del historial de Git y del código fuente comparando `main` (`781ead3` / `origin/main` `91b0f14`) frente a `feature/user-management-identity` (`6800913` + cambios locales).

### Hallazgos Principales
1. **Ramas de Git:**
   - Se identificaron 14 ramas locales y 12 ramas remotas 100 % fusionadas en `main`, listas para eliminarse sin pérdida de historial.
   - `origin/main` solo contiene 1 commit adicional (`91b0f14`, añade `TODO.md`), por lo que no existen conflictos de código con `feature/user-management-identity`.
2. **Estado del Código en `feature/user-management-identity`:**
   - Se detectaron crashes por referencias no declaradas en `src/App.jsx` (`message`, `setMessage`, `setError`, `sendEmailVerification` en Email Verification Gate; `deleteDoc` en `handleSocialAction`) y en `src/components/CampaignManager.jsx` (`MapPin` no importado y `handleSort` no definido).
   - Se detectó que el login anónimo silencioso (`signInAnonymously`) dispara la creación de perfiles en `/users/{uid}` y bloquea botones en `CampaignDashboard.jsx` al evaluarse `user` como truthy.
3. **Compatibilidad de Datos y Reglas en Firebase:**
   - Descubierta discrepancia crítica entre `ClaimRecordsView`/`SuperAdminDashboard` (que usan `ownerId`) y `SowerView`/`CampaignDashboard`/`CampaignManager`/`firestore.rules` (que usan `userId`). Se definió la estrategia de unificación y migración idempotente.
   - Revisadas `firestore.rules` y `storage.rules`, identificando bloqueos en `SocialView`, `MessagesView`, `ChatWindow`, enlaces de invitación `?join=` y borrado de documentos en subcolecciones.

### Próximos Pasos
- Ejecutar limpieza de ramas, implantar los archivos de memoria persistente y abordar la Fase 2 del `ROADMAP.md`.
