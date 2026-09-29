# Acceso dual y pruebas separadas

## Qué entorno utilizar

| Entorno | Dirección | Datos e identidad |
|---|---|---|
| Demo local | `http://127.0.0.1:5173` | Objetos y roles simulados del navegador |
| Piloto UCSD | [firebaseapp.com](https://ucsd-objetos-perdidos.firebaseapp.com) o [web.app](https://ucsd-objetos-perdidos.web.app) | Firebase institucional; catálogo vacío, sin objetos reales |
| QA | [pruebas.web.app](https://ucsd-objetos-perdidos-pruebas.web.app) | Firebase separado; 37 objetos ficticios y 30 publicaciones iniciales |

El piloto y QA están en Spark sin facturación. Un resultado obtenido en QA no es una operación ni validación automática del piloto.

## Piloto: Google y contraseña

Se comprobó ingreso Google real de `rsegura20250554@ucsd.edu.do` en firebaseapp.com, UID en Authentication y documento activo explícito con rol Developer. El gestor Roles cargó protegido. Las reglas de Developer y entrega, y Hosting, están publicados. No se ha comprobado todavía el circuito completo de objetos con esa identidad.

La UI ofrece Google y **Correo y contraseña**. La segunda opción usa un usuario de Firebase Authentication, no la contraseña de Gmail o del servicio universitario. Email/Password está habilitado, pero no se creó un usuario institucional con contraseña ni se vinculó ese proveedor a Google. No hubo reset automático.

La app no permite crear cuentas. Roles tampoco crea usuarios Authentication ni contraseñas: administra únicamente autorización. Gestión institucional requiere correo verificado, proveedor actual Google o contraseña, dominio exacto `ucsd.edu.do` y permiso activo. No se falsifica la verificación de correo. [Documentación del proveedor contraseña](https://firebase.google.com/docs/auth/web/password-auth).

Google por redirección se permite solo cuando app y `authDomain` comparten origen. Usar firebaseapp.com para ese flujo. Desde web.app, el botón Google abre el acceso en firebaseapp.com del mismo piloto para usar la redirección compatible. Cada origen tiene su sesión; ver una sesión en un dominio no implica verla en el otro. [Condiciones de redirección](https://firebase.google.com/docs/auth/web/redirect-best-practices).

Developer ya está dado de alta explícitamente; no repetir bootstrap. Es reservado, no asignable ni modificable desde Roles, incluso por el propio Developer. No implica IAM.

Roles mantiene una interfaz compacta para gestionar accesos. Se retiraron la introducción, el título explicativo, los avisos técnicos de Firestore/Developer y las cuatro tarjetas que describían perfiles. Las explicaciones de permisos se conservan en esta documentación y en [arquitectura](arquitectura.md); los controles de autorización siguen vigentes. Este ajuste está publicado en ambos Hosting y se comprobó en el piloto con Developer: formulario y tabla visibles, sin esos elementos retirados. La versión con ubicaciones del campus aprobó 57 pruebas, lint y tres compilaciones con tipos, sin cambios de reglas.

## QA: identidades acotadas

| Correo ficticio | Rol fijo |
|---|---|
| `administrador@demo.ucsd.invalid` | Administrador |
| `decanato@demo.ucsd.invalid` | Decanato |
| `registro@demo.ucsd.invalid` | Registro de hallazgos |

Son tres usuarios Auth de contraseña del proyecto **`ucsd-objetos-perdidos-pruebas`**. No son correos institucionales ni buzones reales. Las contraseñas solo están en un archivo TEMP fuera de Git; solicitar acceso privado a ese archivo autorizado. No incluirlas en documentos, capturas, código, logs o commits.

La excepción exige simultáneamente proyecto y token audience exactos, proveedor `password`, UID/correo incluidos en la lista fija y permiso activo con el rol esperado. El build de QA requiere `VITE_DATA_MODE=firebase` y ese project ID exacto. No altera `email_verified` ni concede Developer a las cuentas ficticias. En el piloto no existe esa excepción.

El acceso Google mostrado en QA es un enlace explícito hacia el piloto. No autentica Google dentro de QA. Una cuenta QA no necesita ni debe probarse contra el piloto.

## Compilar sin mezclar entornos

| Destino | Comando | Configuración | Reglas |
|---|---|---|---|
| Piloto | `npm run build:firebase` | `.env.firebase.local`, `firebase.json`, `dist-firebase` | `firebase/firestore.rules` |
| QA | `npm run build:pruebas` | `.env.pruebas.local`, `firebase.pruebas.json`, `dist-pruebas` | `firebase/firestore.pruebas.rules` |

Los archivos locales de entorno y compilación están excluidos de Git. Revisar siempre project ID y reglas antes de una publicación autorizada. No desplegar la excepción QA al piloto. No hay transferencia automática de usuarios, objetos, roles ni localStorage.

## Pruebas reales y pendientes

El circuito SDK real de QA aprobó registro → recepción → publicación → entrega → retirada del catálogo → archivo con historial, en su ejecución final con el objeto ficticio `2979320c-f8b3-49e2-8605-aa73ab5f93f8`. Registro creó su borrador y consultó solo los propios; sus intentos de recepción y publicación fueron denegados. Decanato recibió y publicó. La consulta anónima obtuvo la proyección sin custodia privada; la lectura privada se denegó.

Una entrega sin identificación y referencia externa se denegó. La entrega válida con carné y referencia ficticia retiró el documento público; después se archivó preservando historial. Administrador consultó las tres identidades y no pudo cambiar sus roles fijos ni conceder Developer. Se revocó Registro con sesión abierta y se restauró; su sesión perdió autorización durante la revocación. Se denegaron el borrado público aislado por Decanato, la entrega y borrado público en lote por Registro, operaciones por Decanato inactivo y borrado público anónimo. Decanato se restauró activo después de la prueba.

En navegador se comprobaron login por contraseña y logout de los tres roles: Registro vio solo sus objetos y no Roles; Decanato vio la tabla completa; Administrador vio los tres accesos. QA aprobó donación del ejemplo 0033 y remisión del 0034, con retirada de publicaciones. El script final también creó dos objetos antiguos ficticios, los publicó y registró donación/remisión con timestamp del servidor; aprobó lectura mediante codec y denegó fecha ISO del cliente y reescritura del destino. Se archivaron los 14 cuadernos y la mochila de diagnóstico. La carga inicial fue 37 objetos y 30 públicos; al cierre se confirmaron 28 públicos en navegador.

La optimización de reglas está publicada en ambos proyectos y validada en QA sin rebajar controles. Corrigió el límite de evaluación de 1000 expresiones durante publicación/entrega; el bloqueo no estaba en recepción. El destino remoto usa `serverTimestamp()` y las reglas verifican `request.time` contra el día 90 en Santo Domingo. La UI decodifica ese valor a ISO y conserva lectura de datos anteriores. Hosting final publicó 19 archivos en cada proyecto; las fuentes de reglas activas coinciden con los archivos mediante lectura API. Ambos conservan `billingEnabled: false`. Los resultados los mantiene [verificación](verificacion.md).

No se creó ni probó una cuenta institucional con contraseña ni su verificación de correo. Tampoco se declara el circuito de objetos probado con Google institucional en el piloto. Otros casos no enumerados y acuerdos operativos UCSD requieren verificaciones específicas antes de uso real.

En una donación ficticia del navegador, Firebase confirmó la escritura pero se perdió la respuesta del commit. El reintento ya reconoce la propuesta completa persistida sin otra escritura, conservando conflictos si los datos difieren. El parche aprobó dos pruebas nuevas (53 totales), lint, tipos y las tres compilaciones, y se republicó en ambos Hosting. Una nueva donación desde Decanato en QA completó el formulario, cerró el diálogo sin error, mostró Donado y conservó exactamente un evento de donación más creación, con fecha autoritativa. No se forzó otra pérdida de respuesta: la recuperación está cubierta por pruebas de lógica y revisión independiente. Las reglas no cambiaron. Las cinco comprobaciones anónimas institucionales finales aprobaron con cero públicos.

Los 90 días y custodia externa de fotografías siguen como propuesta UCSD. No existen donaciones automáticas, carga de fotos ni almacenamiento Firebase Storage.

## Selector de acceso — 29/09/2026

El diálogo comienza con dos opciones: «Continuar con Google» y «Continuar con correo». Correo muestra exclusivamente su formulario; «Volver a las opciones» regresa al selector y limpia la contraseña. Al cerrar el diálogo se desmonta el formulario para volver al selector al abrirlo de nuevo. Las sesiones ya iniciadas conservan sus opciones de verificación y cierre.

Google muestra el logotipo oficial multicolor servido localmente desde `public/brand/google-g.png`, obtenido de [Google Identity](https://developers.google.com/identity/branding-guidelines) ([asset oficial](https://developers.google.com/static/identity/images/g-logo.png)). En QA abre el piloto institucional; en el piloto conserva su identidad y autorización existentes. Este ajuste no crea cuentas ni cambia permisos o reglas.

Verificación: lint, 57 pruebas existentes y compilaciones con tipos; en la UI de QA se comprobaron selector, ocultación de Google, regreso, ingreso real de Decanato con contraseña y reapertura. Las pruebas de lógica existentes no se presentan como pruebas visuales del diálogo.

La versión del selector se publicó en ambos Hosting (20 archivos cada uno). Se comprobó la pantalla del piloto y el enlace Google al origen institucional; HTML y assets recuperados por HTTP coinciden con los builds locales. No se repitió el circuito Google completo en esta revisión visual. Capturas locales: `evidence/acceso-selector-publicado.png`, `evidence/acceso-dos-opciones.png` y `evidence/acceso-solo-correo.png`.
