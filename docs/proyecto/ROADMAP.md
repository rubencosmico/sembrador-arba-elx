# Roadmap del Proyecto — Sembrador ARBA Elx

## Etapa 1: Integración de Identidad, Compatibilidad Legacy y Paso a Producción (COMPLETADA)

### Fase 1: Saneamiento del Repositorio y Memoria Persistente
- [x] Crear archivos del sistema de memoria persistente (`GEMINI.md`, `docs/proyecto/*`, `.agents/workflows/cerrar-sesion.md`).
- [x] Actualizar `main` local (`git fetch origin main:main`) e integrar `TODO.md` en `feature/user-management-identity`.
- [x] Eliminar las 14 ramas locales y 12 ramas remotas ya integradas en `main`.
- [x] Limpiar `firebase-debug.log` y eliminar el componente huérfano `src/components/CampaignSelector.jsx`.
- [x] Versionar `doc/datos_jornada_hFoDWjxbdbCzFj9rQRh1.csv` en `feature/user-management-identity`.

### Fase 2: Corrección de Bugs Críticos y Compatibilidad de Código
- [x] **Fix Crashes en `src/App.jsx`:** Importar `deleteDoc` y `sendEmailVerification`; declarar estados de mensaje/error en el Email Verification Gate.
- [x] **Fix Sesión Anónima en `src/App.jsx` y `CampaignDashboard.jsx`:** Evitar creación de perfiles `/users` y petición de Push para `u.isAnonymous`; distinguir `isRealUser = user && !user.isAnonymous`; incluir `campaign.coordinators` en `canManage`.
- [x] **Fix Crashes en `src/components/CampaignManager.jsx`:** Importar `MapPin`, implementar `handleSort`, y eliminar `orderBy('timestamp', 'desc')` de la query de logs para evitar requerir índice compuesto.
- [x] **Unificar Atribución `ownerId` / `userId`:** Actualizar `SuperAdminDashboard.jsx` para escribir `{ ownerId: userId, userId: userId, userName: req.userName }` al aprobar reclamaciones y soportar ambos campos en `SowerView.jsx` y `ClaimRecordsView.jsx`.
- [x] **Fix Consultas Sociales y Reglas (`firestore-rules-author`):** Ajustar queries en `MessagesView.jsx` y `ChatWindow.jsx`; corregir `firestore.rules` (lectura de `/users`, guardas `request.resource != null` en `delete`, auto-unión en `?join=`) y `firebase.json`.
- [x] **Actualizar Suite de Tests:** Adaptar `src/App.test.jsx` y reemplazar `src/components/CoordinatorView.test.jsx` para que `npm run test:run` y `npm run build` pasen al 100 %.

### Fase 3: Validación en Entorno Preview de Vercel
- [x] Subir cambios a `origin/feature/user-management-identity` y verificar despliegue Preview en Vercel.
- [x] Autorizar el dominio Preview de Vercel en Firebase Authentication → Authorized domains.
- [x] Ejecutar pruebas funcionales completas en Preview (login Google/Email/Magic Link, reclamación de logs reales, creación y borrado de jornada de prueba).

### Fase 4: Migración de Datos y Paso a Producción (`main`)
- [x] Ejecutar backup completo de Firestore a JSON local (`scripts/backup-firestore.js`).
- [x] Ejecutar script idempotente `scripts/migrate-legacy-v2.js` (normalización de campañas con `ownerId` por defecto `uo8s4kCGgrZJwXETFtTGThFAATE2`, lotes y reconciliación de logs reclamados).
- [x] Desplegar `firestore.rules` y `storage.rules` en Firebase (`arba-elx-siembra`).
- [x] Hacer merge de `feature/user-management-identity` a `main`, push a `origin/main` y limpiar la rama.

---

## Etapa 2: Cartografía Satélite y Posicionamiento GPS Submétrico (COMPLETADA)

- [x] **Capas Satélite por Defecto (`src/utils/mapLayers.js`, `src/components/MapLayerControl.jsx`):** Integrar Ortofoto PNOA máxima actualidad (IGN España, zoom nativo 20 / zoom digital 22) como capa predeterminada, Satélite Global Esri World Imagery y Mapa Callejero/Topográfico OSM en `LandingPage.jsx`, `MapView.jsx` y el formulario de siembra.
- [x] **Captura GPS Continua y Micro-Ajuste Submétrico (`src/components/PrecisionMapPicker.jsx`, `src/components/SowingForm.jsx`):** Implementar `watchPosition` con retención automática de la mejor precisión (`acc`), indicador semafórico de calidad GPS, arrastre manual del marcador sobre ortofoto satélite y cruceta de desplazamiento cardinal (`25 cm` / `1 m`), guardando únicamente el punto final `{ lat, lng, acc }`.
- [x] **Tests, Validación y Paso a Producción:** Añadir `src/components/SowingForm.test.jsx`, validar en Preview, fusionar en `main` (`496ad5a`) y limpiar rama temporal.

---

## Etapa 3: Ciencia Ciudadana y Metodología de Semillas (EN CURSO)

### Entrega 1: Seguimiento en Campo, Radar GPS, Clima Open-Meteo, GeoJSON y Metadatos Multi-Colectivo (COMPLETADA EN `main`)
- [x] **Modelo de Datos y Reglas de Seguridad (`firestore.rules` vía `firestore-rules-author`):**
  - Reglas para la colección `artifacts/arba-elx/public/data/checkups/{checkupId}` y actualización colaborativa de los 7 campos resumen (`lastCheckupStatus`, `lastCheckupAt`, `lastSurvivingCount`, `lastGrowthStage`, `checkupCount`, `lastCheckupBy`, `updatedAt`) en `logs/{logId}`.
  - Optimización de expresiones AST en `firestore.rules` (uso de variables locales `let`, `.get(..., null)`, `isValidLogCheckupSummary` y `canUpdateLog`) para evitar superar el límite de 1.000 expresiones por petición en documentos con 26+ campos; desplegado ruleset `8cf23a37-017e-47cf-b50d-ee1c026db6ee`.
