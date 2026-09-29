# URL pública y evidencia externa

Investigación del 29 de septiembre de 2026 con documentación oficial. No se publicó Hosting, no se vinculó facturación y no se creó almacenamiento ni una carpeta Drive.

## Acceder fuera de esta computadora

Firebase Hosting clásico sirve el sitio estático compilado con React/Vite, proporciona HTTPS y subdominios gratuitos `web.app` y `firebaseapp.com`. Spark no requiere información de pago. La URL prevista para el sitio predeterminado del proyecto es `https://ucsd-objetos-perdidos.web.app`; aún no se ha desplegado ni comprobado ese sitio. [Hosting](https://firebase.google.com/docs/hosting), [planes](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

El código está preparado con `npm run build:firebase` → `dist-firebase` y `firebase.json`. Publicar la demo local solamente compartiría una simulación: su localStorage no centraliza información entre dispositivos. Para el piloto deben publicarse la versión Firebase y sus reglas, completar Google y el permiso Developer inicial, y comprobar los permisos autenticados y el circuito de entrega con datos ficticios antes de usar datos reales.

La petición actual consulta si es posible tener una URL; no autoriza por sí sola el despliegue. Preparar el artefacto, acordar el carácter de propuesta del sitio y autorizar su publicación son pasos distintos. Si la operación se realiza por UI, la concesión del acceso Developer requiere confirmación en el momento de crear su permiso. No hay provisión automática.

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
