# Firebase: piloto institucional y proyecto de pruebas

Estado actual: el piloto `ucsd-objetos-perdidos` está publicado y conectado. Se comprobó ingreso Google real de `rsegura20250554@ucsd.edu.do` en [firebaseapp.com](https://ucsd-objetos-perdidos.firebaseapp.com), UID en Authentication y permiso Developer explícito activo. Roles carga de forma protegida. El catálogo institucional contiene 50 objetos ficticios UCSD-DEMO cargados con autorización el 29/09/2026. No se incorporaron hallazgos reales; ver [carga del piloto](carga-piloto.md).

El piloto conserva Spark sin facturación, aplicación web registrada, Firestore Standard `(default)` en `nam5` y Authentication con Google y Email/Password habilitados. QA publicó reglas, índices y Hosting de la nueva capacidad y migró datos ficticios. El piloto recibió el backfill de sus 50 ejemplos con respaldo de 80 documentos. Se verificó `billingEnabled: false` antes de aplicarlo. Los intentos previos con popup cerrado o retorno anónimo quedan como antecedentes; no describen el acceso actual.

## Entornos y configuración

| Entorno | Configuración y compilación | Reglas y destino |
|---|---|---|
| Demo local | Sin configuración remota; `npm run build` → `dist` | localStorage; identidades simuladas |
| Piloto institucional | `.env.firebase.local`; `npm run build:firebase` → `dist-firebase` | `firebase.json`, `firebase/firestore.rules`, `firebase/firestore.indexes.json`; proyecto `ucsd-objetos-perdidos` |
| QA aislado | `.env.pruebas.local`; `npm run build:pruebas` → `dist-pruebas` | `firebase.pruebas.json`, `firebase/firestore.pruebas.rules`, el mismo archivo de índices; proyecto `ucsd-objetos-perdidos-pruebas` |

Los archivos locales de entorno y directorios compilados están excluidos de Git. Recrear cada configuración desde `.env.example` con `VITE_DATA_MODE=firebase` y los cuatro valores públicos del SDK del proyecto correspondiente. El modo QA solo se habilita si el project ID coincide exactamente con `ucsd-objetos-perdidos-pruebas`. No usar `.env.local` para esta separación: alteraría también el modo predeterminado. No sobrescribir configuración existente sin preservarla.

La configuración web del SDK es pública; no debe contener claves privadas, cuentas de servicio ni contraseñas. La protección depende de identidad, reglas y autorización, no de ocultar esos valores. [Configuración oficial](https://firebase.google.com/docs/projects/learn-more#config-files-objects).

```powershell
npm ci
npm run dev
npm run dev:firebase
npm run build
npm run build:firebase
npm run build:pruebas
```

`dev` sirve la demo local, habitualmente en 5173. `dev:firebase` sirve el piloto en 5174. `preview` revisa `dist`, habitualmente en 4173. Compilar no publica. Antes de un despliegue autorizado, comprobar configuración, project ID, carpeta y archivo de reglas: nunca desplegar reglas ni compilación QA al piloto. No hay migración automática entre entornos.

## Acceso institucional

El panel ofrece Google y correo/contraseña. Email/Password es un usuario de **Firebase Authentication**, no la contraseña institucional de Google. Habilitar el proveedor no crea cuentas ni vincula proveedores existentes. No se creó una cuenta institucional con contraseña ni se solicitó reset o vínculo automático. La app no ofrece alta de usuarios; Roles asigna permisos y no crea usuarios Auth ni contraseñas. [Proveedor contraseña](https://firebase.google.com/docs/auth/web/password-auth).

El piloto autoriza gestión solo con:

- Proveedor usado para el token actual `google.com` o `password`.
- Correo realmente verificado y dominio exacto `ucsd.edu.do`.
- Documento explícito activo en `access`, con un rol permitido.

No se falsea `email_verified` y el correo institucional no basta por sí solo. Una cuenta contraseña sin verificar puede autenticarse, pero no obtiene gestión; la interfaz permite solicitar verificación y refrescar la identidad. No se enviaron verificaciones institucionales automáticamente.

Google por redirección se ofrece únicamente cuando `authDomain` coincide con `window.location.host`. La dirección [firebaseapp.com](https://ucsd-objetos-perdidos.firebaseapp.com) cumple esa condición y es la recomendada. Desde [web.app](https://ucsd-objetos-perdidos.web.app) se usa popup o el enlace explícito hacia firebaseapp.com del mismo piloto. La sesión es por origen: cambiar de dominio puede requerir ingresar de nuevo. [Recomendaciones oficiales de redirección](https://firebase.google.com/docs/auth/web/redirect-best-practices), [proveedor Google](https://firebase.google.com/docs/auth/web/google-signin).

## Roles y acceso reservado

| Rol | Alcance |
|---|---|
| Sin autorización activa | Consulta pública, sin gestión |
| `registro` | Crea hallazgos, consulta los propios y edita sus borradores sin recepción |
| `decanato` | Registra, recibe, publica, entrega, archiva y documenta destinos autorizados |
| `admin` | Operaciones del decanato y gestión de permisos asignables |
| `developer` | Operaciones superiores, exclusivo de la cuenta reservada con autorización explícita |

Developer real ya está preparado y comprobado. No repetir su alta. No hay bootstrap automático ni excepción que autorice por conocer el correo. El gestor no permite asignar Developer ni editar, degradar o desactivar su documento reservado, tampoco al propio Developer. Este rol no concede permisos IAM. El gestor permite editar roles, activar/desactivar y eliminar el documento de autorización de otros perfiles; eliminarlo no borra su identidad de Google/Firebase Authentication. El perfil actual y Developer están protegidos. Las reglas de Firestore aplican las mismas restricciones.

Para recuperar acceso reservado en el futuro, el propietario del proyecto deberá verificar la identidad y UID reales en Authentication antes de modificar su documento desde consola administrativa. Preservar el documento existente y requerir autorización para el cambio; no inventar UID ni abrir reglas. Los SDK administrativos y consola requieren control IAM propio. [Alcance de reglas](https://firebase.google.com/docs/firestore/security/rules-conditions).

## Datos y operaciones

- `publicItems`: proyección explícita publicable, sin custodia, entrega, evidencia externa ni historial.
- `privateItems`: registro completo. Registro lee únicamente sus propios documentos; custodios y administradores autorizados consultan mediante páginas filtradas.
- `access`: permisos explícitos. Cada identidad autorizable lee su propio documento; la administración consulta y gestiona la lista bajo restricciones.

Publicación, entrega y archivo actualizan datos privados y proyección pública en una transacción. Se conserva historial previo y responsable; no se eliminan registros. Las entregas nuevas exigen receptor, prueba, tipo de identificación y referencia externa de fotografía. No se carga ni almacena la imagen. Los destinos permanecen en `disposition` y terminan en archivado; no existe un quinto estado.

Una nueva escritura de destino remoto usa `serverTimestamp()` para `disposition.completedAt`. Las reglas exigen igualdad con `request.time` y cumplimiento de los 90 días desde recepción al inicio del día en Santo Domingo. La UI convierte el timestamp a ISO, conserva lectura de registros anteriores y mantiene inmutable el destino final. Reglas y Hosting con ese codec están publicados en ambos proyectos; QA aprobó lectura del codec y rechazó una fecha ISO escrita por el cliente y la reescritura del destino.

El seguimiento de 90 días desde recepción en Santo Domingo sigue siendo una **propuesta pendiente de aprobación UCSD**. No dona, remite ni extingue derechos automáticamente. Dinero no admite esos destinos. Consultar [protocolo](protocolo-propuesto.md) y [arquitectura](arquitectura.md).

La interfaz solicita páginas de **25** documentos ordenadas con cursor; combina filtros en Firestore. La búsqueda exacta usa `code`; la de texto normaliza acentos y mayúsculas, consulta el primer término indexado y revisa los restantes a medida que recorre candidatos. El reporte anual y los conteos de estados/destinos/revisión90 usan `getCountFromServer`, sin calcular totales a partir de páginas. El reporte hace **55 agregaciones por carga de año** (4 estados, 48 conteos mensuales y 3 totales); las lecturas de índices se descuentan de la cuota Spark. Se prepararon **51 índices compuestos**, bajo el límite de 200 índices del plan sin facturación. QA aprobó 136 combinaciones de consultas y comparó el reporte completo con los 69 registros privados de ese momento, con resultado exacto; las pruebas posteriores agregaron más ejemplos. [Índices Firestore](https://firebase.google.com/docs/firestore/query-data/index-overview), [agregaciones](https://firebase.google.com/docs/firestore/query-data/aggregation-queries).

Las reglas permiten consultas `list` sin `limit` para soportar agregaciones. No distinguen de forma segura un `count()` de una lectura normal solo por ausencia de `limit`; un cliente distinto de la app podría solicitar muchas lecturas de los datos que ya puede consultar. La app pide 25 por página, pero eso no constituye un control global de consumo. Vigilar cuotas; si el uso crece, evaluar agregados mantenidos por backend bajo el gobierno de UCSD.

## Preparar índices y campos derivados

La nueva versión usa `buildingId` y `searchTerms` en la proyección pública; el registro privado añade `buildingId`, `searchTerms`, `publicSearchTerms`, `deliveryDate` y `dispositionDate`. Las dos últimas son fechas de Santo Domingo derivadas de entregas/destinos, no nuevos eventos. Los documentos existentes no reciben estos campos por compilar React. Hasta completarlos, los filtros y reportes de la nueva versión pueden omitir objetos anteriores o devolver índices faltantes.

`scripts/backfill-search-index.mjs` se ejecuta **sin conexión ni escrituras por defecto**:

```powershell
node scripts/backfill-search-index.mjs
```

Para inspección de un proyecto se exige `--inspect --project=ucsd-objetos-perdidos-pruebas` o el ID institucional, más un token OAuth administrativo en `UCSD_IMPORT_ACCESS_TOKEN`; `--inspect` solo lee. `--apply` escribe y comprueba UID, proyecto, rol y facturación deshabilitada. El piloto limita el alcance a los 50 IDs ficticios esperados; QA exige marcas de datos sintéticos. Antes de escribir, el script guarda una copia de documentos completos en `evidence/`, excluida de Git, y usa `updateTime` para rechazar sobrescrituras concurrentes. La aplicación del 29/09 creó los respaldos `search-index-backup-ucsd-objetos-perdidos-pruebas-1790704161953.json` y `search-index-backup-ucsd-objetos-perdidos-1790706970836.json`. Preservarlos para recuperación.

Estado de QA: 60 registros ficticios migrados con respaldo de 88 documentos, reglas e índices nuevos publicados y listos. `scripts/verify-capacity-qa.mjs` aprobó lecturas de solo lectura: conteo exacto de 28 públicos y 60 privados, primera página de 25, filtro combinado de categoría/edificio/fecha, búsqueda por término y algunos contadores de entregas/donaciones. Faltan otros filtros y combinaciones, las 12 filas del reporte, revisión de reglas sin límite, prueba visual de la nueva interfaz y lectura de consumo Spark. Antes del piloto, revisar QA restante y riesgo de reglas, validar cuotas y proyecto, inspeccionar/respaldar sus 50 objetos ficticios, autorizar/aplicar su backfill, esperar índices, probar el flujo y recién entonces decidir publicación de reglas/Hosting. Ninguno de esos cambios nuevos se ejecutó en el piloto.

## Pruebas separadas y evidencia

QA está publicado en [ucsd-objetos-perdidos-pruebas.web.app](https://ucsd-objetos-perdidos-pruebas.web.app), Spark con `billingEnabled: false`. Su carga inicial contiene 37 objetos ficticios y 30 públicos. Hay tres usuarios Auth de contraseña `.invalid`, con roles y UID fijos; las credenciales están exclusivamente en un archivo TEMP fuera de Git. No copiarlas a documentos, logs, frontend ni commits.

La excepción QA requiere proyecto/token audience exacto, proveedor contraseña, correo y UID de una de esas tres identidades y acceso activo con su rol fijo. No declara correo institucional verificado ni permite Developer a esas identidades. El frontend solo admite la excepción en el build de QA; sus reglas nunca deben publicarse al piloto. El botón Google de QA lleva explícitamente al piloto para probar una identidad institucional; no prueba Google en QA.

El [circuito SDK real QA](../scripts/verify-firebase-qa.mjs) final está aprobado con ID `2979320c-f8b3-49e2-8605-aa73ab5f93f8`: creación y consulta propias, recepción/publicación por Decanato, lectura pública sin custodia, entrega válida, retirada y archivo con historial, junto con denegaciones por rol y entrega incompleta. Se comprobaron revocación de Registro con sesión abierta y restauración, borrado público aislado denegado, lote de entrega/borrado por Registro denegado, lote de Decanato inactivo denegado y borrado público anónimo denegado. Administrador consultó los tres roles fijos y no pudo cambiarlos ni conceder Developer.

Donación del ejemplo 0033 y remisión del 0034 aprobaron y retiraron sus publicaciones. El script final también creó dos objetos antiguos ficticios, publicó y registró sus destinos con hora del servidor. Se archivaron los 14 cuadernos y la mochila de diagnóstico; el catálogo QA mostró 28 públicos en navegador. Se comprobaron login, vistas y logout de los tres roles. La revisión de código aprobó 53 pruebas, tipos, lint y las tres compilaciones. Consultar [acceso y pruebas](acceso-y-pruebas.md) y [verificación fechada](verificacion.md) para casos y límites.

El bloqueo anterior alcanzaba el límite de 1000 expresiones de reglas durante publicación/entrega, no recepción. La optimización reutiliza comprobaciones de rol e historial, valida calendario nativamente y compara la proyección pública; conserva los campos obligatorios y controles. La validación QA no despliega las reglas institucionales ni prueba acceso institucional por contraseña. [Límites de reglas](https://firebase.google.com/docs/rules/rules-behavior).

La comprobación institucional de solo lectura es:

```powershell
node --env-file=.env.firebase.local scripts/verify-firebase-public.mjs
```

Las cinco comprobaciones documentadas permiten catálogo limitado y deniegan lectura privada, permisos anónimos y consultas excesivas. No sustituyen pruebas de escritura, revocación ni entrega. No ejecutar cambios del piloto como ensayo QA.

Las cinco lecturas anónimas institucionales de aquella versión se repitieron y aprobaron **antes de cargar objetos ficticios al piloto**: por eso el resultado histórico fue cero públicos. En esa comprobación ambos proyectos tenían facturación deshabilitada. Un fallo de respuesta de commit en la UI dejó una donación QA persistida; se corrigió el reconocimiento idempotente de la misma propuesta completa. El parche aprobó entonces 53 pruebas, tipos, lint, tres builds y revisión independiente, y se republicó en ambos Hosting. Una nueva donación UI completó sin error, mostró Donado e historial con exactamente un evento nuevo y fecha del servidor. No se forzó otra pérdida de respuesta; ese reconocimiento se comprobó por lógica y revisión. La regla posterior de agregaciones activa en QA requiere una evaluación propia.

## Coste y continuidad

Ambos proyectos permanecen Spark sin facturación vinculada. El objetivo es US$0 bajo las cuotas; alcanzarlas puede interrumpir servicio. No usar App Hosting, Cloud Functions, SMS ni Cloud Storage como parte de esta implementación. La evidencia fotográfica sigue bajo custodia externa manual. [Planes Firebase](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [cuotas Firestore](https://firebase.google.com/docs/firestore/quotas), [alojamiento y evidencia](alojamiento-y-evidencia.md).

Antes de operar con objetos reales, evaluar contraseña institucional y verificación real de correo, verificar los casos adicionales necesarios y acordar con UCSD responsables, contacto, protocolo y custodia externa. El circuito QA no demuestra por sí mismo operaciones con Google institucional en el piloto. No modificar datos del piloto ni permisos superiores como efecto secundario de mantener QA.

## Recuperar fichas públicas de entregas históricas

El cambio de catálogo conserva como Entregado la ficha de un objeto con entrega, aunque internamente se haya archivado. Para las entregas anteriores que ya no tienen ficha pública, utilizar `scripts/backfill-public-deliveries.mjs`. No altera objetos privados, estados, entregas, métricas históricas ni fotografías. Construye las fichas con `projectPublicItems` y `buildPublicIndex`, sin copiar campos privados.

La ejecución requiere OAuth administrativo local en `UCSD_IMPORT_ACCESS_TOKEN` y un proyecto explícito. El token se mantiene en el entorno: no guardarlo en Git, archivos o historial de comandos. Sin `--apply`, lee y muestra el número de cambios previstos, sin escribir documentos ni crear un respaldo:

```powershell
node scripts/backfill-public-deliveries.mjs --project=ucsd-objetos-perdidos-pruebas
```

Tras revisar el resultado, la aplicación se solicita explícitamente:

```powershell
node scripts/backfill-public-deliveries.mjs --project=ucsd-objetos-perdidos-pruebas --apply
```

Para el piloto cambiar únicamente el proyecto a `ucsd-objetos-perdidos`, después de validar QA. No se ejecuta automáticamente al compilar o desplegar. Antes de escribir, verifica `billingEnabled: false` y guarda un respaldo local exclusivo en `evidence/public-deliveries-backup-<proyecto>-<timestamp>.json`, excluido de Git. Ese respaldo contiene datos internos pertinentes y debe custodiarse.

El script rechaza registros sin marca ficticia, inspecciona hasta 10.000 objetos y admite hasta 200 fichas por aplicación. Su transacción vuelve a leer los registros y sus fichas, compara versiones y usa precondiciones para no sobrescribir cambios concurrentes. Si encuentra un conflicto, repetir la simulación. Es idempotente: una ficha ya idéntica no se vuelve a escribir; después de aplicarlo, una nueva simulación debe indicar cero cambios. No habilita facturación, no migra fotos ni elimina publicaciones existentes.

Publicar primero el servicio y las reglas compatibles con la proyección de Entregado, aplicar la preparación en QA y comprobar lectura anónima sin campos privados, historial y visor. La preparación de producción con datos reales requiere revisión distinta: este script está acotado a ejemplos ficticios.
