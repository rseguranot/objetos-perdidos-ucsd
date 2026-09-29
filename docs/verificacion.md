# Verificación: estado vigente y evidencia histórica

## Estado vigente · 29 de septiembre de 2026

Esta sección es la referencia actual. Las revisiones históricas siguientes documentan cómo se llegó a este estado; sus resultados locales no equivalen a pruebas de escritura remota.

| Comprobación | Resultado actual |
|---|---|
| Google institucional real | Login completado en `https://ucsd-objetos-perdidos.firebaseapp.com` con `rsegura20250554@ucsd.edu.do`; UID comprobado en Authentication |
| Developer | Documento explícito activo; sesión Developer y gestor Roles protegido comprobados en navegador |
| Hosting institucional | Publicado en firebaseapp.com y web.app; catálogo institucional vacío, sin hallazgos reales |
| Reglas institucionales | Versión final publicada, incluida optimización y fecha autoritativa; fuente activa leída por API coincide con el archivo |
| Email/Password | Proveedor habilitado sin facturación; no se creó usuario institucional contraseña ni vínculo/reset automático |
| QA aislado | Proyecto `ucsd-objetos-perdidos-pruebas`, Spark sin facturación, Hosting publicado y carga inicial de 37 ejemplos ficticios con 30 públicos |
| Acceso QA en navegador | Login por contraseña y logout comprobados para Registro, Decanato y Administrador; Registro ve solo sus objetos y no Roles, Decanato ve tabla completa, Administrador ve tres accesos activos con roles fijos; catálogo final de 28 públicos comprobado |
| Pruebas automatizadas | **53 de 53 aprobadas**, incluidas tres del codec Firestore y dos de reconocimiento de commit |
| Tipos y análisis estático | Aprobados |
| Compilaciones | Demo, piloto Firebase y QA aprobadas |
| Circuito SDK QA | **Aprobado completo**, ejecución final con objeto ficticio `2979320c-f8b3-49e2-8605-aa73ab5f93f8`; transiciones, proyección pública, entrega, archivo, revocación y denegaciones descritas abajo |
| Codec y destinos remotos | Timestamp autoritativo del servidor y lectura ISO/legacy validados; donación 0033 y remisión 0034 aprobadas con retirada pública |
| Publicación final | Hosting con codec, 19 archivos por proyecto, y reglas finales publicados en piloto y QA |
| Parche posterior de reintento | Compilado, revisado y republicado en ambos Hosting, 19 archivos cada uno; nueva donación E2E UI aprobada, sin forzar otra pérdida de respuesta |
| Anónimo institucional con reglas finales | Cinco comprobaciones aprobadas, 0 públicos; facturación deshabilitada verificada en ambos proyectos |

El circuito autenticado de objetos se probó mediante SDK contra el backend real QA. En navegador se verificaron por separado las sesiones y vistas de los tres roles. El piloto institucional tiene login Google y Roles protegido comprobados; no se declara el circuito completo de objetos probado con esa identidad institucional. Los resultados de QA pertenecen exclusivamente a su proyecto separado.

Las tres cuentas QA `.invalid` usan contraseña y una excepción limitada a proyecto/token audience, UID/correo fijos y rol activo esperado. No simulan verificación de correo institucional ni permiten Developer. Las credenciales permanecen en un archivo TEMP fuera de Git; no se incluyen en este documento.

Google por redirección se permite solo cuando aplicación y `authDomain` comparten origen. Desde web.app se ofrece popup o enlace explícito al firebaseapp.com del mismo piloto; cada origen mantiene su sesión. El botón Google del proyecto QA lleva explícitamente al piloto, no demuestra login Google en QA. Ver [acceso y pruebas](acceso-y-pruebas.md).

Evidencia actual local, excluida de Git: `evidence/google-developer-activo.png`, `evidence/acceso-google-y-correo.png` y `evidence/roles-pruebas-activos.png`.

## Circuito SDK QA aprobado

