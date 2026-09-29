# Verificación de la demo y preparación Firebase

Revisiones del 28 y 29 de septiembre de 2026. Entorno: Windows, Node 26.6.0 y npm 11.18.0. Se distingue la simulación local, la configuración de consola y las comprobaciones reales anónimas. La operación autenticada todavía no está comprobada.

## Automatización local

- `npm run build` y comprobación de tipos: aprobados para la ampliación del 29 de septiembre.
- `npm run build:firebase`: aprobado nuevamente después de la ampliación del 29 de septiembre. Genera `dist-firebase` sin publicar.
- `npm run lint`: aprobado para la ampliación del 29 de septiembre.
- `npm test`: **39 de 39 pruebas aprobadas** en la revisión final. Incluyen clasificación, permisos, publicación, entrega, almacenamiento, fechas inclusivas, plazo a 90 días, frontera UTC−4, destinos, ejemplos idempotentes, Developer, evidencia externa y las tres regresiones descritas al final.

## Recorrido local comprobado

Se revisó categoría principal y tipo controlado: ocho categorías, con tipos compatibles. Registro de hallazgos creó su propio borrador sin controles de recepción ni custodia. Decanato confirmó recepción, fecha y ubicación de custodia; publicó el objeto, que apareció al consultar su código; después registró entrega, se retiró del catálogo disponible y se archivó conservando historial.

El código correlativo local se calcula usando todos los registros, aunque la vista esté filtrada por rol. Se comprobaron los códigos terminados en `0013` y `0014`, sin colisión. Firebase utiliza `UCSD-año-UUID` completo para evitar colisiones entre operadores simultáneos y conserva el código al editar; esa creación remota aún no se ha probado con identidades autenticadas.

Se conservaron los datos previos y los dos objetos de QA quedaron archivados, fuera del catálogo público. **No se restablecieron los datos al terminar esta revisión.**

Administrador agregó `qa.roles@ucsd.edu.do` como identidad ficticia con rol registro activo. Se comprobó el acceso simulado; al desactivarlo, la gestión quedó denegada y el cambio persistió tras recargar. El intento de retirar o desactivar el propio rol de administrador se bloqueó.

La ficha pública no muestra características reservadas ni custodia interna. Se revisaron filtros, búsqueda sin coincidencias, ficha ampliada y copia del código, que no envía mensajes. Las fechas inclusivas tienen cobertura de pruebas del dominio. La revisión por teclado es parcial y no constituye una auditoría completa de accesibilidad.

La vista previa de producción se revisó en escritorio y a **390 × 844**, con catálogo, tipos, roles y formularios contenidos en pantalla. La consola no mostró errores ni advertencias en esa revisión. Esto es comprobación de viewport, no prueba en un teléfono físico. El servidor preview de 4173 se cerró después de QA; los servidores locales demo 5173 y Firebase 5174 permanecieron disponibles al cierre.

## Ampliación local del 29 de septiembre

Hallazgo desde/hasta están siempre visibles en el catálogo y panel, con Hoy, Este mes, Sin fechas y Limpiar filtros. Se retiró del hero «Consulta libre, sin cuenta». El rango sigue siendo inclusivo; invertirlo muestra alerta. El seguimiento de 90 días se calcula desde recepción, no desde hallazgo, y no ejecuta destinos automáticamente.

La semilla nueva tiene 37 registros (12 originales + 25 ejemplos universitarios), 30 disponibles, dos donaciones registradas, una remisión de documentos y dos pendientes de revisión a 90 días. En el navegador existente se conservaron 14 registros previos y se añadieron los 25 ejemplos: **39 registros**. La agregación no reemplaza IDs, códigos, historial ni roles, y no transfiere datos a Firebase.

Comprobaciones del navegador integrado con datos ficticios:

- **Hoy** en catálogo mostró dos coincidencias. En el registro interno mostró dos filas.
- Con entrada nativa por teclado, desde `2026-09-30` hasta `2026-09-29` se mostró alerta. Al cambiar la fecha inicial a `2026-09-27`, aparecieron ocho coincidencias, incluyendo ambos extremos. Esta interacción sí se comprobó en la ampliación.
- Antes de los destinos, las métricas mostraron dos pendientes de revisión, dos donados y un documento remitido. Son totales cargados, independientes de los filtros de tabla.
- Registrar una donación ficticia válida de la mochila que cumplió el plazo archivó el registro: disponibles de 30 a 29, donados de dos a tres.
- Registrar remisión ficticia del documento a su emisor retiró otra publicación: disponibles a 28, remitidos a dos y pendientes de revisión a cero.

