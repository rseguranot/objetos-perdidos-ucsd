# Activar acceso con Google y permisos en Firebase

El código incluye la integración preparada. El proyecto institucional `ucsd-objetos-perdidos` está creado en **Spark** y su aplicación web **UCSD Objetos Perdidos Web** está registrada. En Authentication se comprobó Google con estado **Habilitada**. También se observó `localhost` entre los dominios autorizados; no se modificó esa lista.

Firestore **Standard**, base `(default)`, está creado en producción, con ubicación **`nam5`** comprobada en consola. El selector no permitió escoger `us-east1` y la consola confirmó `nam5` al crear la base; no se cambió ni se recreó. Las reglas completas de `firebase/firestore.rules` se publicaron y compilaron en consola el **28 de septiembre de 2026, 11:35 p. m.**

Una prueba remota anónima aprobó cinco comprobaciones de solo lectura. El ingreso Google no produjo una sesión real: Authentication → Users permaneció vacío, sin UID ni administrador inicial. La gestión autenticada y el recorrido de extremo a extremo siguen pendientes. Hosting no está publicado y no se hizo push.

**Actualización del 29 de septiembre:** las reglas ampliadas con destino final y plazo propuesto de revisión a 90 días se publicaron y compilaron en consola a las **00:06**. La versión del 28 de septiembre, 23:35, se conserva como referencia para rollback. Las cinco comprobaciones anónimas se repitieron después de la publicación y aprobaron. Los destinos autenticados todavía no se han probado contra Firestore. No hubo cambios de facturación ni Hosting. El control de Chrome normal terminó por tiempo de espera al seleccionar la demo; no se repitió el ingreso Google y sigue pendiente obtener UID real.

La demo local conserva identidades simuladas y datos ficticios. Configurar Firebase selecciona datos compartidos; no se migran los registros ni los permisos locales automáticamente.

**Ampliación posterior del 29 de septiembre:** Developer exclusivo y evidencia de entrega están implementados y probados localmente. La fuente `firebase/firestore.rules` ahora incluye esos controles, pero esta nueva versión aún no se compiló ni publicó. La versión activa sigue siendo la de las 00:06 con destinos a 90 días. No usar el formulario ampliado contra Firestore hasta actualizar y verificar las reglas. No se creó el permiso Developer real.

## Servicios y coste

