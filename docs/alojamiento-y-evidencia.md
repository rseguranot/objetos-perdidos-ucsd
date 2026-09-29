# URL pública y evidencia externa

Investigación y publicación del 29 de septiembre de 2026. Hosting clásico está publicado; no se vinculó facturación ni se creó almacenamiento de fotografías o una carpeta Drive.

## Acceder fuera de esta computadora

Firebase Hosting clásico sirve el sitio estático compilado con React/Vite, proporciona HTTPS y subdominios gratuitos `web.app` y `firebaseapp.com`. Spark no requiere información de pago. La URL publicada y comprobada es [ucsd-objetos-perdidos.web.app](https://ucsd-objetos-perdidos.web.app). [Hosting](https://firebase.google.com/docs/hosting), [planes](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).

El código está preparado con `npm run build:firebase` → `dist-firebase` y `firebase.json`. Publicar la demo local solamente compartiría una simulación: su localStorage no centraliza información entre dispositivos. Para el piloto deben publicarse la versión Firebase y sus reglas, completar Google y el permiso Developer inicial, y comprobar los permisos autenticados y el circuito de entrega con datos ficticios antes de usar datos reales.

El usuario autorizó publicar y conceder a Firebase CLI acceso con la cuenta institucional. Se utilizó la herramienta oficial 15.32.0 de forma temporal, sin instalación global ni nuevas dependencias del proyecto. Se desplegaron únicamente los 19 archivos de `dist-firebase`, con `--only hosting --project ucsd-objetos-perdidos`; no se desplegaron reglas ni se asignaron accesos. La consulta remota está vacía y los ejemplos locales permanecen en cada navegador. La concesión Developer y las pruebas autenticadas siguen pendientes; no hay provisión automática.

Para publicar otra versión, restaurar las dependencias fijadas, preparar `.env.firebase.local`, ejecutar `npm run build:firebase` y comprobar el resultado antes de ejecutar `firebase deploy --only hosting --project ucsd-objetos-perdidos --account rsegura20250554@ucsd.edu.do`. La CLI requiere una sesión autorizada. Mantener el proyecto en Spark. Las actualizaciones de reglas deben desplegarse y validarse por separado. Para recuperar una publicación anterior, utilizar el historial de versiones de Hosting y comprobar la URL después; esta fue la primera publicación, por lo que no había una versión anterior del sitio para rollback.

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
