# Arquitectura y mantenimiento

Esta aplicación centraliza el catálogo de hallazgos y el registro interno de custodia. Tiene una demo local y dos destinos Firebase independientes: piloto institucional y QA aislado. No hay transferencia automática entre entornos. Hosting y reglas finales de ambos están publicados; login Google institucional y circuito SDK autenticado de objetos QA están comprobados. El piloto mantiene catálogo vacío, sin hallazgos reales.

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
| `src/domain/identity.ts` y `test-accounts.ts` | Verificación del proveedor del token y excepción limitada al proyecto QA |
| `firebase/firestore.rules` y `firestore.pruebas.rules` | Reglas institucionales y variante exclusiva QA con identidades fijas |
| `tests/` | Pruebas del dominio, autorización, persistencia y regresiones |
| `scripts/verify-firebase-public.mjs` | Comprobación anónima de solo lectura contra Firebase |
| `scripts/verify-firebase-qa.mjs` | Circuito autenticado y denegaciones con las tres identidades fijas QA |

Las operaciones de dominio construyen un nuevo registro y su evento de historial. La capa de datos vuelve a comprobar la autorización antes de guardarlo. En Firebase las reglas son la barrera de seguridad; ocultar un botón o validar desde React solo mejora la interacción.

## Datos públicos e internos

Cada objeto tiene un identificador estable y un código de consulta. Se clasifica mediante una categoría principal y un tipo compatible, ambos controlados. La búsqueda normaliza mayúsculas y acentos y combina texto, categoría, tipo, zona y fechas de hallazgo inclusivas.

| Colección remota | Contenido | Lectura prevista |
|---|---|---|
| `publicItems` | `id`, `code`, `title`, `category`, `itemType`, `description`, `foundDate`, `foundLocation` y `status: disponible` | Visitantes, sin cuenta |
| `privateItems` | Registro completo, recepción, custodia, detalles reservados, historial, responsables, entrega y destino | Personal autorizado; Registro consulta solo los creados por su UID |
| `access` | Correo, rol, estado activo y metadatos de actualización | Identidad institucional para su propio acceso; administración para gestionar la lista |

`projectPublicItems` construye explícitamente los nueve campos públicos. Solo incluye objetos disponibles, recibidos, con fechas coherentes y custodia indicada, sin entrega ni destino final. No utiliza una copia del registro interno con campos ocultos. Aun así, el operador debe redactar la descripción pública sin incluir características reservadas, números de documentos o información personal.

La demo guarda el registro completo en el navegador, aunque muestre esa proyección pública. No ofrece confidencialidad ni autorización real frente a quien pueda inspeccionar el almacenamiento; debe contener únicamente ejemplos ficticios.

## Operaciones y consistencia

El recorrido habitual es `borrador → disponible → entregado → archivado`. Crear un hallazgo siempre produce un borrador. Confirmar recepción exige fecha y ubicación de custodia, incluso antes de publicar. Publicar exige esa recepción confirmada. Entregar retira el objeto del catálogo, conserva prueba de propiedad, identificación verificada y referencia de evidencia externa. Archivar una entrega solo cambia su estado y añade un evento; no permite alterar sus datos ni su entrega anterior.

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

Una nueva entrega requiere receptor, comprobación de propiedad, tipo de identificación presentada y referencia de la fotografía custodiada externamente. El operador confirma la revisión presencial y la evidencia. No se pide el número del documento ni se toma, carga o almacena una fotografía en esta aplicación. La referencia es interna; debe identificar una evidencia con acceso restringido, no convertirla en un enlace público.

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

Las consultas remotas limitan a 500 documentos cada suscripción; no hay paginación implementada. Alcanzar 500 activa un aviso porque podrían existir más registros. Los filtros se aplican sobre lo cargado y las métricas del panel son totales de esa carga, no de toda la base remota. La fuente de reglas limita el historial a 1000 eventos por objeto; requiere un diseño posterior antes de superar ese tamaño. Las cuotas del plan Spark siguen siendo límites adicionales del servicio.

## Configuración y recuperación

