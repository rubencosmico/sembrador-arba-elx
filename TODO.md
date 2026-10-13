# TODO: Actualizar SDKs de Google Cloud Storage para validación de checksums

**Proyecto:** `arba-elx-siembra`  
**Prioridad:** Alta (Integridad de datos)  
**Origen:** Anuncio de servicio obligatorio de Google Cloud

---

## 🎯 Objetivo
Actualizar las librerías cliente de Google Cloud Storage a las versiones mínimas recomendadas (o superiores) para habilitar de forma predeterminada la validación automática de sumas de verificación (*CRC32c checksums*) de extremo a extremo durante las subidas.

---

## 📋 Lista de Tareas (Checklist)

- [ ] **1. Identificar dependencias:** Comprobar qué SDKs o herramientas de Cloud Storage utiliza el proyecto.
- [ ] **2. Actualizar las librerías a las versiones mínimas recomendadas:**
  - **Python SDK:** `>= 3.7.0`
  - **Node.js SDK:** `>= 7.19.0`
  - **Java SDK:** `>= 2.62.0`
  - **Go SDK:** `>= 1.60.0`
  - **.NET SDK:** `>= 5.0.0`
  - **PHP SDK:** `>= 1.51.0`
  - **C++ SDK:** `>= 2.46.0`
  - **Ruby SDK:** `>= 1.60.0`
  - **Rust SDK:** `>= 1.19.0`
  - **Cloud Storage FUSE:** `>= 3.8.0`
  - **Cloud Storage Connector:** `>= 3.0.18`, `>= 3.1.14` o `>= 4.0.3`
- [ ] **3. Probar subidas:** Verificar que las operaciones de subida funcionen correctamente tras la actualización.
- [ ] **4. Monitorear en GCP:** Confirmar en Cloud Monitoring que se reciben eventos bajo la métrica `storage.googleapis.com/api/object_checksummed_write_count`.

---

## 🔗 Referencias
- [Guía de validación de datos y detección de cambios con checksums](https://c.gle/AAuDWvm4pUrQoGEF6OdI8Caw4FfTrN-Lji9FbDncC5zUvT7E58cDiRHq_PcSf6sLp925T3ORBNHJxS303janKBK9LzQkAstKjZ26i7jP4lUIaU_YBgzsXA7T0lL1gIOXrhRoNhw8URvREfXCpciIZCanvoAQyc0g9yuk)