| Operación o restricción real | Resultado |
|---|---|
| Registro crea borrador propio y consulta filtrada por creador | Permitido |
| Registro confirma recepción o publica | Denegado |
| Decanato confirma recepción y publica | Permitido |
| Anónimo consulta publicación sin campos de custodia privada | Permitido, proyección comprobada |
| Anónimo lee documento privado | Denegado |
| Entrega sin identificación y referencia externa | Denegada |
| Entrega con carné y referencia externa ficticia | Permitida; documento público retirado |
| Archivo después de entrega | Permitido; historial conservado |
| Administrador consulta tres roles QA | Permitido |
| Administrador cambia un rol fijo QA o concede Developer | Denegado |
| Registro revocado con sesión abierta | Acceso retirado; restauración comprobada |
| Decanato borra solo la publicación | Denegado |
| Registro entrega y borra publicación en lote | Denegado |
| Decanato inactivo realiza lote | Denegado; acceso activo restaurado |
| Anónimo borra publicación | Denegado |

La ejecución final ampliada de `scripts/verify-firebase-qa.mjs` aprobó con el registro `2979320c-f8b3-49e2-8605-aa73ab5f93f8`; las pruebas anteriores con `5d7d9e0d-9600-4b0e-a603-60230910d16c` y `c10a2343-0240-40c2-a302-bc3cbb25a63a` son antecedentes aprobados. Los 37 objetos y 30 publicaciones corresponden a la semilla inicial; al cierre se confirmaron 28 públicos en navegador.

La donación del ejemplo 0033 y remisión del 0034 aprobaron contra QA y retiraron sus publicaciones. El script final añadió dos objetos antiguos ficticios, publicó y registró donación/remisión con timestamp del servidor. `disposition.completedAt` es un timestamp nativo autoritativo de Firestore: las reglas exigen `completedAt == request.time` y el inicio del día 90 desde recepción en Santo Domingo (UTC−4). El codec lo convierte a ISO para la UI y conserva lectura de valores anteriores. La lectura con codec aprobó; una fecha ISO suministrada por cliente y la reescritura del destino se denegaron. Los 14 cuadernos y la mochila de diagnóstico quedaron archivados.