- [x] **Utilidades Científicas, Clima y Exportación GIS (`src/utils/monitoringUtils.js`, `src/utils/csvUtils.js`):**
  - Cálculo de distancia geodésica Haversine en metros, rumbo cardinal, tasas de supervivencia/emergencia por micrositio, orientación y lote/tratamiento, y consulta automática a **Open-Meteo Archive API** (lluvia acumulada post-siembra y días de lluvia).
  - Exportación abierta a **GeoJSON** (`generateLogGeoJSON`, compatible con QGIS/ArcGIS/uMap) y **CSV enriquecido** con columnas del último seguimiento.
- [x] **Componentes de Seguimiento y Radar en Campo (`CheckupFormModal.jsx`, `MonitoringRadarView.jsx`, `CampaignDashboard.jsx`, `MapView.jsx`):**
  - Formulario de revisión en 1 toque (`Vivo`, `Latente`, `Seco/Muerto`, `Depredado`, `No localizado`), conteo de plántulas vivas, estadio de crecimiento, etiquetas de estrés/causa y foto *T+N* comprimida.
  - Orden de guardado transaccional seguro en `CampaignDashboard.jsx` (`updateDoc` en `logs` antes de `addDoc` en `checkups`) para evitar documentos huérfanos.
  - Modo Radar de Revisión por proximidad GPS en metros con miniatura de foto *T=0*, mapa satélite coloreado por estado de supervivencia, panel de evidencia científica y línea de tiempo (*Timelapse*).
- [x] **Metadatos Multi-Colectivo (`CampaignManager.jsx`, `CampaignDashboard.jsx`, `LandingPage.jsx`):**
  - Campos retrocompatibles `organizationName` (`"ARBA Elx"`), `locationName` (`"Elche, España"`) y `biome` (selector de ecosistema).
- [x] **Tests, Validación en Vivo y Paso a Producción:**
  - Añadidos `src/utils/monitoringUtils.test.js`, `src/utils/csvUtils.test.js` y `src/components/CampaignDashboard.test.jsx` (`9` suites / `24` tests en verde).
  - Verificación en vivo contra Firestore REST API y fusión en `main` (`e2ae2b0`).

### Entrega 2: Biblioteca Pública Global de Protocolos de Semillas (*Open Seed Lab*) (PENDIENTE)
- [ ] **1. Higiene de Ramas Previa:**
  - Eliminar la rama ya fusionada `feature/citizen-science-monitoring` (local y remota) y crear una nueva rama limpia desde `main` (`feature/open-seed-lab`).
- [ ] **2. Catálogo Base y Reglas de Seguridad (`seedProtocols`):**
  - Crear `src/utils/seedProtocolsCatalog.js` con las fichas botánicas y protocolos pre-germinativos verificados de 10 especies autóctonas de referencia (*Ceratonia siliqua*, *Quercus coccifera*, *Quercus ilex*, *Chamaerops humilis*, *Pistacia lentiscus*, *Pinus halepensis*, *Rhamnus lycioides*, *Tetraclinis articulata*, *Olea europaea var. sylvestris*, *Ziziphus lotus*).
  - Estructura estandarizada de receta: nombre científico, nombre común, tipo de latencia, pasos de *Escarificación*, *Hidratación (horas)*, *Estratificación*, *Inoculación / Bioestimulantes*, *Pildorizado / Protectores*, época óptima de recolección y siembra.
  - Configurar `firestore.rules` (vía `firestore-rules-author`) para `artifacts/arba-elx/public/data/seedProtocols/{protocolId}` (lectura pública, creación por usuarios reales como `'community'` / *En ensayo*, y verificación `'verified'` por Admin) y ampliar `isValidSeed` con `protocolId`, `originLocation` y `harvestYear`.
- [ ] **3. Interfaz Pública de Biblioteca (`src/components/SeedLabView.jsx`) e Integración en `LandingPage.jsx`:**
  - Acceso público desde la barra superior y hero de `LandingPage.jsx` (incluso para visitantes sin sesión iniciada).
  - Buscador por especie, filtros por tipo de tratamiento/latencia y estado (`Verificado` vs `En ensayo`), vista paso a paso para talleres, formulario de aportación comunitaria, botón de verificación para SuperAdmin y cálculo del **% de éxito empírico en campo** cruzando lotes y revisiones reales.
- [ ] **4. Vinculación con Lotes y Procedencia Genética en `src/components/CampaignManager.jsx`:**
  - Selector de protocolo de la biblioteca al crear/editar un lote en `CampaignManager.jsx` para autocompletar el tratamiento (`treatment` + `protocolId`).
  - Campos de procedencia genética del lote: ubicación de recolección (`originLocation`) y año de cosecha (`harvestYear`).
- [ ] **5. Tests, Build y Validación en Vercel Preview:**
  - Añadir tests unitarios/integración de la Entrega 2, verificar `npm run test:run` y `npm run build`, desplegar en Vercel Preview y validar antes de fusionar en `main`.

---

## Etapa 4: Mantenimiento Técnico Adicional (PENDIENTE)
- [ ] **Revisión de SDKs de Cloud Storage (`TODO.md`):** Verificar versiones de `@google-cloud/storage` / `firebase-admin` en el proyecto para cumplimiento de validación automática de checksums CRC32c en subidas administrativas.
