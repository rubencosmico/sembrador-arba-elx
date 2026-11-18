# Estado Actual del Proyecto

**Última actualización:** 2026-11-18
**Rama principal en producción:** `main` (`e2ae2b0`, sincronizada con `feature/citizen-science-monitoring`)
**URL de Producción (Vercel):** https://sembrador-arba-elx.vercel.app

## 1. Situación General
- **Etapas 1, 2 y 3 (Entrega 1) COMPLETADAS Y EN PRODUCCIÓN (`main`):**
  - **Etapa 1 (Identidad y Datos Legacy):** Sistema de usuarios, sesiones anónimas aisladas, atribución unificada `ownerId` + `userId`, backup local y migración idempotente de los datos reales de campo (`7` campañas, `16` grupos, `25` lotes de semillas y `420` logs).
  - **Etapa 2 (Cartografía Satélite y GPS Submétrico):** Ortofoto satélite PNOA (IGN España, zoom 20/22) por defecto en todos los mapas (`mapLayers.js`, `MapLayerControl.jsx`) y posicionamiento submétrico con `watchPosition`, pin arrastrable y cruceta de `25 cm` / `1 m` (`PrecisionMapPicker.jsx`).
  - **Etapa 3 — Entrega 1 (Seguimiento Longitudinal, Radar GPS, Clima Open-Meteo, GeoJSON y Metadatos Multi-Colectivo):** Colección `checkups` y resumen desnormalizado en `logs`, Modo Radar de Revisión por proximidad en metros (`MonitoringRadarView.jsx`, `CheckupFormModal.jsx`), cruce automático de precipitación acumulada post-siembra vía Open-Meteo Archive API (`monitoringUtils.js`), exportación abierta a GeoJSON/CSV enriquecido (`csvUtils.js`), metadatos `organizationName`/`locationName`/`biome` y reglas de Firestore optimizadas por debajo del límite de 1.000 expresiones AST.
- **Suite de Tests y Build:** `9` suites (`24` tests unitarios/integración en Vitest) al 100 % en verde y build de producción Vite (`1565` módulos) validado.

## 2. Capacidades Activas en Producción (`main`)
- **Identidad, Comunidad y Navegación Pública:** Login con Google, Email/Contraseña (`auth-utils.js`), verificación de correo, Magic Link, perfil con vinculación de proveedores (`ProfileView.jsx`), mensajería (`MessagesView.jsx`, `ChatWindow.jsx`), directorio social (`SocialView.jsx`) y exploración pública anónima segura (`u.isAnonymous`).
- **Siembra Submétrica y Cartografía Satélite:** Capas PNOA (IGN), Esri World Imagery y OSM (`MapLayerControl.jsx`); captura GPS continua (`watchPosition`) y ajuste submétrico visual/cardinal (`PrecisionMapPicker.jsx`, `SowingForm.jsx`).
- **Ciencia Ciudadana y Seguimiento en Campo (Entrega 1):**
  - Revisiones longitudinales en 1 toque (`CheckupFormModal.jsx`: `alive`, `dormant`, `dead`, `predated`, `not_found`, conteo de plántulas, estadio de crecimiento, causas de estrés y foto *T+N* para *Timelapse*), actualizando primero `logs/{logId}` y después `checkups/{checkupId}`.
  - Modo Radar de Revisión (`MonitoringRadarView.jsx`) con distancia Haversine en metros, rumbo cardinal, miniatura *T=0*, mapa de supervivencia, lluvia acumulada post-siembra (Open-Meteo) y gráficas comparativas por micrositio, orientación y lote.
  - Exportación abierta a **GeoJSON** (QGIS/ArcGIS/uMap) y **CSV enriquecido**, y metadatos multi-colectivo (`organizationName`, `locationName`, `biome`).
- **Seguridad Firebase Activa:** `firestore.rules` (ruleset `8cf23a37-017e-47cf-b50d-ee1c026db6ee`) y `storage.rules` (ruleset `be7ec24f-db84-4d9a-9db0-7a398858921f`).

## 3. Siguiente Paso Inmediato (Pendiente de Desarrollo)
- **Etapa 3 — Entrega 2: Biblioteca Pública Global de Protocolos de Semillas (*Open Seed Lab*):**
  1. Eliminar la rama ya fusionada `feature/citizen-science-monitoring` (local y remota) y crear una rama limpia desde `main` (`feature/open-seed-lab`).
  2. Crear el catálogo precargado de protocolos pre-germinativos (`src/utils/seedProtocolsCatalog.js` con 10 especies autóctonas mediterráneas de referencia) y añadir reglas de seguridad en `firestore.rules` para la colección `artifacts/arba-elx/public/data/seedProtocols/{protocolId}` (lectura pública, creación autenticada `'community'` y verificación `'verified'` por Admin) y campos `protocolId`, `originLocation`, `harvestYear` en `seeds`.
  3. Construir la interfaz pública `src/components/SeedLabView.jsx` accesible desde `LandingPage.jsx` (buscador, filtros, receta paso a paso para talleres, aportación comunitaria, sello `Verificado` y % de éxito empírico en campo).
  4. Conectar la creación de lotes en `src/components/CampaignManager.jsx` con el selector de protocolos del *Open Seed Lab* y campos de procedencia genética (`originLocation`, `harvestYear`).
- **Mantenimiento Técnico Opcional:** Revisión de versiones de SDKs de Cloud Storage (`TODO.md`) e higiene de dominios Preview antiguos en Firebase Authentication.