El modo predeterminado es la demo, cuya compilación genera `dist/`. `dev:firebase` utiliza `.env.firebase.local`; `build:firebase` genera `dist-firebase/` y usa `firebase.json`. `build:pruebas` utiliza `.env.pruebas.local`, genera `dist-pruebas/` y corresponde a `firebase.pruebas.json`. Los archivos de entorno locales están excluidos de Git. Recrear configuración desde `.env.example`, siguiendo [Firebase setup](firebase-setup.md). Las contraseñas QA permanecen únicamente en TEMP fuera del repositorio. Nunca añadir credenciales privadas ni claves de servicio al frontend o a Git. Si falta configuración o falla Firebase, no se sustituyen datos remotos por ejemplos locales.

Para conservar o investigar datos de la demo:

1. Identificar la dirección exacta utilizada: host y puerto determinan el almacenamiento. Desarrollo, vista previa y distintos perfiles de navegador pueden tener datos separados.
2. Preservar una copia de los valores de `ucsd-lost-found-demo-v1` y `ucsd-lost-found-demo-access-v1` antes de editar o migrar datos desde las herramientas del navegador. La app no incluye exportación automática ni respaldo remoto.
3. Ante un aviso de formato inválido, investigar sobre una copia. La aplicación conserva el contenido y bloquea escrituras; no utilizar «Restablecer objetos demo» como reparación automática.
4. Para una migración local revisada, mantener IDs, códigos e historial y validar el resultado con `parseItems`. Las clasificaciones antiguas se adaptan en memoria; la carga añade solo los ejemplos universitarios que faltan por ID. Las evidencias históricas no se rellenan con valores ficticios.
5. Recordar que restablecer sustituye los objetos y conserva los permisos; no repara una lista de accesos inválida. No transferir almacenamiento local al backend sin un procedimiento explícito y verificado.

Para Firebase, distinguir fuente, reglas realmente publicadas y proyecto de destino. Conservar referencia anterior antes de publicar y comprobar compilación, autorización y consistencia. Las reglas finales están publicadas en ambos proyectos y la lectura API de cada fuente activa coincide con su archivo. No trasladar la excepción QA al piloto. El commit local no publica reglas ni Hosting.

La evaluación de publicación/entrega alcanzaba el límite de 1000 expresiones de reglas, no fallaba la recepción. Se redujeron evaluaciones repetidas del rol e historial, se utilizó validación nativa de calendario y comparación mediante proyección pública, y se eliminaron comprobaciones `hasAll` redundantes donde la lectura directa ya exige los campos obligatorios. Se conservaron autorización, campos requeridos, coherencia público/privado e historial. El circuito SDK QA y sus denegaciones aprobaron con estas reglas. [Límites oficiales de reglas](https://firebase.google.com/docs/rules/rules-behavior).

## Verificación antes del piloto

Ejecutar `npm ci`, `npm run test`, `npm run lint`, `npm run build`, `npm run build:firebase` y `npm run build:pruebas`; las compilaciones incluyen tipos. La revisión vigente aprobó 53 pruebas de Node, incluidas tres del codec y dos de reconocimiento de commit, tipos, lint y las tres compilaciones. La revisión independiente aprobó los cinco casos codec/matcher. Las pruebas locales verifican lógica y permisos simulados; el SDK QA verifica operaciones reales de su proyecto separado. La evidencia y los casos exactos se mantienen en [Verificación](verificacion.md).

El piloto tiene Hosting y reglas finales publicados, login Google con UID real y acceso reservado activo comprobado. QA aprobó creación propia, recepción, publicación, lectura pública sin información privada, entrega identificada, retirada y archivo con historial, además de revocación con sesión abierta, restauración y las denegaciones documentadas. Donación y remisión remotas también aprobaron; los 14 cuadernos y la mochila de diagnóstico quedaron archivados. El catálogo QA mostró 28 públicos al cierre. Antes de introducir datos reales, faltan la evaluación de acceso institucional con contraseña y los acuerdos UCSD sobre responsables, protocolo y custodia externa. El circuito QA no demuestra automáticamente ese recorrido con la identidad institucional del piloto ni casos no enumerados.
