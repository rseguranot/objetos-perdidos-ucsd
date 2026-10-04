# Arquitectura y mantenimiento

Esta aplicación centraliza el catálogo de hallazgos y el registro interno de custodia. Tiene una demo local y dos destinos Firebase independientes: piloto institucional y QA aislado. No hay transferencia automática entre entornos. Ambos Hosting tienen publicada la interfaz de paginación y reportes. El piloto contiene 50 ejemplos ficticios y ningún hallazgo real; sus campos derivados se actualizaron con respaldo previo. QA migró sus registros ficticios iniciales y aprobó el circuito SDK autenticado, 136 combinaciones de consulta y conteos completos de referencia.

## Organización del código

| Ubicación | Responsabilidad |
|---|---|
| `src/App.tsx` y `src/components/` | Navegación, catálogo, formularios, panel interno, roles e historial |
| `src/theme.ts` y `src/styles.css` | Tema MUI, colores, composición adaptable y estados visuales |
| `src/domain/types.ts` | Tipos de objetos, filtros, entregas y destinos |
| `src/domain/catalog.ts` | Clasificación, búsqueda, proyección pública, validación y cambios de estado |
| `src/domain/roles.ts` | Perfiles, autorización de operaciones y protección del acceso Developer |
| `src/domain/records.ts` | Comparación de registros para preservar datos y detectar cambios |
| `src/data/useWorkspace.ts` | Estado de la aplicación y selección de operaciones locales o remotas |
| `src/data/storage.ts`, `access-storage.ts` y `seed.ts` | Lectura y validación local, permisos simulados y ejemplos ficticios |
| `src/data/firebase.ts`, `cloud.ts` y `mode.ts` | SDK, identidad Google/contraseña, consultas, escrituras y selección de entorno |
| `src/data/firestore-records.ts` | Conversión entre fecha ISO del dominio y timestamp autoritativo de destino en Firestore; lectura de registros anteriores |
| `src/data/pages.ts` y `src/domain/search-index.ts` | Paginación de 25 por cursor, consultas filtradas y construcción de términos/edificio/fechas derivadas |
| `src/data/metrics.ts` | Agregaciones de estado, destinos, revisión vencida y reporte mensual/anual independientes de las páginas |
| `src/domain/identity.ts` y `test-accounts.ts` | Verificación del proveedor del token y excepción limitada al proyecto QA |
| `firebase/firestore.rules` y `firestore.pruebas.rules` | Reglas institucionales y variante exclusiva QA con identidades fijas |
| `firebase/firestore.indexes.json` | Índices compuestos compartidos; publicados en QA, pendientes en piloto |
| `tests/` | Pruebas del dominio, autorización, persistencia y regresiones |
| `scripts/verify-firebase-public.mjs` | Comprobación anónima de solo lectura contra Firebase |
| `scripts/verify-firebase-qa.mjs` | Circuito autenticado y denegaciones con las tres identidades fijas QA |
| `scripts/backfill-search-index.mjs` | Simulación, inspección y eventual migración protegida de campos derivados; sin escritura por defecto |
| `scripts/verify-capacity-qa.mjs` | Lecturas QA previstas para paginación, índices, agregados y separación público/interno |

Las operaciones de dominio construyen un nuevo registro y su evento de historial. La capa de datos vuelve a comprobar la autorización antes de guardarlo. En Firebase las reglas son la barrera de seguridad; ocultar un botón o validar desde React solo mejora la interacción.

## Datos públicos e internos

Cada objeto tiene un identificador estable y un código de consulta. Se clasifica mediante una categoría principal y un tipo compatible, ambos controlados. La búsqueda normaliza mayúsculas y acentos y combina texto, categoría, tipo, zona y fechas de hallazgo inclusivas.

| Colección remota | Contenido | Lectura prevista |
|---|---|---|
| `publicItems` | Campos publicables de objeto y metadatos derivados `buildingId` y `searchTerms`; nunca custodia, evidencia ni historial | Visitantes, sin cuenta |
| `privateItems` | Registro completo, recepción, custodia, detalles reservados, historial, responsables, entrega, destino y campos derivados para búsquedas/métricas | Personal autorizado; Registro consulta solo los creados por su UID |
| `access` | Correo, rol, estado activo y metadatos de actualización | Identidad institucional para su propio acceso; administración para gestionar la lista |