El bloqueo previo fue el límite de 1000 expresiones de evaluación durante publicación/entrega, **no la recepción**. Se optimizó la consulta de rol, validación nativa de calendario, comparación de proyección pública y reutilización del historial. Se retiraron verificaciones de presencia redundantes donde la lectura obligatoria del campo ya la exige. Las denegaciones anteriores se conservaron y aprobaron. Las reglas finales están publicadas en ambos proyectos. [Límites oficiales](https://firebase.google.com/docs/rules/rules-behavior).

La actualización final de Hosting publicó 19 archivos en piloto y QA con codec y etiqueta del entorno corregida. Las fuentes de reglas activas se recuperaron por API y coincidieron con los archivos, SHA-256 piloto `0e977d3bef19b25759135b0e6948ce6c98b17eeea626d31ebca4e390c698b36a` y QA `f0e43f5bdd47fe8f4eef7f5e68513356fd00b0863cd71d2ac8c976da5daf6fc1`. Ambos proyectos mantienen `billingEnabled: false` y proveedor contraseña habilitado.

## Reintento tras respuesta de commit perdida

En navegador QA apareció `Commit RestConnection unavailable` después de persistir una donación ficticia cuyo ID comienza por `417eaed3`. El reintento de transacción encontraba el objeto modificado por esa misma operación y producía un conflicto falso; la pérdida de respuesta no significó pérdida de la escritura.

`writeItem` ahora lee y decodifica el registro actual y reconoce únicamente la propuesta completa ya persistida, incluido UUID/evento de historial, actor, contenido, UID y código. Solo normaliza la fecha autoritativa de un destino nuevo. Una coincidencia retorna éxito sin nuevas escrituras; los cambios diferentes conservan el conflicto. Dos pruebas nuevas elevan el total a 53 aprobadas; tipos, lint y las tres compilaciones aprobaron. Una revisión independiente aprobó el parche y sus cinco casos codec/matcher.

Las reglas no cambiaron y mantienen sus hashes comprobados. El resultado SDK ampliado con ID `2979320c-f8b3-49e2-8605-aa73ab5f93f8` sigue vigente. El parche se republicó en ambos Hosting, 19 archivos por proyecto.

Una nueva donación UI con Decanato, objeto ficticio `e8a80958-af71-4ba2-ae14-d3922b174044` recibido el 21/06, completó el formulario: el diálogo cerró sin error, la tabla mostró Donado y el historial conservó creación más exactamente un evento de donación. La fecha autoritativa mostrada fue 29/09/2026 8:05:55 a. m. La nueva operación no reprodujo el error de conexión; el log anterior pertenecía al intento previo. No se forzó otra pérdida de respuesta y no se declara E2E de recuperación inducida; el reconocimiento idempotente está cubierto por pruebas de lógica y revisión. Captura: `evidence/qa-donacion-servidor-ui.png`, excluida de Git.

Al cierre QA mostró 59 registros, 28 públicos, seis donados, tres remitidos y cero pendientes de revisión. Son totales del conjunto cargado después de ensayos ficticios, distintos de la semilla de 37/30. La mochila del intento `417eaed3` quedó donada por su commit persistido; no se describe como archivo común.

## Pendientes actuales

- Verificar cualquier caso adicional necesario que no esté cubierto por la matriz anterior.
- Evaluar el acceso institucional por contraseña con correo verdaderamente verificado y permisos explícitos; no está demostrado por el login de cuentas ficticias QA.
- Acordar con UCSD responsables, contacto, custodia, procedimiento y evidencia externa antes de utilizar objetos o datos reales.

No quedan pendientes el primer ingreso Google, el UID institucional, el alta Developer ni la primera publicación de Hosting: esos hitos ya fueron superados. La revocación de Registro en sesión abierta también quedó comprobada en QA. No hubo facturación vinculada ni almacenamiento de fotografías. El plazo de 90 días continúa como propuesta, sin caducidad, donación o remisión automáticas.

## Evidencia histórica local · 28 y 29 de septiembre

Entorno de las revisiones locales: Windows, Node 26.6.0 y npm 11.18.0. Objetos, receptores y constancias fueron ficticios. Las revisiones previas de 36/39/48 pruebas fueron sustituidas por el resultado vigente de 53; los recorridos siguientes corresponden a localStorage e identidades simuladas.

### Catálogo, filtros y preservación

Se revisaron ocho categorías y tipos compatibles, búsqueda por texto/código/zona, rangos inclusivos, aviso sin coincidencias y ficha pública sin custodia ni características reservadas. Copiar código no envía mensajes.

Hallazgo desde/hasta permanecen visibles en catálogo y panel. Hoy mostró dos coincidencias; un rango nativo desde 30/09 hasta 29/09 mostró alerta. Cambiar la fecha inicial a 27/09 produjo ocho coincidencias, incluyendo ambos extremos. Este mes, Sin fechas y Limpiar filtros conservan su alcance de consulta; no alteran registros.

La semilla tiene 37 registros (12 originales + 25 ejemplos universitarios), 30 disponibles, dos donaciones de ejemplo, una remisión y dos pendientes de revisión a 90 días. En el navegador existente se añadieron los 25 ejemplos a 14 registros previos: 39, sin reemplazar IDs, códigos, historial ni roles. Se comprobó recarga sin duplicados. No se restablecieron objetos ni permisos al terminar.

Los códigos correlativos locales se calcularon con todos los registros aun cuando Registro viera solo los propios; se verificaron los terminados en 0013 y 0014 sin colisión. El modo remoto usa año + UUID completo; su circuito SDK QA está comprobado en la sección vigente.

### Recepción, devolución, destinos y roles simulados

Registro creó su propio borrador sin poder confirmar recepción ni custodia. Decanato confirmó recepción/fecha/custodia, publicó, consultó el código y devolvió el objeto; salió del catálogo y conservó historial al archivarlo.

Administrador agregó una identidad ficticia con rol registro, comprobó acceso simulado y lo desactivó. La denegación y los permisos persistieron después de recargar. Se bloqueó retirar el propio administrador. Developer simulado solo ofreció los tres roles normales; la cuenta reservada estuvo protegida también desde Administrador. Esta parte es evidencia local, distinta del acceso Developer remoto vigente.

Donación ficticia de mochila y remisión ficticia de documento retiraron publicaciones y dejaron registros archivados. Tras recargar: 39 registros, 28 públicos, tres donados, dos remitidos y cero pendientes de revisión. El historial de la donación terminada en 0035 conservó custodia, detalles reservados, eventos anteriores, actor y acta. Esto documenta operaciones de demo, no traslados reales.

La entrega ampliada se comprobó con receptor/prueba ficticios, tipo de identificación, referencia externa de foto y checkbox. Antes de confirmar el checkbox no se pudo entregar. La app no tomó ni almacenó fotos. Los registros locales 0040 en desarrollo y 0038 en preview pertenecieron a almacenamientos distintos; se conservaron tras recarga con entrega e historial intactos.

Tres regresiones se reprodujeron y corrigieron: recepción confirmada sin fecha/custodia, textos superiores al máximo de reglas y archivo de una entrega que modificaba otros datos. La validación ahora exige recepción completa, límites de texto y exactamente un evento de archivo con datos anteriores conservados.

### Presentación y accesibilidad parcial

Las tarjetas de la ilustración se comprobaron en movimiento y detenidas al emular `prefers-reduced-motion`. Los ciclos independientes no requirieron dependencias nuevas.

Se revisó a 390 × 844: catálogo y administración Hoy mostraron dos resultados, fechas visibles y página de 375 de ancho. Una tabla de 841 quedó en contenedor de 333 con scroll propio; el diálogo de entrega de 326 tuvo desplazamiento vertical interno. La página no desbordó. Consolas de demo y preview sin errores ni advertencias. Se restauraron viewport/preferencia y cerró la vista previa usada para QA.

Se usó teclado y se comprobó cierre de diálogos/retorno del foco. Es una revisión parcial, no auditoría completa de accesibilidad ni prueba en teléfono físico.

Capturas históricas dentro de `evidence/`, excluidas de Git:

- `roles-escritorio.png`, `roles-celular.png`, `catalogo-tipos-celular.png`.
- `donacion-historial.png`, `admin-fechas-donaciones.png`, `admin-fechas-movil.png`, `catalogo-fechas-movil.png`.
- `hero-flotacion-escritorio.png`, `hero-flotacion-celular.png`.
- `developer-protegido.png`, `developer-protegido-admin.png`.
- `entrega-identidad-evidencia.png`, `entrega-evidencia-historial.png`, `entrega-evidencia-movil.png`.
- `qa-final-entrega-movil.png`, `qa-final-historial-archivado.png`.

## Antecedentes de publicación y lectura remota

La primera publicación institucional del 29/09, aproximadamente 05:38 UTC−4, desplegó 19 archivos de `dist-firebase` con Firebase CLI temporal. HTTPS/HTML/CSS respondieron 200 y coincidieron con la compilación; el catálogo cargó con cero registros y la ilustración animada. Ese primer despliegue fue solo Hosting. Las publicaciones posteriores ya incluyen reglas Developer/entrega y acceso real; no aplicar los pendientes de aquella primera publicación al estado actual.

Firestore Standard `(default)` quedó en `nam5`, ubicación comprobada en consola, sin recrear la base para escoger us-east1. Las versiones iniciales de reglas del 28/09 a las 23:35 y 29/09 a las 00:06 son antecedentes para recuperación, no la descripción de los permisos institucionales actuales.

Se ejecutó la comprobación institucional anónima de solo lectura:

```powershell
node --env-file=.env.firebase.local scripts/verify-firebase-public.mjs
```

| Comprobación | Resultado documentado |
|---|---|
| Catálogo con `orderBy('foundDate', 'desc')` y `limit(500)` | Permitido, 0 registros |
| Documento privado anónimo | Denegado |
| Documento de permiso anónimo | Denegado |
| Consulta pública sin límite | Denegada |
| Consulta pública con `limit(501)` | Denegada |

La comprobación no escribió ni eliminó registros ni utilizó credenciales administrativas. Sus cinco casos no validan todo el backend autenticado.

Los primeros intentos Google en el navegador integrado terminaron en popup cerrado o retorno anónimo; el control de Chrome también agotó tiempo de espera. Son antecedentes superados por el login institucional real descrito arriba. No se confirmó su causa; no se conservan como pendientes actuales. Ver [condiciones oficiales de redirección](https://firebase.google.com/docs/auth/web/redirect-best-practices).

Capturas históricas: `evidence/hosting-publicado.png`, `evidence/hosting-publicado-celular.png`, `evidence/firebase-proyecto-spark.png`, `evidence/firebase-google-habilitado.png`, `evidence/firebase-reglas-publicadas.png`, `evidence/firebase-reglas-90-dias.png` y `evidence/firebase-ubicacion.png`.

La publicación, autenticación real y pruebas locales tienen alcances distintos. Las restricciones locales pueden inspeccionarse/modificarse en el navegador y no ofrecen confidencialidad. El circuito backend QA vigente está aprobado; quedan los pendientes institucionales y operativos enumerados arriba antes de usar datos reales.
