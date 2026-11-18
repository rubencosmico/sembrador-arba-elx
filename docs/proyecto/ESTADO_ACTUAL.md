# Estado Actual del Proyecto

**Última actualización:** 2026-11-18
**Rama principal en producción:** `main` (`e2ae2b0`)
**Rama de desarrollo activo (Preview):** `feature/open-seed-lab`
**URL de Producción (Vercel):** https://sembrador-arba-elx.vercel.app

## 1. Situación General
- **Etapas 1, 2 y 3 (Entrega 1) EN PRODUCCIÓN (`main`):**
  - **Etapa 1 (Identidad y Datos Legacy):** Sistema de usuarios, sesiones anónimas aisladas, atribución unificada `ownerId` + `userId`, backup local y migración idempotente de los datos reales de campo (`7` campañas, `16` grupos, `25` lotes de semillas y `420` logs).
  - **Etapa 2 (Cartografía Satélite y GPS Submétrico):** Ortofoto satélite PNOA (IGN España, zoom 20/22) por defecto en todos los mapas (`mapLayers.js`, `MapLayerControl.jsx`) y posicionamiento submétrico con `watchPosition`, pin arrastrable y cruceta de `25 cm` / `1 m` (`PrecisionMapPicker.jsx`).
  - **Etapa 3 — Entrega 1 (Seguimiento Longitudinal, Radar GPS, Clima Open-Meteo, GeoJSON y Metadatos Multi-Colectivo):** Colección `checkups` y resumen desnormalizado en `logs`, Modo Radar de Revisión (`MonitoringRadarView.jsx`, `CheckupFormModal.jsx`), cruce meteorológico con Open-Meteo (`monitoringUtils.js`), exportación a GeoJSON/CSV enriquecido (`csvUtils.js`) y metadatos multi-colectivo (`organizationName`, `locationName`, `biome`).
- **Etapa 3 — Entrega 2 (*Open Seed Lab*) IMPLEMENTADA EN `feature/open-seed-lab`:**
  - Catálogo verificado de 10 especies mediterráneas (`seedProtocolsCatalog.js`), interfaz pública `SeedLabView.jsx` accesible desde `LandingPage.jsx` y `App.jsx`, modo taller paso a paso, aportaciones comunitarias, verificación por SuperAdmin, % de éxito empírico en campo, selector de protocolo y procedencia genética (`originLocation`, `harvestYear`) en `CampaignManager.jsx`, y trazabilidad en CSV/GeoJSON.
- **Suite de Tests y Build (`feature/open-seed-lab`):** `10` suites (`28` tests unitarios/integración en Vitest) al 100 % en verde y build de producción Vite (`1567` módulos) validado.

## 2. Seguridad Firebase Activa
- **`firestore.rules`:** Ruleset `e26c1055-8ae7-4377-89d3-258afc55ea68` (incluye colección `seedProtocols/{protocolId}` y los campos `protocolId`, `originLocation` y `harvestYear` en `seeds/{seedId}`, manteniendo las optimizaciones AST en `logs/{logId}`).
- **`storage.rules`:** Ruleset `be7ec24f-db84-4d9a-9db0-7a398858921f`.

## 3. Siguiente Paso Inmediato (Pendiente)
1. **Validación en Vercel Preview y Paso a Producción (`main`):**
   - Verificar funcionalmente *Open Seed Lab* y la creación de lotes con procedencia genética sobre el entorno Preview de `feature/open-seed-lab` (recordando autorizar el nuevo subdominio Preview en *Firebase Console → Authentication → Settings → Authorized domains* si se prueba login en ese subdominio).
   - Tras aprobación del usuario, fusionar `feature/open-seed-lab` en `main` y limpiar la rama.
2. **Mantenimiento Técnico Opcional:**
   - Revisar `TODO.md` (`@google-cloud/storage` instalada `7.18.0` frente a `>= 7.19.0` recomendado para validación CRC32c por defecto) e higiene de dominios Preview antiguos en Firebase Authentication.