`projectPublicItems` construye los nueve campos visibles del catálogo. La proyección remota añade únicamente `buildingId` y `searchTerms`, derivados de esos campos públicos; `publicSearchTerms` interno no se copia como campo adicional. Solo incluye objetos disponibles, recibidos, con fechas coherentes y custodia indicada, sin entrega ni destino final. No utiliza una copia del registro interno con campos ocultos. Aun así, el operador debe redactar la descripción pública sin incluir características reservadas, números de documentos o información personal.

La demo guarda el registro completo en el navegador, aunque muestre esa proyección pública. No ofrece confidencialidad ni autorización real frente a quien pueda inspeccionar el almacenamiento; debe contener únicamente ejemplos ficticios.

## Operaciones y consistencia

El recorrido habitual es `borrador → disponible → entregado → archivado`. Crear un hallazgo siempre produce un borrador. Confirmar recepción exige fecha y ubicación de custodia, incluso antes de publicar. Publicar exige esa recepción confirmada. Entregar cambia la ficha pública a Entregado y conserva internamente prueba de propiedad, identificación verificada y constancia privada de fotografías. Las entregas históricas mantienen sus referencias externas. Un archivo posterior conserva la consulta pública de esa entrega. Archivar una entrega solo cambia su estado y añade un evento; no permite alterar sus datos ni su entrega anterior.

Cada operación conserva los eventos anteriores. Un destino final registrado es inmutable desde la app. No se eliminan registros desde la interfaz: se archivan. Las escrituras de la aplicación procesan un objeto por operación.

En Firebase, `writeItem` usa una **transacción** para guardar conjuntamente el registro privado y su proyección pública, o retirar esta última cuando corresponda. Esta escritura conjunta evita una publicación parcial. La transacción lee el registro existente, excluye el sello técnico `updatedAt` y lo compara con la versión que abrió el operador. Si otra persona lo cambió, devuelve un aviso para reabrir el formulario en lugar de sobrescribirlo. Firestore también valida la relación entre ambos documentos mediante sus reglas.

Un commit puede persistir y perder su respuesta de red. Antes de declarar conflicto, `writeItem` decodifica el registro actual y comprueba si coincide con la propuesta completa de esa operación: contenido, UUID de historial, actor, UID y código. Solo normaliza `completedAt` autoritativo cuando la operación añade un destino nuevo. Si coincide, retorna éxito sin escrituras adicionales; si difiere, mantiene la detección de conflicto. Dos pruebas de `tests/committed-record.test.ts` y revisión independiente aprobaron el parche, republicado en ambos Hosting. Una nueva donación E2E por UI completó sin error y añadió exactamente un evento con hora autoritativa; no se forzó otra pérdida de respuesta. Las reglas no cambiaron.

Los códigos locales usan un correlativo calculado sobre todos los objetos, aunque Registro solo vea los suyos. El modo remoto utiliza el año y el UUID completo del registro para evitar depender de un contador local entre operadores.

La demo guarda en `localStorage` y no aplica la transacción remota ni sincronización entre pestañas. Evitar editar el mismo objeto simultáneamente desde varias pestañas; no utilizarla como sistema compartido.

Los objetos y permisos persisten al recargar, pero la identidad simulada seleccionada se conserva únicamente durante esa carga de la aplicación. Después de una recarga, volver a elegir el perfil desde Acceso personal.

## Roles e identidad

| Perfil | Alcance |
|---|---|
| Visitante o cuenta sin autorización activa | Catálogo público |
| Registro | Nuevos borradores y consulta de los propios; edición únicamente de sus borradores sin recepción |
| Decanato | Registro, recepción, custodia, edición de registros abiertos, publicación, entrega, archivo y destino autorizado |
| Administrador | Operaciones del decanato y gestión de accesos |
| Developer | Operaciones de administración; reservado exclusivamente a `rsegura20250554@ucsd.edu.do` |

