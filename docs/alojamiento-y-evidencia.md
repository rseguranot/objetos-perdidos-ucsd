# URL pública y evidencia externa

Investigación y publicaciones del piloto y QA. Hosting clásico está publicado en ambos proyectos Spark sin facturación. No se creó almacenamiento de fotografías ni carpeta Drive. La identidad Google real y Developer institucional están comprobados; el circuito SDK autenticado de objetos QA está aprobado.

## Acceder fuera de esta computadora

Firebase Hosting clásico sirve la interfaz estática React/Vite con HTTPS y subdominios `web.app` y `firebaseapp.com`. El piloto está publicado en [firebaseapp.com](https://ucsd-objetos-perdidos.firebaseapp.com), recomendado para Google por redirección, y [web.app](https://ucsd-objetos-perdidos.web.app). Son el mismo proyecto, pero las sesiones dependen del origen. Desde web.app se ofrece popup o enlace explícito al firebaseapp.com del mismo piloto. [Hosting](https://firebase.google.com/docs/hosting), [planes](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), [redirección Google](https://firebase.google.com/docs/auth/web/redirect-best-practices).

QA está publicado en [ucsd-objetos-perdidos-pruebas.web.app](https://ucsd-objetos-perdidos-pruebas.web.app), con 37 objetos ficticios y 30 publicaciones iniciales. Su Google lleva explícitamente al piloto; no prueba Google en QA. Email/Password está habilitado, con tres cuentas ficticias acotadas al proyecto y roles fijos. Las contraseñas están únicamente en TEMP fuera de Git. Consultar [acceso y pruebas](acceso-y-pruebas.md).

La primera publicación del 29 de septiembre utilizó temporalmente Firebase CLI oficial, sin instalación global ni nuevas dependencias. Se preparó explícitamente el permiso Developer después de comprobar login Google y UID reales; Roles cargó protegido. La actualización final de Hosting publicó 19 archivos en cada proyecto, con codec y etiqueta QA corregida. Las reglas finales están publicadas en ambos proyectos; la lectura API de sus fuentes activas coincide con los archivos. El catálogo institucional permanece vacío, sin hallazgos reales ni migración de la demo.

En QA se comprobaron login y logout de los tres roles en navegador, y mediante SDK real creación, recepción, publicación, lectura pública, entrega identificada, retirada del catálogo y archivo con historial, junto con revocación en sesión abierta, restauración y las denegaciones documentadas. Donación y remisión remotas de ejemplos también aprobaron. Los 14 cuadernos y la mochila de diagnóstico quedaron archivados. Los 37 objetos y 30 públicos describen la carga inicial; al cierre se confirmaron 28 públicos en navegador. Esta evidencia no prueba automáticamente el mismo recorrido con Google institucional en el piloto. [Verificación](verificacion.md).

La versión con codec de `disposition.completedAt` se publicó en ambos Hosting con sus reglas correspondientes. QA valida la hora autoritativa de Firestore contra el plazo de 90 días; la UI convierte timestamp a ISO y conserva lectura de datos anteriores. El SDK final también probó dos objetos antiguos ficticios con destino nativo y rechazó fecha ISO del cliente y reescritura del destino. Publicación y pruebas autenticadas tienen evidencia separada.

La versión de codec se validó inicialmente con 51 pruebas; el parche de reintento elevó el total a 53. Reconoce una escritura persistida cuya respuesta se perdió: la misma propuesta retorna éxito sin otra escritura; datos diferentes conservan conflicto. El parche aprobó compilación y revisión independiente y se republicó en ambos Hosting, 19 archivos cada uno. Una nueva donación E2E por UI completó sin error, mostró Donado y conservó creación más exactamente un evento de donación con hora autoritativa. No se forzó otra pérdida de respuesta; su recuperación está cubierta por pruebas de lógica y revisión. Las reglas conservan sus hashes y las cinco lecturas anónimas finales del piloto aprobaron con catálogo vacío. Evidencia local: `evidence/qa-donacion-servidor-ui.png`.

La actualización posterior de campus y Roles compacto aprobó 57 pruebas, lint y las tres compilaciones con tipos. Se publicó en ambos Hosting; HTML y assets recuperados coincidieron con los locales. No cambió reglas. Se comprobaron filtros, creación, recarga y edición del borrador QA, después archivado con historial, y Roles compacto del piloto con Developer. QA quedó con 60 privados y 28 públicos. El DOM a 390 píxeles no desbordó horizontalmente; la captura móvil integrada no constituye una auditoría visual ni prueba física. [Campus y ubicaciones](campus-y-ubicaciones.md).

Antes de publicar otra versión autorizada, restaurar dependencias fijadas y comprobar destino/configuración:

| Destino | Compilación y carpeta | Configuración de despliegue |
|---|---|---|
| Piloto `ucsd-objetos-perdidos` | `.env.firebase.local`, `npm run build:firebase`, `dist-firebase` | `firebase.json`, reglas `firebase/firestore.rules` |
| QA `ucsd-objetos-perdidos-pruebas` | `.env.pruebas.local`, `npm run build:pruebas`, `dist-pruebas` | `firebase.pruebas.json`, reglas `firebase/firestore.pruebas.rules` |

La CLI necesita sesión autorizada; indicar explícitamente proyecto y configuración antes de desplegar. Nunca publicar las reglas QA ni su lista de identidades al piloto. Mantener Spark y verificar cada actualización de reglas aparte del sitio. Para rollback, utilizar el historial de versiones de Hosting/reglas del proyecto correcto y comprobar la URL después. No modificar un proyecto por error al validar el otro.

Conservar Hosting clásico: Firebase App Hosting requiere Blaze y no aporta una necesidad para esta SPA. [Costes de App Hosting](https://firebase.google.com/docs/app-hosting/costs).

El objetivo sigue siendo US$0 sin facturación vinculada. Spark impone cuotas: alcanzar límites puede impedir despliegues o interrumpir el servicio. Las páginas oficiales muestran límites de transferencia diferentes entre la tabla de precios y la documentación de uso; comprobar consola y condiciones vigentes antes del piloto, sin prometer una cifra de capacidad. [Cuotas de Hosting](https://firebase.google.com/docs/hosting/usage-quotas-pricing), [precios](https://firebase.google.com/pricing).

## Fotos de entrega

| Servicio | Compatibilidad con la condición sin facturación |
|---|---|
| Cloud Storage para Firebase | No: exige Blaze, incluido acceso a buckets anteriores desde el 3 de febrero de 2026. Hay cuotas sin coste, pero se requiere facturación vinculada. |
| Google Cloud Storage | No: el Free Tier requiere una cuenta de facturación. Sus cuotas gratuitas no son un límite de gasto. |
| Drive institucional con carga manual | Propuesta viable si UCSD dispone de espacio y autoriza su uso; comprobar cuota y controles institucionales. No es object storage integrado a la app. |

[Cambios oficiales de Cloud Storage para Firebase](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024), [Free Tier de Google Cloud](https://docs.cloud.google.com/free/docs/free-cloud-features).

Una cuenta personal Google tiene 15 GB compartidos con Gmail y Fotos. No se puede asumir esa misma cuota para `@ucsd.edu.do`: Workspace depende de la administración institucional. [Almacenamiento de Google](https://support.google.com/drive/answer/2375123?hl=es).

Se propone una carpeta institucional **Restringida**, compartida únicamente con personal de custodia autorizado, con carga manual. No habilitar enlaces públicos ni usar los activos públicos de Hosting para estas fotos. La app almacena una referencia o nombre de archivo interno, no la imagen ni un enlace público. [Compartición en Drive](https://support.google.com/drive/answer/2494822?hl=es).

UCSD debe acordar custodia y conservación de fotos. No fotografiar el documento ni copiar su número como parte de esta propuesta. Ver el [procedimiento de devolución](protocolo-propuesto.md). No se implementaron captura de cámara, carga de archivos, almacenamiento de objetos ni integración Drive; cualquier integración futura requiere diseño de permisos y nueva revisión de coste.
