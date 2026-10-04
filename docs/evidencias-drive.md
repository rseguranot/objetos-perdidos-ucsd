# Fotografías privadas de entrega

## Estado al 3 de octubre de 2026

Implementado y publicado en [QA](https://ucsd-objetos-perdidos-pruebas.web.app) y en el [piloto](https://ucsd-objetos-perdidos.firebaseapp.com/?acceso=google). Ambos tienen servicio y carpeta privados independientes. Las nuevas entregas requieren una a tres fotos; se conservan las referencias externas de entregas históricas. No se habilitó facturación ni se añadieron dependencias.

Se verificó acceso al panel Apps Script con `rsegura20250554@ucsd.edu.do` y se creó el proyecto aislado **UCSD Evidencias — Prueba de puente QA**. El editor es:

https://script.google.com/home/projects/1Q6p7kZNzZPuXiaVBRzonzWYh0kWCrcLk_2d6u_RRx42zKw-3MZe6yHG8/edit

El servicio independiente **UCSD Evidencias — Piloto** ya está creado y preparado en:

https://script.google.com/home/projects/17ikq0tw716K-fwuT4tzYMY-zD32b5ISNcfhzLx_Mn_CNNWceo7KSI39Z/edit

El 3 de octubre el usuario autorizó expresamente Drive, Datastore, conexiones externas y publicación. Después de reconectar Chrome, `setupPilot` completó la preparación de la carpeta privada y las propiedades. Se retiró esa función temporal y se publicó el código final como versión 1 a las 20:41 de Santo Domingo, ejecutado por la propietaria y con endpoint HTMLService accesible sin sesión Google. Las operaciones de datos siguen exigiendo token Firebase y permiso activo. `.env.firebase.local` incorpora la URL del servicio; permanece fuera de Git.

Hosting y reglas del piloto se publicaron juntos. Ambos dominios sirvieron HTML idéntico al build. Con la sesión institucional Developer se comprobó el selector publicado, una entrega con tres imágenes ficticias de 640 × 480 y el visor privado. Se archivó únicamente el objeto nuevo de prueba «Cuaderno prueba fotos piloto»: la API confirmó entrega y constancia conservadas, tres archivos asociados y ausencia de publicación. Las consultas anónimas de registro privado y constancia fueron denegadas. El proyecto conserva `billingEnabled: false`. Los 50 ejemplos anteriores no se modificaron; quedó un ejemplo adicional archivado.

La conexión con Chrome se recuperó. La sonda se desplegó y respondió correctamente desde un iframe local: HTMLService → google.script.run → respuesta al origen exacto. Se comprobó en escritorio y con viewport de 390 × 844; falta la prueba en un teléfono físico. Esta sonda no solicita acceso a Drive ni comprueba todavía una entrega con fotografías.

La versión 2 del servicio quedó desplegada el 2 de octubre a las 11:42. Usa la carpeta privada «UCSD Evidencias — QA». Las reglas y Hosting QA se publicaron después de comprobar el listado autenticado. El scope `drive` autorizado por la propietaria abarca los archivos de su cuenta, aunque el código opere solo en la carpeta configurada.

Se verificaron dos entregas reales en QA con imágenes ficticias: una y tres fotografías. El visor recuperó las tres imágenes de 640 × 480 con Administrador y Registro. Ambas entregas salieron del catálogo; las comprobaciones SDK aprobaron constancias, restricciones públicas y archivo preservando entrega y fecha. Los ejemplos dedicados mencionados abajo quedaron archivados, con evidencias conservadas. La URL publicada listó las evidencias con Registro. La captura en teléfono físico sigue pendiente; el usuario autorizó continuar sin tener uno disponible.

Chrome incluía un perfil ICC en el JPEG de canvas, rechazado por el servidor. Se corrigió eliminando segmentos APP1/APP2/APP13/COM antes de enviar. Un fixture real de Chrome pasó de 759 a 285 bytes conservando dimensiones y píxeles comprimidos.

## Prueba preparada

`apps-script/probe/Code.gs` solo devuelve HTMLService y una respuesta de conexión. No usa Drive, Firebase, fotografías, tokens ni servicios facturables.

`apps-script/probe/client.html` permite probar la URL `/exec` dentro de un iframe. Servirlo exclusivamente en `http://127.0.0.1:5181` para la primera comprobación. Autoriza solo orígenes de prueba; el código valida nonce, origen y pertenencia del emisor al iframe antes de fijar el canal. No envía información sensible.

La sonda fue sustituida por el backend real de `apps-script/service/`, con selector, compresión, visor y transporte publicados en QA. Las comprobaciones de carpeta y archivos exigen acceso privado y ausencia de lectores o editores adicionales. Si UCSD bloquea este acceso, detener la integración sin cambiar políticas del dominio ni habilitar facturación.

Las 103 pruebas locales aprobaron permisos simulados, formato de fotografías, transacción, reintentos y compatibilidad histórica. Se corrigió también el índice privado de receptor para permitir archivar una entrega creada por el servicio. Tipos, lint y compilación QA aprobaron. Las dos reglas compilaron con la API oficial de Firebase sin errores; las advertencias corresponden a parámetros sin usar de la función que deniega entregas directas. Los fallos de cuota, pérdida de respuesta y concurrencia están cubiertos con GAS simulado, sin afirmar reproducción de fallos reales de Google. El script remoto de roles aprobó revocación y denegación de entregas directas o referencias inventadas. No publicar reglas que bloqueen la entrega directa antes de tener operativo el servicio del mismo entorno.

## Continuación de QA

1. En el editor guardar la versión final de `apps-script/service/Code.gs`, sin `setupQa`. Actualizar el despliegue QA a una nueva versión; comprobar la URL y la propietaria efectiva.
2. Comprobar que `FOLDER_ID` apunta a la carpeta privada QA y que no tenga lectores ni editores adicionales. Comprobar permisos Firestore de la propietaria y validar una operación de listado autenticada.
3. La configuración local `.env.pruebas.local` ya incorpora la URL de Apps Script. Iniciar `npm run dev -- --mode pruebas --port 5180 --strictPort`. Nunca incluir `.env.*.local` ni credenciales en Git.
4. Los dos objetos dedicados de QA ya están archivados: «Cuaderno evidencia QA 1 fotos» (`44f64324-b18a-4a27-ad6b-1d796f83297e`) y «Cuaderno evidencia QA 3 fotos» (`e58355c4-b787-4baa-b20c-ec6b50cb79a4`). Sus evidencias permanecen consultables. Usar imágenes ficticias; `scripts/verify-evidence-qa.mjs prepare` permite crear nuevos ejemplos cuando se necesite otra entrega.
5. Una vez operativo el servicio, publicar las reglas QA y comprobar selector → subida → entrega → visor. Ejecutar `node scripts/verify-evidence-qa.mjs check <id>` con `UCSD_QA_CREDENTIALS_FILE` apuntando al archivo local externo al repositorio. Comprueba constancia, número de fotos, retirada pública, restricciones de Registro/visitante y archiva únicamente el ejemplo dedicado, preservando entrega y fecha histórica.
6. `scripts/verify-firebase-qa.mjs` admite `UCSD_EVIDENCE_ENABLED=true` para exigir denegación de entregas directas y referencias inventadas con las nuevas reglas. Sin esta variable conserva la prueba del protocolo anterior; no usar esa modalidad tras activar fotografías.
7. Mantener pruebas de roles, revocación, archivos inválidos, pérdida de respuesta y concurrencia. El usuario autorizó continuar la publicación sin teléfono disponible; esa comprobación física sigue pendiente. QA y piloto ya están publicados, con subida y visor comprobados en escritorio.

La función REST [projects.test](https://firebase.google.com/docs/reference/rules/rest/v1/projects/test) se usó inicialmente para compilar fuentes. Después se publicó QA y se realizaron las verificaciones SDK y del flujo con fotos descritas arriba. Los pasos anteriores sirven para reproducir la configuración; no deben repetirse como si QA siguiera vacío.

## Diseño acordado para continuar tras la prueba

- Una a tres fotografías por entrega, una obligatoria de persona y objeto. Selector del sistema y captura móvil cuando esté disponible; sin fotografías de documentos.
- Compresión JPEG en navegador, máximo 1 MB y lado mayor de 1.600 píxeles; validación de bytes, formato, tamaño y dimensiones también en servidor.
- Subida por Developer, Administrador y Decanato. Sección privada de evidencias para todos los roles activos, con 25 entregas por página; Registro no obtiene acceso general a privateItems.
- Carpetas y servicios independientes de QA y piloto, propiedad de la cuenta institucional; sin links públicos ni permisos Drive individuales para operadores.
- Validar token con Firebase, proyecto, identidad y acceso activo en cada operación. Aplicar la excepción de identidades ficticias únicamente en QA.
- Servicio con OAuth de propietaria, sin claves privadas descargadas; sus escrituras Firestore usan IAM y deben repetir los controles de autorización. No incorporar permisos adicionales de Owner.
- Constancia deliveryEvidence creada exclusivamente por servicio. Denegar nuevas entregas directas del cliente cuando se active el servicio; conservar entregas históricas y su archivado.
- Subida pendiente recuperable e idempotente por operación, objeto, operador y contenido. Commit atómico de constancia, entrega, historial y eliminación pública, condicionado por cambios concurrentes del objeto y del permiso.
- Visor servido previa autorización por evidenceId; no admitir fileId arbitrario. Sin fotografías en catálogo ni almacenamiento persistente en navegador.
- Sin eliminación automática de evidencias vinculadas. La política para fotos reales y el traspaso institucional se acordarán antes de producción.

## Referencias

- https://developers.google.com/apps-script/guides/html/communication
- https://developers.google.com/apps-script/reference/html/x-frame-options-mode
- https://firebase.google.com/docs/firestore/use-rest-api
- https://developers.google.com/apps-script/guides/services/quotas