En el piloto se exige proveedor actual del token Google o contraseña, correo verificado, dominio institucional exacto y documento activo de autorización. El dominio por sí solo no concede permisos. Habilitar Email/Password no crea una cuenta institucional ni convierte su contraseña Google en una contraseña de Firebase. La UI no ofrece signup; Roles no crea usuarios Auth. No se realizó vínculo de proveedor ni reset automático. Un cambio de identidad limpia el estado interno y restablece las suscripciones pertinentes.

Developer no está entre los roles asignables. La app rechaza crear, editar, degradar o desactivar el acceso reservado, también cuando actúa el propio Developer. No equivale a IAM ni administración de Google Cloud. Su alta real ya se realizó mediante autorización explícita después de comprobar UID y Google real; Roles cargó protegido. No hay bootstrap automático. La incorporación automática del perfil reservado pertenece exclusivamente a la simulación local.

La excepción QA pertenece solo a `ucsd-objetos-perdidos-pruebas`, en modo Firebase y con ese project ID exacto. Las reglas exigen también token audience de ese proyecto, proveedor contraseña y tres combinaciones fijas de UID/correo `.invalid` con roles admin/decanato/registro. No falsifica `email_verified` ni permite Developer a esos usuarios. La lista de accesos sigue exigiendo estado activo y rol fijo. Nunca desplegar esas reglas al piloto.

Google por redirect se permite solo con `authDomain === window.location.host`. El piloto firebaseapp.com cumple la condición; web.app ofrece popup o enlace hacia firebaseapp.com del mismo piloto. La sesión se conserva por origen. El enlace Google del build QA apunta explícitamente al piloto: no prueba Google sobre QA. Consultar [acceso y pruebas](acceso-y-pruebas.md).

## Entregas, evidencia y destinos

Una nueva entrega requiere receptor, comprobación de propiedad, tipo de identificación presentada y una a tres fotografías. La app convierte y limpia las imágenes antes de enviarlas al servicio Apps Script; Drive institucional las guarda en una carpeta privada. Solo se conserva el tipo de documento presentado, sin fotografiarlo. Las imágenes y sus identificadores no forman parte del catálogo público.

Gestión muestra Ver fotos en el historial. Registro mantiene Consultar entregas en un diálogo de la misma pantalla, con constancias de 25 en 25 sin datos de custodia ni características reservadas. Los visores y vistas previas usan estado temporal y se desmontan al cerrar o cambiar la sesión.

Las entregas antiguas pueden carecer de los dos campos nuevos; se conservan como registros históricos sin inventar identificación ni fotografía. Consultar el [protocolo](protocolo-propuesto.md) para las responsabilidades y el [análisis de alojamiento y evidencia](alojamiento-y-evidencia.md) para costes y alternativas.

El seguimiento de 90 días parte de la fecha de recepción y comienza al inicio del día 90 en Santo Domingo (UTC−4). No archiva, dona ni remite automáticamente. Tras revisión y traslado autorizado, el personal registra `disposition`: donación a organización sin fines de lucro o remisión de documentos a su emisor. El objeto queda archivado, conserva historial y sale del catálogo. Dinero requiere un protocolo separado y no admite esos destinos. Esta propuesta no constituye una política aprobada de UCSD ni declara pérdida de derechos.

En una nueva escritura remota, `disposition.completedAt` utiliza `serverTimestamp()`. Las reglas exigen que coincida con `request.time` y sea posterior o igual al inicio del día 90 calculado desde `receivedDate` en UTC−4; la hora del navegador no puede adelantar el plazo. El codec convierte el timestamp a ISO para el dominio y conserva lectura de valores ISO anteriores. La demo mantiene fechas ISO locales. El destino final sigue siendo inmutable. Reglas y Hosting con este codec están publicados en ambos proyectos. El SDK QA aprobó donación/remisión con timestamp nativo y lectura del codec; rechazó fecha ISO escrita por cliente y reescritura de destino.

## Límites

Los límites de texto del dominio coinciden con los máximos pertinentes de la fuente de reglas. Algunos campos de la interfaz pueden ser más restrictivos.

