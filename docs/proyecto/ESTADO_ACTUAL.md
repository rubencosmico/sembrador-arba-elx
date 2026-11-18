# Estado Actual del Proyecto

**Última actualización:** 2026-11-18
**Rama principal en producción:** `main`
**URL de Producción (Vercel):** https://sembrador-arba-elx.vercel.app

## 1. Situación General
- **Etapas 1, 2 y 3 (Entregas 1 y 2) COMPLETADAS Y EN PRODUCCIÓN (`main`):**
  - **Etapa 1 (Identidad y Datos Legacy):** Sistema de usuarios, sesiones anónimas aisladas, atribución unificada `ownerId` + `userId`, backup local y migración idempotente de los datos reales de campo (`7` campañas, `16` grupos, `25` lotes de semillas y `420` logs).
  - **Etapa 2 (Cartografía Satélite y GPS Submétrico):** Ortofoto satélite PNOA (IGN España, zoom 20/22) por defecto en todos los mapas (`mapLayers.js`, `MapLayerControl.jsx`) y posicionamiento submétrico con `watchPosition`, pin arrastrable y cruceta de `25 cm` / `1 m` (`PrecisionMapPicker.jsx`).
  - **Etapa 3 — Entrega 1 (Seguimiento Longitudinal, Radar GPS, Clima Open-Meteo, GeoJSON y Metadatos Multi-Colectivo):** Colección `checkups` y resumen desnormalizado en `logs`, Modo Radar de Revisión (`MonitoringRadarView.jsx`, `CheckupFormModal.jsx`), cruce meteorológico con Open-Meteo (`monitoringUtils.js`), exportación a GeoJSON/CSV enriquecido (`csvUtils.js`), metadatos `organizationName`/`locationName`/`biome` y reglas de Firestore optimizadas por debajo del límite de 1.000 expresiones AST.
  - **Etapa 3 — Entrega 2 (*Open Seed Lab*):** Catálogo verificado de 10 especies mediterráneas (`seedProtocolsCatalog.js`), interfaz pública `SeedLabView.jsx` accesible desde `LandingPage.jsx` y `App.jsx`, modo taller paso a paso, aportaciones comunitarias, verificación por SuperAdmin, % de éxito empírico en campo, selector de protocolo y procedencia genética (`originLocation`, `harvestYear`) en `CampaignManager.jsx`, y trazabilidad en CSV/GeoJSON.
- **Suite de Tests y Build:** `10` suites (`28` tests unitarios/integración en Vitest) al 100 % en verde y build de producción Vite (`1567` módulos) validado.

## 2. Seguridad Firebase Activa
- **`firestore.rules`:** Ruleset `e26c1055-8ae7-4377-89d3-258afc55ea68` (incluye colección `seedProtocols/{protocolId}`, campos `protocolId`/`originLocation`/`harvestYear` en `seeds/{seedId}`, colección `checkups/{checkupId}` y optimizaciones AST en `logs/{logId}`).
- **`storage.rules`:** Ruleset `be7ec24f-db84-4d9a-9db0-7a398858921f`.

## 3. Mantenimiento Técnico Opcional y Próximos Pasos
- **Mantenimiento Técnico Opcional:**
  - Revisar [TODO.md](file:///home/ruben/dev/sembrador-arba-elx/TODO.md) (`@google-cloud/storage` instalada `7.18.0` frente a `>= 7.19.0` recomendado para validación CRC32c por defecto).
  - Limpiar subdominios Preview antiguos en *Firebase Console → Authentication → Settings → Authorized domains*.
- **Base de trabajo futura:** Cualquier nueva línea de desarrollo debe partir en una nueva rama creada desde `main`, manteniendo `main` protegida hasta su validación previa en Vercel Preview.