Se comprobó el historial de la nueva donación terminada en `0035`: conserva custodia, características reservadas, eventos anteriores, actor y constancia del traslado. Captura: `evidence/donacion-historial.png`.

Tras recargar la demo en 5173, persistieron 28 objetos públicos. Decanato mostró 39 registros, tres donados, dos documentos remitidos y cero pendientes de revisión. Se conservaron los 14 registros anteriores más los 25 nuevos sin duplicados. No se restablecieron objetos ni permisos.

En la vista previa de la compilación del 29 de septiembre, a **390 × 844**, catálogo Hoy y administración Hoy mostraron dos resultados cada uno; ambos campos de fechas permanecieron visibles. El ancho de página fue 375, dentro del viewport de 390. La tabla de 841 de ancho quedó dentro de su contenedor de 333 con desplazamiento horizontal propio, sin desbordar la página. Las consolas de demo y preview no mostraron errores ni advertencias. Se restauró el viewport normal y se cerró la pestaña preview al terminar. No se trata de una prueba en un teléfono físico.

## Firebase comprobado

La versión activa comprobada corresponde a destinos de 90 días. La ampliación posterior de fuente con Developer y evidencia de entrega está preparada, **sin compilar ni publicar en consola**. Tampoco se creó permiso Developer real. Las comprobaciones remotas de este documento no validan esa versión nueva.

| Recurso | Estado observado |
|---|---|
| Proyecto | `ucsd-objetos-perdidos`, institucional, Spark sin facturación vinculada |
| Aplicación web | UCSD Objetos Perdidos Web registrada |
| Google Authentication | Proveedor Habilitada; `localhost` autorizado |
| Firestore | Standard, `(default)`, producción, ubicación `nam5` |
| Reglas | Ampliación de destinos publicada y compilada el 29/09 a las 00:06; versión del 28/09 a las 23:35 conservada como referencia para rollback |
| Usuarios y administrador inicial | Users vacío; sin UID ni administrador inicial |
| Hosting y Git remoto | Sin publicación de Hosting; `origin` GitHub configurado; entrega mediante commit local, sin push |

El selector no permitió elegir `us-east1`; la consola confirmó `nam5`, ubicación aplicada por Firebase. Se conservó la base sin cambiarla ni recrearla.

Se ejecutó `node --env-file=.env.firebase.local scripts/verify-firebase-public.mjs` contra el proyecto real: **cinco comprobaciones anónimas de solo lectura aprobadas**.

| Comprobación | Resultado |
|---|---|
| Catálogo público con `orderBy('foundDate', 'desc')` y `limit(500)` | Permitido; 0 documentos |
| Lectura anónima de documento interno | Denegada |
| Lectura anónima de permiso | Denegada |
| Consulta pública sin límite | Denegada |
| Consulta pública con `limit(501)` | Denegada |

El script no escribió ni eliminó registros y no utilizó credenciales administrativas. No comprueba autorización de escrituras, roles autenticados ni devolución de objetos reales.

Las cinco lecturas anónimas se repitieron y aprobaron después de publicar las reglas ampliadas el 29 de septiembre. Los nuevos controles de destino final están compilados y publicados; sus permisos autenticados todavía no se han comprobado contra el backend.

## Google real pendiente

El popup del navegador integrado terminó con `auth/popup-closed-by-user`. La alternativa por redirección mostró selector de cuenta y consentimiento para nombre, perfil y correo; al volver, la app permaneció anónima y Authentication Users siguió vacío. No se obtuvo UID ni se creó permiso inicial. No se declara ingreso exitoso por haber visto consentimiento.