| Campo | Máximo de caracteres |
|---|---:|
| Nombre del objeto | 160 |
| Descripción pública | 2000 |
| Lugar del hallazgo y ubicación de custodia | 300 cada uno |
| Características reservadas | 4000 |
| Receptor de entrega o destino | 300 |
| Prueba de propiedad o constancia de destino | 2000 |
| Referencia fotográfica externa | 300 |

La nueva capa remota pide **25 candidatos por consulta**, ordenados por `foundDate DESC` e ID como desempate; el filtro de revisión a 90 días usa `receivedDate DESC` e ID. El cursor conserva la posición de Firestore. El catálogo y el panel ofrecen Anterior/Siguiente y conservan páginas visitadas; al cambiar filtros o después de una escritura vuelven a la primera. La consulta exacta por código usa `where('code','==',...)`; el texto se normaliza sin acentos, consulta la primera palabra mediante `array-contains` y recorre candidatos hasta reunir 25 coincidencias de todas las palabras o agotar el resultado. Las fechas del hallazgo se filtran en Firestore y no solo en la página visible. La demo local sigue filtrando el conjunto guardado en el navegador.

Las métricas remotas no se derivan de páginas: `getCountFromServer` cuenta estados, donaciones, remisiones, revisión de 90 días y eventos por mes del año elegido. `deliveryDate` y `dispositionDate` son fechas calendario de Santo Domingo derivadas de sellos de tiempo; `buildingId`, `searchTerms` y `publicSearchTerms` también son derivados. El reporte anterior a un backfill puede omitir registros antiguos en filtros por estos campos. Las agregaciones no tienen límite de 25 o 500 porque falsearían el total; reglas e índices específicos requieren pruebas remotas. Cada carga del reporte emite múltiples consultas y consume lecturas de entradas de índice dentro de la cuota Spark.

