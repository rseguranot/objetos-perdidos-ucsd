# Navegación y textos de objetos — 4 de octubre de 2026

Gestión aparece únicamente con sesión y permiso de registro. Las reglas de acceso existentes siguen aplicándose.

Cómo recuperarlos espera a que la vista pública y su página de catálogo estén renderizadas antes de desplazarse a la guía. La prueba descubrió que desplazarse antes de cargar las tarjetas dejaba la guía fuera de pantalla.

## Limpieza de datos

`scripts/clean-demo-object-copy.mjs` elimina las expresiones ficticio/ficticia de títulos y descripciones de registros de prueba. Recalcula únicamente los índices de búsqueda correspondientes. No modifica estados, fechas, entregas, evidencias ni historial. Usa máscaras de campos y precondiciones de versión; no recrea documentos públicos ausentes.

Requiere `UCSD_IMPORT_ACCESS_TOKEN` y `--project=ucsd-objetos-perdidos-pruebas` o `--project=ucsd-objetos-perdidos`. Sin `--apply` simula y guarda respaldo en `evidence/`, excluido de Git. Comprueba autorización y facturación deshabilitada antes de escribir.

Se simuló, respaldó y aplicó primero en QA (55 registros internos y 25 públicos), después en piloto (75 internos y 65 públicos). La segunda simulación encontró cero cambios pendientes en ambos entornos. Las marcas internas de prueba se conservaron.

## Verificación y publicación

- 117 pruebas aprobadas, lint y compilaciones QA/piloto con comprobación de tipos.
- Hosting publicado primero en QA y después en piloto; no se cambiaron reglas, índices de Firestore ni Apps Script.
- Menú sin sesión comprobado en QA: no muestra Gestión ni Usuarios y accesos.
- Menú del piloto comprobado con sesión Developer: conserva ambos accesos.
- Cómo recuperarlos probado desde Gestión y desde la vista pública; se cerraron las pestañas y se repitió desde pestañas nuevas en QA y piloto. La guía permaneció visible después de cargar los objetos.
- La página de octubre del piloto contiene 25 objetos y no incluye ficticio/ficticia en sus textos.
- La comprobación de versiones identificó una pestaña con el bundle anterior; al recargar recibió la compilación publicada y se repitió la prueba de cierre y reapertura.

Evidencia local: `evidence/guia-qa-reabierta.png`, `evidence/navegacion-sin-sesion.png`, `evidence/guia-piloto-reabierta.png`, respaldos y registros de pruebas/publicación.

## Etiquetas de custodia — 5 de octubre de 2026

Los ejemplos nuevos usan `Decanato - Archivo caja N`. Se respaldaron y actualizaron 69 registros del piloto que tenían exactamente `Custodia ficticia · caja N`, conservando el número de caja y recalculando únicamente el índice privado de búsqueda. No se modificaron documentos públicos. QA no tenía etiquetas con ese patrón.

Script: `scripts/clean-demo-custody.mjs`, mismas opciones y token administrativo que el script de limpieza de textos; simula por defecto y requiere `--apply` para escribir. Usa precondiciones de versión y máscaras de campos.

La verificación por API comparó los 69 registros con su respaldo: etiqueta correcta y todos los campos ajenos a custodia/índice idénticos. La simulación posterior encontró cero cambios pendientes. Pasaron 117 pruebas, lint y compilaciones QA/piloto. Se publicaron ambas versiones de Hosting.

Revisión completa posterior: 75 objetos comprobados. Los 69 normalizados se distribuyen en cajas 1–10. Se corrigió además la etiqueta exacta `Prueba ficticia piloto` del objeto de fotografías a `Decanato - Archivo caja 11`, con simulación, respaldo y precondición de versión. Quedan 70 registros con caja asignada y cinco borradores sin recepción, cuya custodia vacía se conserva. La segunda simulación encontró cero cambios pendientes. Este ajuste afecta datos y el script administrativo; no requiere otra publicación de Hosting.
