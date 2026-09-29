# Ejemplos para el piloto

El catálogo institucional estaba vacío; los objetos de prueba pertenecían al proyecto separado de pruebas. La conexión no necesita un cambio de proyecto ni una copia de esa base.

Se prepararon 50 objetos ficticios disponibles, con recepción y custodia ficticias, sin entregas ni donaciones. Cubren Electrónica, Documentos, Llaves, Material académico, Ropa, Bolsos y accesorios, Dinero y Otros. Los nombres de edificios provienen del catálogo del campus; las aulas y hallazgos son ejemplos. Las características reservadas, el historial y los montos de efectivo quedan fuera de la proyección pública.

## Vista previa local

Ejecutar `npm run dev` y abrir `http://127.0.0.1:5173/?preview=pilot`. Esta opción funciona exclusivamente en desarrollo y modo local. Contiene 50 objetos en memoria; los cambios se pierden al recargar y no modifican el almacenamiento local ni Firebase. Para revisar gestión, abrir «Acceso personal» y seleccionar el perfil ficticio Decanato.

Gestión incluye filtros de categoría y tipo. Al cambiar de categoría se limpia el tipo; «Limpiar filtros» restablece todos los filtros. Las métricas generales conservan sus totales.

## Simulación del importador

`node scripts/import-pilot-examples.mjs`

No requiere credenciales, no realiza peticiones y muestra cantidades por categoría. Para repetir exactamente las fechas, definir `UCSD_IMPORT_DATE` con formato `YYYY-MM-DD`. Los IDs `demo-pilot-001` a `demo-pilot-050` y códigos `UCSD-DEMO-0001` a `UCSD-DEMO-0050` son estables.

## Aplicación posterior a la revisión

**Carga y publicación autorizadas y realizadas el 29/09/2026.** El piloto tiene 50 objetos ficticios; los ejemplos de QA permanecen separados.

El responsable debe proporcionar temporalmente `UCSD_IMPORT_ACCESS_TOKEN` (token OAuth de Google Cloud con permiso administrativo de Firestore) y `UCSD_IMPORT_OWNER_UID` (UID Firebase real del Developer institucional). No usar contraseñas ni tokens Firebase ID. No guardar credenciales en Git, archivos de documentación o comandos compartidos. El permiso Developer debe estar previamente activo. Este importador usa IAM administrativo, no las reglas del cliente; no concede roles ni cambia reglas.

Después de autorizar la carga, ejecutar `node scripts/import-pilot-examples.mjs --apply`. Solo admite `ucsd-objetos-perdidos`; rechaza un projectId distinto. Inspecciona únicamente los 50 IDs previstos. Omite cualquier ficha privada existente, incluidas las entregadas o archivadas. Una proyección pública huérfana detiene la operación para revisión. Los registros nuevos y sus proyecciones se crean en una única transacción atómica con condición de inexistencia; una colisión concurrente aborta la operación. No hay borrado ni actualización de objetos existentes.

Una repetición no duplica los registros. Antes de cargar, confirmar que la cuenta, el UID y el proyecto pertenecen al piloto acordado. Después, comprobar catálogo público, gestión autenticada, filtros y consola. La carga administrativa y la publicación de Hosting son operaciones independientes: ninguna prueba local equivale a validación remota.

El script comprueba el UID mediante Authentication: correo Developer exacto, verificado y cuenta habilitada. El token también necesita `firebaseauth.users.get`. Un ID existente con un código distinto aborta toda la carga.

Referencias oficiales: [Firestore REST e IAM](https://firebase.google.com/docs/firestore/use-rest-api), [commit atómico](https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/commit) y [consulta administrativa de cuentas](https://docs.cloud.google.com/identity-platform/docs/reference/rest/v1/projects.accounts/lookup).

## Verificación local del 29 de septiembre de 2026

61 pruebas aprobadas; lint y compilaciones Firebase/pruebas aprobados. Simulación del importador: 50 objetos. Navegador: las ocho categorías públicas dan 11, 6, 4, 8, 5, 10, 3 y 3 resultados respectivamente; gestión carga 50, Electrónica filtra 11 y Laptop filtra 1. «Limpiar filtros» devuelve los 50. No se observaron advertencias ni errores de consola durante la revisión local. Los filtros se revisaron también en vista móvil. No se ejecutó la importación remota ni se publicaron estas modificaciones.

## Publicación del 29/09/2026

Se cargaron 50 fichas privadas y sus 50 proyecciones públicas mediante un único commit administrativo. Se conservaron los permisos existentes y se comprobó billingEnabled=false antes de cargar. Hosting publicó 21 archivos del build de 3be2150, sin cambiar reglas ni el proyecto QA. Se preservó la referencia de la versión anterior en evidence/pilot-50-before-release.json para reversión de Hosting.

Los dos dominios institucionales responden con HTML, recursos iniciales y panel AdminPanel idénticos al build local. En navegador, las ocho categorías públicas y de gestión dieron 11, 6, 4, 8, 5, 10, 3 y 3 registros. Developer cargó los 50 internos. Electrónica y tipo Laptop dieron 1 registro; limpiar filtros devolvió 50. La consulta anónima cargó 50 públicos y denegó fichas privadas, accesos y consultas fuera del límite.

La consola conservaba dos advertencias de transporte Listen de las 15:00 UTC, anteriores a la carga/publicación; la lectura se recuperó y la revisión posterior mostró los 50 registros. No se observó un error que impidiera cargar. Esta revisión no modifica ni prueba entregas reales.

URL: https://ucsd-objetos-perdidos.firebaseapp.com/ y https://ucsd-objetos-perdidos.web.app/. Evidencia visual: evidence/pilot-50-published.png. Los artefactos de evidence se mantienen fuera de Git.
