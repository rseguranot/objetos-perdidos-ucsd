# Objetos perdidos UCSD · Demo

Demostración local de un catálogo público y un panel del decanato para centralizar la recepción, consulta y devolución de objetos encontrados. Está construida con React, Vite, TypeScript, Material UI, Emotion e iconos de Material UI. El catálogo usa texto e iconos. Las fotografías de entrega se suben desde la app a Drive institucional privado mediante Apps Script. Los registros históricos conservan sus referencias externas.

**Es una propuesta para presentar a UCSD, no un servicio oficial.** Hay una demo local con identidades simuladas, un piloto institucional conectado a Firebase y un proyecto QA separado para pruebas autenticadas con datos ficticios. No se transfiere almacenamiento local entre esos entornos.

**Piloto institucional:** [ucsd-objetos-perdidos.firebaseapp.com](https://ucsd-objetos-perdidos.firebaseapp.com), dirección recomendada para Google, y [ucsd-objetos-perdidos.web.app](https://ucsd-objetos-perdidos.web.app), mismo proyecto. Tiene **50 objetos ficticios `UCSD-DEMO`**, sin hallazgos reales. Se comprobaron el ingreso Google, el rol Developer y el gestor de accesos.

**Pruebas separadas:** [ucsd-objetos-perdidos-pruebas.web.app](https://ucsd-objetos-perdidos-pruebas.web.app), con tres cuentas ficticias de roles fijos. La semilla inicial fue de 37 objetos y 30 publicaciones; las pruebas remotas agregaron más ejemplos ficticios. Ambos proyectos están en Spark sin facturación. Consultar [acceso y pruebas](docs/acceso-y-pruebas.md) antes de utilizar cualquier credencial o publicar.

El catálogo y el formulario usan **categoría principal + tipo de objeto controlado**. Hay ocho categorías: Electrónica, Documentos, Llaves, Material académico, Ropa, Bolsos y accesorios, Dinero y Otros. Cada categoría ofrece sus tipos compatibles: por ejemplo, Electrónica → Estuche de audífonos y Material académico → Cuaderno. El tipo permite concretar la búsqueda sin multiplicar las categorías. La lectura adapta clasificaciones anteriores en memoria sin borrar registros, códigos ni historial. Para dinero, el formulario orienta a guardar monto y denominaciones en las características reservadas.

El formulario publicado registra **Edificio o lugar**; el aula o referencia específica se escribe en la descripción pública. Usa 17 lugares de la guía UCSD más Otro y conserva ubicaciones históricas desconocidas. Ejemplo ficticio: edificio `Edificio La Altagracia (EAL)` y descripción «Aula 206». Los filtros por edificio están en catálogo y panel. Consultar [campus y ubicaciones](docs/campus-y-ubicaciones.md).

## Filtros y seguimiento

**Hallazgo desde** y **Hallazgo hasta** están siempre visibles tanto en el catálogo como en el panel interno. El rango incluye ambas fechas. **Hoy**, **Este mes** y **Sin fechas** permiten ajustar solo el periodo; **Limpiar filtros** también elimina los demás criterios. Un rango invertido muestra una alerta y no presenta resultados. El hero ya no incluye el texto «Consulta libre, sin cuenta»; la consulta pública sigue disponible sin iniciar sesión.

El panel combina texto, categoría, tipo, edificio, estado, fechas del hallazgo y seguimiento/destino. El campo de búsqueda ofrece una × para borrar el texto. Los filtros desplegables admiten escribir fragmentos sin distinguir tildes o mayúsculas; por ejemplo, «Ele» muestra Electrónica. Las fotos seleccionadas se pueden ampliar antes de confirmar la entrega. El catálogo y el registro remotos se recorren en **páginas de 25 con cursor**; Anterior/Siguiente conserva páginas ya leídas. La búsqueda exacta por código consulta ese campo; el texto normalizado consulta la primera palabra en `searchTerms` y verifica las demás mientras avanza por candidatos. No se presenta un total exacto de coincidencias de texto sin calcularlo. Las métricas de estado, donaciones, remisiones y revisión a 90 días se calculan con agregaciones independientes de las páginas; el reporte anual presenta hallazgos, entregas y destinos por mes. QA comprobó 136 combinaciones de consultas y un reporte completo contra el conjunto de referencia.

La fuente añade `buildingId`, términos normalizados de búsqueda y fechas locales de entrega/destino como campos derivados. [Los 51 índices compuestos](firebase/firestore.indexes.json) están referidos por las dos configuraciones Firebase. QA migró sus 60 registros ficticios iniciales con respaldo de 88 documentos y publicó reglas, índices e interfaz; las pruebas posteriores aumentaron sus totales. Los 50 registros ficticios del piloto recibieron los campos derivados con respaldo previo de 80 documentos, sin cambiar estados ni historial. El script de [backfill acotado](docs/firebase-setup.md) simula localmente por defecto. Las agregaciones consumen cuota Spark; el reporte anual actual hace 55 consultas de conteo por carga. Para admitir `count()` sin límite, las reglas también admiten consultas `list` sin límite sobre los datos ya autorizados: es un riesgo de consumo que debe vigilarse.

La demo propone revisión tras **90 días calendario desde la recepción en el decanato**. Al comenzar el día 90 en Santo Domingo (UTC−4), el objeto recibido y sin devolución ni destino final aparece pendiente de revisión; no cambia de estado automáticamente. Esto no constituye una política aprobada de UCSD ni implica pérdida automática de derechos.

Decanato o administrador pueden registrar manualmente una donación de un objeto en buen estado a una organización sin fines de lucro, o remisión de documentos a su institución emisora, después de ese plazo. El formulario requiere destinatario, constancia y confirmación de que el traslado fue autorizado y completado. El dinero necesita un protocolo especial pendiente: se incluye en seguimiento, pero no permite estos destinos.

El destino es un dato interno `disposition`, no un quinto estado: el objeto queda **archivado**, sale del catálogo y conserva historial. Los chips **Donado** y **Remitido al emisor** derivan del destino registrado. Un archivo común no cuenta como donación; un archivado sin entrega ni destino puede completarlo cuando cumpla los requisitos. Un destino registrado no puede reescribirse ni retirarse desde las operaciones de la app.

## Ejecutar localmente

Requiere Node.js y npm. Usar Node 24 o 26 es recomendable; el entorno de desarrollo utiliza Node 26. El mínimo para todos los comandos, incluidas las pruebas TypeScript ejecutadas directamente por Node, es Node 22.18. No es necesario cambiar la configuración global del sistema para utilizar un runtime compatible.

Desde esta carpeta:

```powershell
npm ci
npm run dev
```

Abrir `http://127.0.0.1:5173`. Si el puerto está ocupado, consultar la dirección que muestra Vite. El servidor escucha únicamente en la máquina local. Para detenerlo, pulsar `Ctrl+C` en su terminal.

```powershell
npm run typecheck
npm run lint
npm run test
npm run build
npm run preview
```

`build` genera la demo estática en `dist/`. `preview` revisa esa compilación localmente en el puerto habitual 4173; consultar la dirección que indique la terminal. No es una publicación ni un servidor de producción. `npm ci` restaura las versiones del `package-lock.json`.

El modo Firebase se ejecuta y compila por separado:

```powershell
npm run dev:firebase
npm run build:firebase
npm run build:pruebas
```

`dev:firebase` utiliza `.env.firebase.local` y el puerto 5174, permitiendo conservar la demo en 5173. Para probar Google, abrir `http://localhost:5174`, cuyo dominio ya aparece autorizado en el proyecto. `build:firebase` genera `dist-firebase/`; `firebase.json` apunta a ese directorio para evitar publicar accidentalmente la demo. Ninguno de estos comandos despliega reglas ni publica Hosting.

`build:pruebas` utiliza `.env.pruebas.local` y genera `dist-pruebas/`; su configuración de publicación es `firebase.pruebas.json`, exclusiva del proyecto QA. Los archivos locales de entorno están excluidos de Git y deben recrearse en otra computadora. Las contraseñas QA están únicamente en un archivo temporal fuera del repositorio.

## Recorrido de demostración

1. Consultar el catálogo como visitante. Buscar por descripción o código y combinar categoría, tipo, zona y rango de fechas. Abrir una ficha: el lugar del hallazgo y el punto de retiro propuesto son datos distintos.
2. Abrir **Acceso personal** y simular otro correo institucional sin autorización. Comprobar que no puede administrar el catálogo: tener dominio UCSD no concede permisos.
3. Seleccionar **Registro de hallazgos**, crear un registro ficticio y elegir categoría y tipo compatible. Se guarda como borrador; añadir características reservadas para comprobar propiedad. Este rol solo puede consultar sus registros y editar sus propios borradores sin recepción confirmada.
4. Seleccionar **Decanato**, abrir ese registro y confirmar recepción, fecha y ubicación de custodia. Publicarlo; un objeto sin recepción confirmada no puede publicarse. El administrador también puede realizar estas operaciones.
5. Volver al catálogo público y buscar su código. Abrir el detalle y utilizar **Copiar código para consultar**. El botón copia texto; no envía mensajes ni inicia una reclamación.
6. Regresar al decanato, comprobar una característica ficticia de propiedad y registrar la entrega con los datos ficticios solicitados. Verificar que deja de contar como disponible, permanece consultable públicamente con estado Entregado y conserva su entrega en el historial interno.
7. Seleccionar **Administrador** y abrir **Roles**. Probar con un correo ficticio institucional la asignación de rol, activación y desactivación; comprobar su efecto mediante la identidad simulada correspondiente. El administrador no puede desactivar ni quitar su propio rol desde la app.
8. Revisar también edición, archivo, búsqueda sin coincidencias y navegación por teclado en computadora y celular. Probar fechas siempre visibles, presets y alerta de rango invertido.
9. Desde Decanato o Administrador, consultar los ejemplos pendientes de revisión a 90 días. Registrar con datos ficticios donación o remisión autorizada, comprobar retirada del catálogo, archivo, métricas e historial. Esta acción documenta un traslado; no lo ejecuta.

La opción **Restablecer objetos demo** requiere confirmación y sustituye solo los objetos locales por los datos iniciales; conserva los permisos. Si el almacenamiento contiene información inválida, la aplicación muestra un aviso y bloquea las escrituras; no elimina silenciosamente esos datos. Restablecer objetos no repara una lista de permisos inválida. Preservar el contenido existente antes de investigar o corregir datos locales.

## Roles

| Identidad o rol | Permisos |
|---|---|
| Visitante o institucional sin autorización activa | Consulta pública, sin gestión |
| `registro` · Registro de hallazgos | Crea borradores, consulta sus registros internos y edita sus propios borradores sin recepción confirmada |
| `decanato` · Decanato | Registra, edita, confirma recepción y custodia, publica, entrega y archiva |
| `admin` · Administrador | Operaciones del decanato y gestión de accesos |
| `developer` · Developer | Operaciones de administración y custodia; exclusivo de `rsegura20250554@ucsd.edu.do` |

En modo local, **Acceso personal** permite seleccionar o introducir identidades ficticias; no autentica el correo. La lista de autorización local se gestiona desde **Roles**.

Developer queda por encima de Administrador y no aparece entre los roles asignables. Nadie puede asignarlo, degradarlo, desactivarlo ni editar el documento de acceso de la cuenta reservada desde la app, incluido Developer. La demo añade ese perfil simulado sin borrar otros permisos. En el piloto requiere identidad institucional verificada, proveedor Google o contraseña admitido y un documento explícito de acceso activo; conocer el correo no concede permisos. El acceso real con Google ya se comprobó y se preparó explícitamente; no existe bootstrap automático. Este rol no concede IAM ni permisos de consola. Las tres cuentas QA no pueden asumir Developer.

El panel de acceso ofrece **Google** y **Correo y contraseña**. Esta última es una credencial de Firebase Authentication; no utiliza automáticamente la contraseña de Gmail o de UCSD. No se creó una cuenta institucional con contraseña, no se vinculó un proveedor a la cuenta Google ni se inició un reset. La app no ofrece registro de usuarios; **Roles** asigna permisos a identidades, no crea usuarios Auth ni contraseñas.

## Entrega con identificación y evidencia externa

El estudiante debe acreditar la propiedad y presentar documento de identidad o carné de estudiante. El personal revisa la identificación presencialmente; la app no solicita números ni fotografías del documento. QA y piloto permiten seleccionar entre una y tres fotos de la entrega, con vista previa y reemplazo; Apps Script las guarda en Drive privado y confirma la entrega en Firestore. El personal con acceso al registro las abre con **Ver fotos** dentro de **Historial**, en Gestión de objetos. Registro de hallazgos conserva la consulta de todas las constancias mediante **Consultar entregas**, un diálogo dentro de Gestión que no concede acceso a custodia ni a características reservadas. No hay una sección de navegación independiente para las fotos. La demo local simula este proceso sin conservar imágenes. El piloto utiliza su servicio y carpeta independientes. Las entregas anteriores se conservan sin exigir fotografías retroactivas.

Para las direcciones publicadas y la evaluación de fotografías, consultar [alojamiento y evidencia externa](docs/alojamiento-y-evidencia.md).

## Persistencia y límites

- Los objetos se guardan en `localStorage` bajo `ucsd-lost-found-demo-v1`; los permisos se conservan por separado bajo `ucsd-lost-found-demo-access-v1`. Persisten al recargar mientras el navegador permita guardar datos.
- No se comparten entre dispositivos, perfiles de navegador ni direcciones distintas. El sitio de desarrollo y la vista previa pueden tener datos separados por usar puertos diferentes.
- En modo local, las identidades y roles son una simulación, no un inicio de sesión ni autorización real. Cualquier persona con acceso al navegador puede inspeccionar o modificar su almacenamiento. El código y los datos iniciales también contienen detalles internos ficticios.
- La vista pública omite información reservada, pero esto solo demuestra la presentación. **No introducir datos reales hasta disponer de un backend y controles de acceso verificados.**
- No existe correo, WhatsApp ni formulario de envío integrado. UCSD debe confirmar el contacto, horario, responsables y condiciones de reclamación.

La instalación nueva contiene **37 objetos ficticios**: los 12 originales y 25 ejemplos universitarios; 30 están disponibles, hay dos donaciones y una remisión de ejemplo, y dos casos pendientes de revisión a 90 días. Al abrir una demo existente, se agregan únicamente los ejemplos universitarios cuyos IDs faltan. La carga es idempotente: conserva registros, códigos e historial previos, y no modifica roles. Por eso los totales de una demo ya utilizada pueden diferir de los iniciales. No hay migración automática a Firebase. QA recibió una carga inicial separada de 37/30; el piloto recibió después 50 ejemplos ficticios mediante un procedimiento autorizado, distinto de esa semilla local.

## Firebase preparado y costes

La demo local no necesita Gmail, Firebase ni pagos. El proyecto institucional `ucsd-objetos-perdidos` está comprobado en Spark, **Sin costo · USD0/mes**, sin facturación vinculada. La app **UCSD Objetos Perdidos Web** está registrada, Google aparece **Habilitada** y `localhost` está autorizado. Firestore Standard `(default)` está creado en producción en **`nam5`**; el selector no permitió elegir `us-east1` y no se recreó la base.

Las reglas institucionales con Developer, entrega identificada, evidencia externa y destinos están publicadas, junto con los 51 índices y la interfaz de paginación. QA aprobó el flujo remoto completo, 136 combinaciones de consultas y los conteos de un reporte anual frente a la referencia completa. Email/Password está habilitado y ambos proyectos seguían sin facturación vinculada en la última comprobación.

Consultar [la preparación de Firebase](docs/firebase-setup.md) para mantener la configuración y los accesos. Esta computadora tiene los cuatro valores públicos del SDK en `.env.firebase.local`, excluido de Git. En otra computadora se debe recrear desde `.env.example`, establecer `VITE_DATA_MODE=firebase` y completar la configuración de la app web. Utilizar `.env.local` cambiaría también el modo predeterminado; el archivo específico de Firebase permite mantener la demo local separada. Si falta configuración o falla la conexión, no se sustituyen los datos remotos por los ejemplos locales. No se transfieren automáticamente objetos ni permisos locales a Firebase.

El piloto exige proveedor actual Google o contraseña, correo verificado, dominio exacto `ucsd.edu.do` y entrada activa en la lista explícita de autorización. Las reglas de Firestore verifican esos requisitos y las operaciones de cada rol; las restricciones visuales no bastan. `publicItems`, `privateItems` y `access` separan catálogo publicable, registro completo y autorizaciones. QA tiene una excepción acotada al proyecto exacto, tres correos ficticios, UID fijos, proveedor contraseña y roles fijos; no simula verificación de correo institucional.

La [comprobación remota anónima](scripts/verify-firebase-public.mjs) aprobó la primera página de 25, el total exacto de 30 y las denegaciones de lectura interna y permisos:

```powershell
node --env-file=.env.firebase.local scripts/verify-firebase-public.mjs
```

En una comprobación anónima **histórica, anterior a la carga ficticia**, el catálogo limitado a 500 respondió con 0 documentos. Las reglas actuales de conteos tienen un comportamiento distinto: permiten consultas sin límite sobre datos públicos o datos internos ya autorizados. Los clientes de la app solicitan páginas de 25; esto no impide que otro cliente autorizado genere más lecturas. Vigilar la cuota de Spark.

El [circuito SDK real de QA](scripts/verify-firebase-qa.mjs) aprobó creación propia por Registro, recepción y publicación por Decanato, consulta pública sin custodia privada, entrega identificada con referencia externa, retirada del catálogo y archivo con historial. También aprobó revocar Registro con sesión abierta y restaurarlo; denegó recepción/publicación y entrega con borrado público por Registro, borrado público aislado por Decanato, lote por Decanato inactivo, lectura privada/borrado público anónimos, entrega incompleta, cambio de roles fijos QA y asignación Developer. Se probaron donación y remisión remotas de ejemplos ficticios, retirando sus publicaciones.

Firestore guarda `disposition.completedAt` con hora autoritativa del servidor; las reglas comprueban que llegue al inicio del día 90 desde la recepción en Santo Domingo. La UI convierte ese timestamp a ISO y conserva lectura de registros anteriores; el destino final sigue siendo inmutable. El SDK final aprobó además publicación y destino de dos objetos antiguos ficticios, lectura mediante codec y denegación de fecha ISO suministrada por cliente y reescritura del destino. Reglas y Hosting finales están publicados en ambos proyectos. Los 14 cuadernos y la mochila de diagnóstico quedaron archivados; el catálogo QA mostró 28 públicos en navegador. El detalle fechado está en [verificación](docs/verificacion.md).

El piloto propone [Firebase Hosting](https://firebase.google.com/docs/hosting), Firestore y autenticación con Google en [Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), manteniendo la facturación deshabilitada. El objetivo es US$0 de infraestructura dentro de las cuotas; superar límites puede interrumpir operaciones o el servicio. Desarrollo, mantenimiento y atención del decanato requieren tiempo. Antes de operar, acordar administración institucional del proyecto y confirmar el acceso de la cuenta inicial.

Cloud Functions y Cloud Storage no forman parte de esta entrega. Las fotografías privadas de QA y piloto se guardan mediante Apps Script en Drive institucional; Firestore conserva su constancia. No se compró dominio ni espacio adicional y no se añadieron dependencias para esta integración. Firebase continúa en Spark sin facturación. Apps Script y Drive tienen cuotas y políticas institucionales; el objetivo de cero gasto adicional no implica disponibilidad garantizada.

## Documentación y verificación

- [Fotografías privadas con Drive y estado de validación](docs/evidencias-drive.md): QA y piloto publicados, servicios y carpetas separados; subida y visor privados comprobados en escritorio.
- [Reportes exportables](docs/reportes-exportables.md): PDF en nueva pestaña, Excel y CSV por año, alcance de los datos y verificación.

- [Arquitectura y mantenimiento](docs/arquitectura.md): módulos, datos públicos e internos, operaciones, límites y recuperación.
- [Protocolo propuesto](docs/protocolo-propuesto.md): recepción, custodia, reclamación, entrega y destinos tras 90 días.
- [Preparación de Firebase](docs/firebase-setup.md): configuración, acceso institucional, reglas y pasos pendientes.
- [Acceso dual y pruebas separadas](docs/acceso-y-pruebas.md): Google, contraseña, roles fijos QA y límites de cada entorno.
- [Campus y ubicaciones](docs/campus-y-ubicaciones.md): nombres oficiales, variantes, filtros y preservación del texto anterior.
- [Alojamiento y evidencia externa](docs/alojamiento-y-evidencia.md): URL de Hosting, costes y custodia de fotografías.
- [Verificación](docs/verificacion.md): pruebas realizadas, resultados y límites de la evidencia.

La revisión de capacidad aprobó **77 pruebas automatizadas de Node**, tipos, lint, build QA y pruebas SDK remotas de consultas, permisos y transiciones. El detalle está en [verificación](docs/verificacion.md).

Una donación ficticia se guardó en QA aunque el navegador perdió la respuesta del commit y mostró conexión no disponible. Se corrigió el reintento para reconocer la misma operación ya persistida sin volver a escribir: compara registro completo, historial, actor, UID y código; solo normaliza la fecha autoritativa del destino nuevo. Otros cambios conservan el aviso de conflicto. El parche anterior se republicó en ambos Hosting. Una nueva donación ficticia desde Decanato cerró el diálogo sin error, mostró Donado y conservó exactamente creación + un evento de donación con fecha del servidor. Esa prueba no forzó otra pérdida de respuesta; la recuperación de ese caso está cubierta por pruebas de lógica y revisión. Las cinco lecturas anónimas de entonces aprobaron antes de la carga de 50 objetos del piloto.

QA tiene paginación, reglas, índices, métricas y fotografías privadas verificados. Para uso con datos reales siguen pendientes la propiedad institucional de Firebase, el protocolo, información al reclamante, conservación de fotos, cuentas operativas y vigilancia de cuotas. La captura en teléfono físico sigue pendiente; no se utilizaron fotografías reales.

Vista previa de los 50 objetos y carga posterior del piloto: [docs/carga-piloto.md](docs/carga-piloto.md).

## Ajuste de consulta de entregados — 3 de octubre de 2026

El catálogo admite objetos disponibles y objetos con entrega registrada, incluso después de archivarlos. Estos últimos muestran **Entregado** y permiten consultar al decanato indicando su código; no ofrecen retiro ni revelan al receptor. También se incluyen las donaciones registradas tras el plazo de 90 días, como Donado. El estado individual aparece únicamente en Ver detalles; las tarjetas no lo muestran. Remisiones, borradores y archivos sin entrega ni donación permanecen fuera del catálogo. La portada cuenta solo disponibles, independientemente de las páginas de consulta.

La ficha pública se construye con una lista explícita de campos permitidos. No incorpora receptor, identificación, comprobación de propiedad, custodia, historial, `evidenceId`, identificadores Drive ni imágenes. La preparación de entregas antiguas se documenta en [Firebase](docs/firebase-setup.md#recuperar-fichas-públicas-de-entregas-históricas). El ajuste está implementado y validado visualmente en QA; esta anotación no declara publicada aún su actualización en el piloto.
