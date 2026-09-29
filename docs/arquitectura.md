# Arquitectura y mantenimiento

Esta aplicación centraliza el catálogo de hallazgos y el registro interno de custodia. Tiene dos modos independientes: demo local con objetos ficticios e identidades simuladas, e integración preparada con Firebase Authentication y Firestore. No hay transferencia automática entre modos. La integración actual aún requiere completar el ingreso Google, el acceso inicial y las pruebas autenticadas; las reglas nuevas de Developer y evidencia no están publicadas.

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
| `src/data/firebase.ts`, `cloud.ts` y `mode.ts` | Configuración del SDK, identidad Google, consultas y escrituras remotas |
| `firebase/firestore.rules` | Fuente de las reglas de autorización y consistencia remota |
| `tests/` | Pruebas del dominio, autorización, persistencia y regresiones |
| `scripts/verify-firebase-public.mjs` | Comprobación anónima de solo lectura contra Firebase |

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

En Firebase se exige proveedor Google, identidad verificada, dominio institucional exacto y un documento activo de autorización. El dominio por sí solo no concede permisos. Un cambio de identidad limpia el estado interno cargado y restablece las suscripciones pertinentes.

Developer no está entre los roles asignables. La app rechaza crear, editar, degradar o desactivar el acceso reservado, también cuando actúa el propio Developer. No equivale a permisos IAM ni a administración de Google Cloud. Su alta real requiere preparación fuera del gestor de roles y posterior verificación; no existe bootstrap automático. La incorporación automática del perfil reservado pertenece exclusivamente a la simulación local.

## Entregas, evidencia y destinos

Una nueva entrega requiere receptor, comprobación de propiedad, tipo de identificación presentada y referencia de la fotografía custodiada externamente. El operador confirma la revisión presencial y la evidencia. No se pide el número del documento ni se toma, carga o almacena una fotografía en esta aplicación. La referencia es interna; debe identificar una evidencia con acceso restringido, no convertirla en un enlace público.

Las entregas antiguas pueden carecer de los dos campos nuevos; se conservan como registros históricos sin inventar identificación ni fotografía. Consultar el [protocolo](protocolo-propuesto.md) para las responsabilidades y el [análisis de alojamiento y evidencia](alojamiento-y-evidencia.md) para costes y alternativas.

El seguimiento de 90 días parte de la fecha de recepción y comienza al inicio del día 90 en Santo Domingo (UTC−4). No archiva, dona ni remite automáticamente. Tras revisión y traslado autorizado, el personal registra `disposition`: donación a organización sin fines de lucro o remisión de documentos a su emisor. El objeto queda archivado, conserva historial y sale del catálogo. Dinero requiere un protocolo separado y no admite esos destinos. Esta propuesta no constituye una política aprobada de UCSD ni declara pérdida de derechos.

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

El modo predeterminado es la demo. `npm run dev:firebase` utiliza `.env.firebase.local` y `npm run build:firebase` genera `dist-firebase/`; la compilación local genera `dist/`. Los archivos de entorno locales están excluidos de Git. Recrear la configuración en otra computadora desde `.env.example`, siguiendo [Firebase setup](firebase-setup.md). Nunca añadir credenciales privadas ni claves de servicio al frontend o al repositorio. Si Firebase falla o falta configuración, la app muestra el problema y no sustituye los datos remotos por ejemplos locales.

Para conservar o investigar datos de la demo:

1. Identificar la dirección exacta utilizada: host y puerto determinan el almacenamiento. Desarrollo, vista previa y distintos perfiles de navegador pueden tener datos separados.
2. Preservar una copia de los valores de `ucsd-lost-found-demo-v1` y `ucsd-lost-found-demo-access-v1` antes de editar o migrar datos desde las herramientas del navegador. La app no incluye exportación automática ni respaldo remoto.
3. Ante un aviso de formato inválido, investigar sobre una copia. La aplicación conserva el contenido y bloquea escrituras; no utilizar «Restablecer objetos demo» como reparación automática.
4. Para una migración local revisada, mantener IDs, códigos e historial y validar el resultado con `parseItems`. Las clasificaciones antiguas se adaptan en memoria; la carga añade solo los ejemplos universitarios que faltan por ID. Las evidencias históricas no se rellenan con valores ficticios.
5. Recordar que restablecer sustituye los objetos y conserva los permisos; no repara una lista de accesos inválida. No transferir almacenamiento local al backend sin un procedimiento explícito y verificado.

Para Firebase, mantener separadas la fuente del repositorio y las reglas realmente publicadas. Conservar referencia a la versión anterior antes de publicar, comprobar compilación, autorización y consistencia de operaciones, y utilizar el procedimiento de [Firebase setup](firebase-setup.md). El commit local no publica reglas ni Hosting.

## Verificación antes del piloto

Ejecutar `npm ci`, `npm run test`, `npm run lint`, `npm run build` y `npm run build:firebase`; ambas compilaciones incluyen tipos. La revisión actual aprobó 39 pruebas de Node, lint y las dos compilaciones. Las pruebas de la demo verifican lógica y permisos simulados; las comprobaciones anónimas remotas verifican solo el alcance documentado en [Verificación](verificacion.md).

Antes de introducir datos reales, faltan: ingreso Google con UID real, preparación del acceso reservado, compilación y publicación de las reglas actuales, pruebas autenticadas por rol y contra cambios no permitidos, contacto y responsables confirmados por UCSD, aprobación del protocolo y custodia externa de evidencia. Hosting permanece sin publicar; las pruebas locales no representan una liberación del servicio.