La aplicación ofrece y permite redirección solo si `authDomain === window.location.host`; localhost utiliza popup. La siguiente comprobación es abrir `http://localhost:5174` en un navegador normal y completar el popup. Una incompatibilidad de almacenamiento o dominio durante la redirección es una hipótesis, no una causa confirmada. Firebase explica los requisitos de ese flujo en sus [recomendaciones oficiales](https://firebase.google.com/docs/auth/web/redirect-best-practices).

Solo tras comprobar usuario y UID reales se prepara manualmente el acceso inicial reservado `developer` según [la guía Firebase](firebase-setup.md), junto con las reglas correspondientes. No existe autoasignación de rol real.

El 29 de septiembre, el control de Chrome normal agotó el tiempo de espera al seleccionar la demo. No se volvió a intentar login Google. Sigue pendiente el estado original sin UID ni administrador inicial; el fallo de control del navegador no demuestra un fallo nuevo de autenticación.

## Evidencia y límites

Capturas locales, excluidas de Git:

- `evidence/roles-escritorio.png` y `evidence/roles-celular.png`.
- `evidence/catalogo-tipos-celular.png`.
- `evidence/donacion-historial.png`.
- `evidence/admin-fechas-donaciones.png`.
- `evidence/admin-fechas-movil.png` y `evidence/catalogo-fechas-movil.png`.
- `evidence/firebase-proyecto-spark.png`.
- `evidence/firebase-google-habilitado.png`.
- `evidence/firebase-reglas-publicadas.png` y `evidence/firebase-ubicacion.png`.

Las identidades y restricciones locales son simuladas; los datos internos ficticios están en el navegador y pueden inspeccionarse. La publicación de reglas y cinco lecturas anónimas reales verifican un subconjunto del backend. Faltan login/cierre de sesión reales, UID, bootstrap del administrador, permisos autenticados, revocación y registro → publicación → entrega contra Firestore. No se ejecutó Emulator Suite.

Antes de utilizar datos reales, completar esas pruebas y acordar con UCSD responsables, contacto, custodia y procedimiento definitivo. La demo continúa siendo una propuesta no oficial.

## Developer e identificación en entrega · ampliación posterior del 29/09

Tipos, lint, compilación demo y compilación Firebase aprobaron. Pasaron 36 pruebas. No se añadieron dependencias ni se vinculó facturación. No se publicaron reglas nuevas ni se desplegó Hosting.

En la demo existente, la migración agregó únicamente el perfil Developer reservado; conservó admin, decanato, registro y el acceso QA inactivo. Se comprobó desde Developer que el menú solo ofrece tres roles normales y que escribir el correo reservado para degradarlo devuelve un error sin cambiar el acceso. Desde Administrador, Developer aparece con botón Acceso protegido deshabilitado. Esto sigue siendo simulación local, no prueba de autorización remota.

Developer creó el objeto ficticio `UCSD-2026-0040`, confirmó recepción y custodia, lo publicó y registró la entrega con receptor ficticio, prueba de propiedad, tipo Carné de estudiante, referencia `FOTO-FICTICIA-UCSD-0040-entrega` y checkbox confirmado. Antes de confirmar ese checkbox el botón estaba deshabilitado. No se tomó ni guardó una foto real.

La consulta pública del código tras entrega devolvió ninguna coincidencia. El historial mostró identificación, referencia externa y responsable, conservando recepción y publicación anteriores. Tras recargar, esos datos y los cinco accesos siguieron presentes. El registro QA quedó archivado con su entrega intacta; se conservaron los 39 registros anteriores y el nuevo, sin restablecer objetos ni roles.

Se revisó el formulario ampliado a 390 × 844: ancho del diálogo 326, contenido 311, página 390, sin desbordamiento horizontal. El contenido largo tiene desplazamiento vertical dentro del diálogo. Se canceló esa revisión sin entregar otro objeto y se restauró el viewport. Consola sin errores ni advertencias en la revisión local.

Evidencias: `developer-protegido.png`, `developer-protegido-admin.png`, `entrega-identidad-evidencia.png`, `entrega-evidencia-historial.png`, `entrega-evidencia-movil.png`, dentro de `evidence/` excluido de Git.

Pendientes nuevos: compilación/publicación de las reglas actuales, ingreso Google real, alta Developer explícita de la cuenta institucional validada y pruebas autenticadas. La URL Hosting es una posibilidad investigada, no un despliegue autorizado o ejecutado. Ver [alojamiento y evidencia](alojamiento-y-evidencia.md).

## Revisión final y correcciones antes del commit

La revisión independiente identificó tres diferencias entre la validación local y los requisitos de las reglas. Se reprodujeron con tres pruebas que fallaron antes de corregir el código:

1. Un borrador podía marcar recepción confirmada sin custodia o fecha. Ahora se requieren ambas al confirmar recepción, aun cuando no se publique.
2. El dominio aceptaba textos que superarían los máximos de Firestore. Ahora rechaza el exceso en nombre, descripción, zona, custodia, características reservadas, receptor y prueba. Los formularios también limitan los campos correspondientes.
3. La autorización local permitía archivar una entrega y alterar simultáneamente otros datos. Ahora conserva todos los datos anteriores y exige exactamente un nuevo evento de historial. Se ajustó la prueba histórica para utilizar un archivo real con su evento, conservando entregas antiguas sin inventar evidencia.

Las **39 pruebas automatizadas** aprobaron después de las correcciones. Tipos, lint y compilaciones demo/Firebase aprobaron. No se añadieron dependencias. También se aclaró el aviso de perfiles simulados para evitar sugerir que el proyecto Firebase todavía no existe.

Se revisó la compilación demo de producción con `npm run preview` en `http://127.0.0.1:4173`, con almacenamiento propio de esa dirección y únicamente datos ficticios. El objeto de prueba fue `UCSD-2026-0038`; no es el `0040` del servidor de desarrollo 5173. No se restablecieron los datos ni los permisos de ninguna dirección.

| Caso revisado en navegador | Resultado observado |
|---|---|
| Hoy + Electrónica + texto «celular» | Una coincidencia del 29/09; ficha con código, fecha, zona y procedimiento |
| Búsqueda sin coincidencias | Aviso aclara que no implica que el objeto no haya sido encontrado |
| Correo institucional sin autorización | Gestión denegada |
| Registro de hallazgos | Custodia y recepción deshabilitadas; crea su borrador y no tiene acción Publicar |
| Decanato publica antes de recibir | Bloqueado con explicación |
| Guardar recepción sin custodia | Bloqueado antes de persistir |
| Recepción válida, tipo Calculadora y publicación | Registro disponible; catálogo pasó de 30 a 31 |
| Consulta del código publicado | Ficha pública sin custodia ni señal reservada QA |
| Entrega antes de confirmación | Botón deshabilitado; requiere identificación y referencia externa |
| Entrega ficticia completa | Estado Entregado; catálogo volvió a 30 y búsqueda del código sin coincidencias |
| Recarga y selección de Decanato | Entrega, custodia, señal reservada, identificación, referencia e historial persistieron |
| Archivo de la entrega y segunda recarga | Estado Archivado persistido; conserva datos y agrega el evento de archivo |
| Developer en compilación final | Gestor solo ofrece admin/registro/decanato; cuenta reservada protegida y actualización de su permiso rechazada |
| Pantalla 390 × 844 | Diálogo de entrega de 326 px, contenido desplazable; tabla de unos 742 px dentro de contenedor de 335 px; página no desborda el viewport |
| Consola de la vista previa | Sin errores ni advertencias durante el recorrido |

La recarga termina la identidad simulada seleccionada: hay que volver a elegir el perfil; los objetos y la lista de permisos sí persisten. Se utilizaron controles de teclado para navegar y confirmar operaciones, sin declarar una auditoría completa de accesibilidad ni prueba en dispositivo físico.

Evidencias locales excluidas de Git: `evidence/qa-final-entrega-movil.png` y `evidence/qa-final-historial-archivado.png`. El viewport se restauró al finalizar; solo se cierra la vista previa usada para QA. Los servidores demo 5173 y Firebase 5174 se conservan.

El commit incluye aplicación, lockfile, fuente de reglas, pruebas y documentación. **No publica Hosting, no actualiza reglas remotas, no concede accesos reales y no hace push.** Continúan pendientes el ingreso Google con UID, acceso inicial Developer, reglas actuales compiladas/publicadas y pruebas autenticadas de backend. Para operar, seguir [la preparación Firebase](firebase-setup.md) y confirmar el protocolo con UCSD.