Los 51 índices compuestos cubren las consultas implementadas y permanecen debajo del límite Spark de 200. En QA, las 136 combinaciones de consulta ensayadas pasaron sin índices faltantes. Se comprobó la primera página de 25 y la igualdad de las métricas con una referencia completa de 69 registros privados; las pruebas posteriores pueden aumentar esa cifra. La fuente de reglas limita el historial a 1000 eventos por objeto; requiere un diseño posterior antes de superar ese tamaño. Las cuotas del plan Spark siguen siendo límites adicionales del servicio. [Índices y unión de filtros de igualdad](https://firebase.google.com/docs/firestore/query-data/index-overview#use_index_merging), [agregaciones](https://firebase.google.com/docs/firestore/query-data/aggregation-queries).

## Configuración y recuperación

El modo predeterminado es la demo, cuya compilación genera `dist/`. `dev:firebase` utiliza `.env.firebase.local`; `build:firebase` genera `dist-firebase/` y usa `firebase.json`. `build:pruebas` utiliza `.env.pruebas.local`, genera `dist-pruebas/` y corresponde a `firebase.pruebas.json`. Los archivos de entorno locales están excluidos de Git. Recrear configuración desde `.env.example`, siguiendo [Firebase setup](firebase-setup.md). Las contraseñas QA permanecen únicamente en TEMP fuera del repositorio. Nunca añadir credenciales privadas ni claves de servicio al frontend o a Git. Si falta configuración o falla Firebase, no se sustituyen datos remotos por ejemplos locales.

La migración de campos derivados usa `scripts/backfill-search-index.mjs`: sin argumentos simula sobre ejemplos locales; `--inspect --project=...` lee el proyecto explícito usando OAuth administrativo; `--apply` comprueba proyecto, identidad, rol y facturación. Antes de escribir guarda un respaldo local excluido de Git y usa versiones de documento para evitar sobrescrituras concurrentes. En QA se aplicó a 60 registros ficticios tras guardar 88 documentos; en el piloto se aplicó a los 50 IDs ficticios esperados con respaldo de 80 documentos. No se alteraron estados, entregas ni historial. Ninguna compilación o commit ejecuta ese proceso.

Para conservar o investigar datos de la demo:

1. Identificar la dirección exacta utilizada: host y puerto determinan el almacenamiento. Desarrollo, vista previa y distintos perfiles de navegador pueden tener datos separados.
2. Preservar una copia de los valores de `ucsd-lost-found-demo-v1` y `ucsd-lost-found-demo-access-v1` antes de editar o migrar datos desde las herramientas del navegador. La app no incluye exportación automática ni respaldo remoto.
3. Ante un aviso de formato inválido, investigar sobre una copia. La aplicación conserva el contenido y bloquea escrituras; no utilizar «Restablecer objetos demo» como reparación automática.
4. Para una migración local revisada, mantener IDs, códigos e historial y validar el resultado con `parseItems`. Las clasificaciones antiguas se adaptan en memoria; la carga añade solo los ejemplos universitarios que faltan por ID. Las evidencias históricas no se rellenan con valores ficticios.
5. Recordar que restablecer sustituye los objetos y conserva los permisos; no repara una lista de accesos inválida. No transferir almacenamiento local al backend sin un procedimiento explícito y verificado.

Para Firebase, distinguir fuente, reglas realmente publicadas y proyecto de destino. Conservar referencia anterior antes de publicar y comprobar compilación, autorización y consistencia. QA tiene publicadas reglas e índices nuevos; el piloto conserva la publicación anterior. No asumir que el contenido actual de `firebase/firestore.rules` o `firebase/firestore.indexes.json` esté activo en el piloto. No trasladar la excepción QA al piloto. El commit local no publica reglas, índices ni Hosting.

La evaluación de publicación/entrega alcanzaba el límite de 1000 expresiones de reglas, no fallaba la recepción. Se redujeron evaluaciones repetidas del rol e historial, se utilizó validación nativa de calendario y comparación mediante proyección pública, y se eliminaron comprobaciones `hasAll` redundantes donde la lectura directa ya exige los campos obligatorios. Se conservaron autorización, campos requeridos, coherencia público/privado e historial. El circuito SDK QA y sus denegaciones aprobaron con estas reglas. [Límites oficiales de reglas](https://firebase.google.com/docs/rules/rules-behavior).

## Verificación antes del piloto

Ejecutar `npm ci`, `npm run test`, `npm run lint`, `npm run build`, `npm run build:firebase` y `npm run build:pruebas`; las compilaciones incluyen tipos. Una revisión anterior aprobó 57 pruebas de Node, tipos, lint y las tres compilaciones; otra verificó después estados ficticios en el piloto. Esos resultados no cubren todavía la nueva paginación y agregaciones. Las pruebas locales verifican lógica y permisos simulados; el SDK QA anterior verificó operaciones reales de su proyecto separado. La evidencia y los casos exactos se mantienen en [Verificación](verificacion.md).

El piloto tiene Hosting y reglas finales publicados, login Google con UID real y acceso reservado activo comprobado. QA aprobó creación propia, recepción, publicación, lectura pública sin información privada, entrega identificada, retirada y archivo con historial, además de revocación con sesión abierta, restauración y las denegaciones documentadas. Donación y remisión remotas también aprobaron; los 14 cuadernos y la mochila de diagnóstico quedaron archivados. El catálogo QA mostró 28 públicos al cierre. Antes de introducir datos reales, faltan la evaluación de acceso institucional con contraseña y los acuerdos UCSD sobre responsables, protocolo y custodia externa. El circuito QA no demuestra automáticamente ese recorrido con la identidad institucional del piloto ni casos no enumerados.

## Consulta pública de entregas históricas

`projectPublicItems` genera una proyección explícita para disponibles y registros con entrega en estado entregado o archivado. La entrega archivada se publica como Entregado, sin su estado interno de archivo. Las donaciones válidas de objetos recibidos, archivados y con plazo de 90 días cumplido se publican como Donado. El estado individual se muestra únicamente en el detalle del objeto. Remisiones y archivos comunes siguen fuera del catálogo; destinatario, acta y fecha interna de donación no se copian a la ficha pública. Las reglas exigen correspondencia con el registro interno y campos públicos permitidos. Las consultas recorren el catálogo completo por páginas; el conteo de portada filtra `status == disponible`.

`scripts/backfill-public-deliveries.mjs` prepara únicamente fichas públicas faltantes o desactualizadas; no modifica estados, entregas, historial ni evidencias privadas. Consultar sus condiciones y límites en [configuración Firebase](firebase-setup.md#recuperar-fichas-públicas-de-entregas-históricas).
