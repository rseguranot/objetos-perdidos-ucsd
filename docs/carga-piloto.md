# Ejemplos para el piloto

El catálogo institucional estaba vacío; los objetos de prueba pertenecían al proyecto separado de pruebas. La conexión no necesita un cambio de proyecto ni una copia de esa base.

La carga inicial creó 50 objetos ficticios disponibles. Posteriormente se distribuyeron entre distintos estados para demostrar las métricas: 5 borradores, 30 disponibles, 7 entregados y 8 archivados. Dentro de los archivados hay 3 donados y 1 documento remitido; quedan 3 disponibles con plazo de custodia cumplido. Cubren Electrónica, Documentos, Llaves, Material académico, Ropa, Bolsos y accesorios, Dinero y Otros. Los nombres de edificios provienen del catálogo del campus; las aulas y hallazgos son ejemplos. Las características reservadas, el historial y los montos de efectivo quedan fuera de la proyección pública.

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

## Gestionar estados desde Administrador o Developer

En **Gestión**, buscar el objeto por nombre o código y usar su acción:

- **Editar**: modifica datos de un borrador o disponible; no cambia libremente el estado.
- **Publicar**: pasa un borrador a disponible después de confirmar recepción, fecha y ubicación de custodia mediante Editar.
- **Entregar**: completa receptor, comprobación de propiedad, tipo de identificación y referencia de foto guardada externamente; confirma la entrega.
- **Archivar**: retira el objeto del catálogo y conserva el historial. No equivale a entregar ni donar.
- **Donar**: aparece para objetos elegibles con recepción confirmada y al menos 90 días de custodia. Exige organización receptora y constancia. No se permite para dinero ni documentos.
- **Remitir documento**: aparece en documentos tras el plazo; exige institución receptora y constancia.
- **Historial**: permite consultar las operaciones y evidencia interna. Los registros entregados, donados o remitidos no permiten editar ni reabrir sus datos. Una entrega puede archivarse conservando su constancia; un archivo sin destino puede recibir una donación/remisión cuando cumpla los requisitos.

Administrador, Developer y Decanato tienen estas acciones; Registro de hallazgos solo registra y edita sus borradores. Los botones de las métricas filtran la tabla. «Estado: Archivado» incluye los donados/remitidos, que tienen etiquetas específicas en cada fila; «Seguimiento / destino» permite separarlos.

Las cuatro tarjetas superiores cuentan **estados actuales**, por lo que suman el total. Si se archiva una entrega, pasa de Entregado a Archivado; la evidencia de devolución permanece en el historial. Donados y Documentos remitidos son subconjuntos de Archivado y no se suman nuevamente al total.

## Preparación reproducible de ejemplos con estados

`node scripts/prepare-pilot-states.mjs` muestra la distribución final y la preparación para pruebas de navegador sin conexión. `--apply` requiere las mismas variables OAuth/UID del importador, comprueba identidad Developer, permiso activo y ausencia de facturación. Solo modifica los IDs y códigos del manifiesto ficticio con descripción «Objeto ficticio.»; rechaza ejemplos ya gestionados sin el marcador del plan. Conserva el historial anterior, crea un respaldo privado en `evidence/pilot-states-backup-*.json` y aplica las modificaciones privadas/proyecciones en un commit atómico condicionado a las versiones leídas. Un cambio concurrente aborta la escritura.

La preparación deja UCSD-DEMO-0042 disponible para entregar, UCSD-DEMO-0043 disponible y con plazo cumplido para donar, y UCSD-DEMO-0044 disponible para archivar desde la UI. Después de completar esas tres operaciones se obtiene la distribución final. Una repetición conserva los ejemplos ya preparados y sus operaciones posteriores. `--verify` comprueba los 50 registros y que solo los disponibles tengan una proyección pública exacta.

La preparación ajusta fechas de custodia de ejemplos a 100 días anteriores y lo deja registrado como simulación. Receptores, comprobaciones y referencias de actas/fotos son ficticios: **no hubo entrega física, documentos personales ni fotografías reales**. Los respaldos contienen únicamente estos ejemplos y no se incluyen en Git; su restauración sería una operación administrativa separada que requiere revisar versiones y no sobrescribir trabajo posterior.

## Verificación de estados · 29/09/2026

67 pruebas aprobadas, lint, tipos y builds Firebase/pruebas correctos. Prueba específica: Administrador autorizado puede entregar/archivar/donar, Registro de hallazgos no puede y los datos cerrados no son editables. Auditoría de reglas sin modificaciones. Preparación remota: 46 escrituras atómicas, respaldo previo y facturación deshabilitada.

Navegador con Developer institucional: entrega de 0042, donación de 0043 y archivo de 0044 guardados en Firebase con sus formularios y confirmaciones; filtro Donados muestra los 3 ejemplos. Lectura remota final: 50 internos (5/30/7/8), 3 donaciones y 1 remisión; únicamente los 30 disponibles conservan proyección pública. Lectura anónima SDK: 30 públicos permitidos; privados, accesos y consultas fuera del límite denegados. No se inició sesión con otro Administrador institucional; esa comprobación de rol es local y de reglas, distinta de la prueba real con Developer.

Filtros públicos por categoría: Electrónica 8, Documentos 3, Llaves 1, Material académico 5, Ropa 2, Bolsos y accesorios 8, Dinero 1, Otros 2. Hosting actualizado en ambos dominios; HTML, recursos iniciales y AdminPanel coinciden con el build local. QA no se modificó. Evidencia visual: `evidence/pilot-states-published.png`.