Usar Firebase Authentication con Google, Cloud Firestore Standard y, cuando se autorice publicar, Firebase Hosting clásico para los archivos de **`dist-firebase`**. `firebase.json` apunta a ese directorio para evitar publicar accidentalmente la compilación demo de `dist`. No se necesitan Cloud Functions, App Hosting, almacenamiento de fotografías, SMS ni servicios de pago. Spark permite comenzar sin información de pago. Mantener el proyecto en Spark y sin una cuenta de facturación vinculada conserva el objetivo de US$0; una persona con administración del proyecto podría cambiar esa condición. Al alcanzar cuotas se puede interrumpir el servicio. [Planes oficiales](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

Firestore tiene una base gratuita por proyecto: 1 GiB almacenado, 50,000 lecturas, 20,000 escrituras y 20,000 eliminaciones al día, y 10 GiB de transferencia saliente al mes. Las cuotas diarias se reinician alrededor de la medianoche del Pacífico. Las comprobaciones de roles mediante documentos también consumen lecturas; los listeners y las recargas deben considerarse. [Cuotas de Firestore](https://firebase.google.com/docs/firestore/quotas), [condiciones y lecturas de reglas](https://firebase.google.com/docs/firestore/security/rules-conditions).

Hosting proporciona HTTPS y subdominios gratuitos dentro de las cuotas Spark. La documentación de uso y la tabla de precios muestran distintos límites de transferencia; comprobar consola y condiciones vigentes antes del piloto. Al agotar cuotas puede deshabilitarse el sitio. Mantener pocas versiones publicadas reduce el almacenamiento. [Cuotas de Hosting](https://firebase.google.com/docs/hosting/usage-quotas-pricing), [investigación de alojamiento y fotografías](alojamiento-y-evidencia.md).

## Preparación manual del proyecto

1. Acordar con UCSD quién tendrá la propiedad y recuperación del proyecto. La cuenta inicial propuesta es `rsegura20250554@ucsd.edu.do`; esta dirección no obtiene permisos por aparecer en el código o en este documento.
2. Seleccionar `ucsd-objetos-perdidos`, ya creado, y mantener **Spark** sin cuenta de facturación vinculada. No activar una prueba con facturación ni cambiar a Blaze.
3. La app web **UCSD Objetos Perdidos Web** ya está registrada y sus cuatro valores de configuración pública del SDK están en `.env.firebase.local` de esta computadora. El archivo está excluido de Git. En otra computadora, copiar `.env.example` a `.env.firebase.local`, cambiar `VITE_DATA_MODE=firebase` y completar `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID` y `VITE_FIREBASE_APP_ID` desde la configuración de esa app. No sobrescribir un archivo existente sin preservar su contenido. No usar `.env.local` salvo que se quiera cambiar también el modo predeterminado. No introducir cuentas de servicio, claves privadas ni credenciales administrativas. Reiniciar Vite después de cambiar el archivo.
4. **Authentication → Sign-in method → Google** ya aparece **Habilitada**. No habilitar proveedores adicionales para este alcance. Este estado comprueba configuración del proveedor, no un ingreso real. [Configuración oficial del proveedor](https://firebase.google.com/docs/auth/web/google-signin).
5. `localhost` ya aparece autorizado en este proyecto, sin mutación de la lista. Usar `http://localhost:5174` para la prueba de Google y revisar después el dominio del alojamiento acordado. La autorización observada de `localhost` no demuestra autorización de `127.0.0.1`. Revisar los dominios de desarrollo antes del piloto público. [Dominios autorizados](https://firebase.google.com/docs/auth/faq-and-troubleshooting).
6. Firestore **Standard**, base `(default)`, ya está creado en producción en `nam5`. Conservar esa ubicación; no recrear la base para intentar elegir `us-east1`. Las reglas completas ya se publicaron y compilaron en consola. Si se modifican, repetir las comprobaciones pertinentes antes de utilizar datos reales. La publicación de reglas y del sitio son operaciones distintas.
7. Preparar el acceso inicial Developer según el apartado siguiente. Confirmar además que la cuenta institucional realmente permite ingresar con Google; tener un correo `@ucsd.edu.do` no demuestra por sí solo que sea una cuenta Google utilizable.

La configuración web de Firebase forma parte del cliente y es pública. La protección depende de las reglas, las identidades y los permisos de proyecto, no de ocultar la configuración. [Configuración de aplicaciones Firebase](https://firebase.google.com/docs/projects/learn-more#config-files-objects).

## Ejecutar y compilar cada modo

```powershell
# Demo: identidades simuladas y objetos locales; puerto habitual 5173.
npm run dev

# Firebase: usa .env.firebase.local y puerto 5174.
npm run dev:firebase

# Compilación demo: dist/.
npm run build

# Compilación Firebase para Hosting: dist-firebase/.
npm run build:firebase
```

Ambos servidores pueden coexistir y escuchan solo en la máquina local. Para Google, abrir el modo Firebase en `http://localhost:5174`; para preservar los datos existentes de la demo, mantener su dirección habitual `http://127.0.0.1:5173`. El modo remoto no recurre a datos demo cuando falta configuración o falla la conexión.

`npm run preview` revisa la compilación demo de `dist` en el puerto habitual 4173. Antes de cualquier publicación autorizada de Hosting, ejecutar **`npm run build:firebase`** y verificar `dist-firebase`, que es el directorio configurado en `firebase.json`. Compilar no despliega reglas ni publica el sitio.

## Ingreso Google pendiente

En el navegador integrado, la ventana emergente terminó con `auth/popup-closed-by-user`. La alternativa de redirección mostró selector de cuenta y consentimiento para nombre, perfil y correo, pero regresó a la aplicación como anónimo. No apareció un usuario en Authentication; aceptar el consentimiento no demuestra que Firebase haya creado una sesión.

Probar **Iniciar sesión con Google** en un navegador normal desde `http://localhost:5174`, permitir la ventana emergente y comprobar después sesión y UID en Authentication. La aplicación ofrece y permite redirección solo si `authDomain` coincide con `window.location.host`; localhost utiliza popup. Firebase documenta que el flujo de redirección puede requerir configuración de dominio y almacenamiento para funcionar en navegadores que restringen acceso de terceros. Un problema de ese tipo es una **hipótesis** para el retorno anónimo observado; no se confirmó la causa. [Recomendaciones oficiales de redirección](https://firebase.google.com/docs/auth/web/redirect-best-practices).

## Developer inicial

No hay alta automática. El correo fijo restringe Developer a su dueño, pero no concede permisos por sí solo: se exige una entrada explícita activa e identidad Google institucional verificada. **Este paso sigue pendiente: no existe un UID real verificado ni se publicaron las reglas nuevas de Developer.**

1. Ingresar una vez con Google utilizando la cuenta institucional propuesta. Al no tener rol, la app debe mostrar acceso pendiente y no cargar registros internos.
2. Solo después de completar el ingreso y encontrar realmente al usuario en Authentication, el propietario copia su UID. Si Users sigue vacío, detener este paso; no inventar UID ni asignar acceso automáticamente.
3. Publicar y comprobar las reglas nuevas. Tras validar identidad y UID, preparar desde la consola de Firestore `access/rsegura20250554@ucsd.edu.do` con estos campos. Si la operación se realiza mediante automatización de navegador, confirmar en ese momento la concesión del permiso superior antes de guardarlo:

| Campo | Tipo | Valor inicial |
|---|---|---|
| `email` | string | `rsegura20250554@ucsd.edu.do` |
| `role` | string | `developer` |
| `active` | boolean | `true` |
| `updatedByUid` | string | UID del usuario verificado |
| `updatedAt` | timestamp | Fecha y hora de preparación |

4. Recargar la sesión y confirmar Developer y el gestor de roles. A partir de ahí, Developer puede dar roles admin, decanato o registro a otras personas. Developer no se ofrece como opción y su cuenta reservada no admite cambios desde la app. Los cambios normales usan fecha del servidor.

La consola y los SDK administrativos no están restringidos por estas reglas del cliente. Limitar también los permisos IAM del proyecto y mantener al menos dos administradores institucionales responsables. Si se pierde todo acceso, la recuperación la realiza el propietario desde la consola. [Alcance de las reglas](https://firebase.google.com/docs/firestore/security/rules-conditions).

## Roles y colecciones

| Identidad | Permisos en la aplicación |
|---|---|
| Público, sin cuenta | Consultar catálogo publicado e instrucciones |
| Google institucional, sin rol o inactivo | Consultar catálogo y su propio documento de acceso; sin gestión |
| `registro` | Consultar sus propios registros internos, registrar hallazgos y editar sus propios borradores sin recepción confirmada |
| `decanato` | Registrar, editar, confirmar recepción, publicar, entregar y archivar |
| `admin` | Permisos del decanato y gestión de roles |
| `developer` | Todos los permisos del administrador y custodio, solo para `rsegura20250554@ucsd.edu.do` con autorización explícita |

Se exige Google como proveedor, correo verificado, dominio exacto `ucsd.edu.do` y documento activo en `access`. El dominio por sí solo no concede acceso. No se permite autoasignarse un rol. El administrador no puede desactivar o degradar su propio permiso desde la app. Dar acceso de gestión no concede permisos de consola Firebase.

- `access/{correoEnMinusculas}`: lista explícita de autorización. Solo el administrador lista o cambia permisos; cada identidad institucional puede leer su propio documento, incluso si no está autorizada.
- `privateItems/{id}`: datos completos, custodia, características reservadas, entrega, historial y responsables UID. Decanato y administradores consultan todos; registro consulta únicamente objetos que creó. No se permite eliminar registros. El rol registro utiliza una consulta con `where('createdByUid', '==', uid)` y límite de 500. Puede comprobar la inexistencia de un ID nuevo durante la transacción de creación, pero no leer documentos existentes ajenos.
- `publicItems/{id}`: copia con solo código, título, categoría, tipo, descripción pública, fecha, lugar y disponibilidad. No incluye custodia, historial ni información de la entrega. Las reglas exigen que coincida con un objeto interno recibido y disponible.

Firestore autoriza lecturas de documentos completos, no oculta campos individuales. Por eso el catálogo público está separado de los registros internos. [Protección de campos](https://firebase.google.com/docs/firestore/security/rules-fields).

Las reglas nuevas preparadas bloquean toda escritura cliente de `access/rsegura20250554@ucsd.edu.do`, incluida la del propio Developer, y no permiten crear ni actualizar ningún permiso con `role: developer` desde la app. Admin no puede editar ni desactivar al dueño. El rol superior en la app no cambia permisos IAM; un propietario del proyecto con consola/SDK administrativo puede cambiar su configuración fuera de estas reglas.

Una entrega nueva incorpora `delivery.identityType` (`documento_identidad` o `carnet_estudiante`) y `delivery.photoEvidenceReference` (texto interno de hasta 300 caracteres), además de receptor, prueba y fecha. La imagen no se guarda en Firestore ni en otro servicio de la app. Las reglas preparadas exigen ambos campos en una nueva transición disponible → entregado y conservan las entregas anteriores sin esos campos cuando se archivan. No permiten reescribir una entrega. El checkbox acredita que el operador realizó los pasos; no verifica la existencia del archivo externo.

El dato interno opcional `disposition` contiene `kind` (`donacion` o `remision_documentos`), `recipient`, `reference` y `completedAt`. Conserva los cuatro estados existentes: registrar destino termina en `archivado` y retira cualquier publicación. No se expone en `publicItems`. Las reglas ampliadas publicadas exigen custodio/admin, recepción confirmada, 90 días calendario desde `receivedDate` con inicio del día 90 UTC−4, tipo de destino compatible y ausencia de entrega/destino previo. Protegen el historial anterior y evitan reescribir un destino registrado. Permiten completar un archivado que todavía no tenga entrega ni destino. Están compiladas; sus permisos autenticados requieren comprobaciones reales antes de declararse validados.

El dinero no permite esos destinos aunque aparezca pendiente de revisión. La propuesta requiere aprobación operativa de UCSD; ninguna regla concede por sí sola autorización para donar ni remitir documentos. El checkbox del formulario confirma un traslado autorizado y ya realizado, pero no se persiste como un campo adicional. No hay tareas programadas ni caducidad o destinos automáticos.

Los filtros públicos e internos usan fechas de hallazgo, mientras que el seguimiento de 90 días usa recepción. Las métricas cuentan los registros cargados, sujetos al límite de consulta; no son conteos remotos globales. Los 25 ejemplos universitarios añadidos a la demo permanecen locales, sin migración automática a Firestore.

Publicar, actualizar un objeto disponible y entregarlo/archivarlo mantienen coherencia entre colecciones mediante operaciones atómicas. `getAfter()`/`existsAfter()` comprueban el resultado conjunto: no puede permanecer una publicación después de la entrega ni aparecer una publicación sin recepción. Se conserva el historial anterior y se agrega un evento del usuario autenticado en cada cambio. `updatedAt` usa hora del servidor; las fechas de texto del historial son aportadas por el cliente y no constituyen una auditoría temporal certificada. [Operaciones atómicas en reglas](https://firebase.google.com/docs/firestore/security/rules-conditions), [listas y concatenación](https://firebase.google.com/docs/reference/rules/rules.List).

Las consultas están limitadas a 500 documentos por solicitud. Este límite reduce una lectura individual excesiva; no limita visitas acumuladas ni garantiza disponibilidad frente a abuso. Se debe paginar o ajustar conjuntamente servicio y reglas antes de superar ese volumen. Los historiales admiten hasta 1,000 eventos por objeto; para excederlo hará falta un diseño con eventos separados. Las reglas publicadas y la aplicación validan formato, orden y validez de calendario de las fechas. Su compilación no demuestra por sí sola todos los permisos y comportamientos autenticados.

## Comprobaciones necesarias antes de un piloto

Las reglas ampliadas del 29 de septiembre están compiladas y publicadas. Se repitió esta comprobación contra el proyecto real después de publicarlas, sin sesión ni credenciales administrativas:

```powershell
node --env-file=.env.firebase.local scripts/verify-firebase-public.mjs
```

Resultado: **cinco comprobaciones aprobadas**. La consulta pública ordenada por `foundDate` y limitada a 500 se permitió con cero documentos; la lectura de un documento interno y de un permiso se denegó; las consultas públicas sin límite y con límite 501 se denegaron. El script no escribe ni borra datos. Sus lecturas pueden consumir cuota.

Esto valida únicamente ese subconjunto anónimo. No se ha ejecutado el emulador ni validado roles autenticados, escrituras, revocación o entregas reales. La compilación React/TypeScript, las pruebas del dominio y la simulación local no sustituyen esas comprobaciones. Antes de usar datos reales, probar los casos siguientes con Emulator Suite o identidades autorizadas y datos ficticios aislados. [Pruebas oficiales de reglas](https://firebase.google.com/docs/rules/unit-tests).

| Caso | Resultado esperado |
|---|---|
| Consulta anónima ordenada con `limit(500)` y lectura de documentos internos/acceso | Comprobado: catálogo permitido con 0 registros; documentos internos y permisos denegados |
| Consulta pública sin límite o con `limit(501)` | Comprobado contra el proyecto: denegada |
| Cuenta externa, correo no verificado o proveedor diferente de Google | Toda gestión denegada |
| Institucional sin acceso/inactivo | Solo consulta pública y su propio permiso |
| Intentar escribir su propio rol | Denegado salvo administrador activo, sin autodegradación |
| Registro crea borrador sin recepción | Permitido, historial inicial y UID propios |
| Registro edita borrador ajeno o confirma recepción | Denegado |
| Registro lee un registro interno ajeno, directo o mediante una consulta sin filtro de autor | Denegado |
| Registro consulta objetos con `where('createdByUid', '==', uid)` y `limit(500)` | Permitido para sus propios registros |
| Registro comprueba un ID inexistente y crea su borrador en una transacción | Permitido |
| Decanato publica sin recepción/custodia/fecha | Denegado |
| Crear publicación con campos internos o tipo incompatible | Denegado |
| Publicar sin actualizar coherentemente ambas colecciones | Denegado |
| Entregar sin eliminar publicación en el mismo lote | Denegado |
| Entrega correcta y retirada atómica | Permitido; historial interno permanece |
| Reescribir historial anterior, falsificar actor o eliminar registro | Denegado |
| Archivo de entregado modifica receptor o prueba | Denegado |
| Registro intenta donar o remitir | Denegado |
| Custodio registra destino antes del día 90, sin recepción o sin destinatario/constancia | Denegado |
| Documento intenta donación, otro objeto intenta remisión o dinero intenta cualquiera | Denegado |
| Custodio registra destino válido tras el plazo y retira publicación atómicamente | Permitido; archivado, historial conservado |
| Archivado sin entrega ni destino completa un destino válido | Permitido bajo los mismos requisitos |
| Cambiar, retirar o repetir destino final ya registrado | Denegado |
| Revocar un permiso desde otro administrador | El usuario pierde gestión y los listeners internos deben cerrarse |
| Cuenta institucional en teléfono y computadora | Login, cierre de sesión, permisos y recuperación verificados |

Confirmar además puntos de custodia, procedimiento de reclamación, canal de contacto y responsables. No ingresar nombres, documentos ni hallazgos reales en el modo demo; ahí los datos siguen siendo locales y los perfiles se simulan.
