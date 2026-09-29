# Objetos perdidos UCSD · Demo

Demostración local de un catálogo público y un panel del decanato para centralizar la recepción, consulta y devolución de objetos encontrados. Está construida con React, Vite, TypeScript, Material UI, Emotion e iconos de Material UI. El catálogo usa texto e iconos. La evidencia fotográfica de devolución se custodia externamente; la app registra únicamente su referencia interna.

**Es una propuesta para presentar a UCSD, no un servicio oficial.** El modo local utiliza exclusivamente datos ficticios e identidades simuladas. También está preparada la integración del SDK de Firebase para un piloto con identidad Google y permisos institucionales. Tener esa integración en el código no demuestra conexión, seguridad validada ni publicación.

El catálogo y el formulario usan **categoría principal + tipo de objeto controlado**. Hay ocho categorías: Electrónica, Documentos, Llaves, Material académico, Ropa, Bolsos y accesorios, Dinero y Otros. Cada categoría ofrece sus tipos compatibles: por ejemplo, Electrónica → Estuche de audífonos y Material académico → Cuaderno. El tipo permite concretar la búsqueda sin multiplicar las categorías. La lectura adapta clasificaciones anteriores en memoria sin borrar registros, códigos ni historial. Para dinero, el formulario orienta a guardar monto y denominaciones en las características reservadas.

## Filtros y seguimiento

**Hallazgo desde** y **Hallazgo hasta** están siempre visibles tanto en el catálogo como en el panel interno. El rango incluye ambas fechas. **Hoy**, **Este mes** y **Sin fechas** permiten ajustar solo el periodo; **Limpiar filtros** también elimina los demás criterios. Un rango invertido muestra una alerta y no presenta resultados. El hero ya no incluye el texto «Consulta libre, sin cuenta»; la consulta pública sigue disponible sin iniciar sesión.

El panel combina texto, estado, fechas del hallazgo y seguimiento/destino. Las métricas **Donados**, **Documentos remitidos** y **Plazo cumplido · Pendientes de revisión** son totales de los registros cargados, no de la tabla filtrada ni necesariamente de toda la base remota.

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
```

`dev:firebase` utiliza `.env.firebase.local` y el puerto 5174, permitiendo conservar la demo en 5173. Para probar Google, abrir `http://localhost:5174`, cuyo dominio ya aparece autorizado en el proyecto. `build:firebase` genera `dist-firebase/`; `firebase.json` apunta a ese directorio para evitar publicar accidentalmente la demo. Ninguno de estos comandos despliega reglas ni publica Hosting.

## Recorrido de demostración

1. Consultar el catálogo como visitante. Buscar por descripción o código y combinar categoría, tipo, zona y rango de fechas. Abrir una ficha: el lugar del hallazgo y el punto de retiro propuesto son datos distintos.
2. Abrir **Acceso personal** y simular otro correo institucional sin autorización. Comprobar que no puede administrar el catálogo: tener dominio UCSD no concede permisos.
3. Seleccionar **Registro de hallazgos**, crear un registro ficticio y elegir categoría y tipo compatible. Se guarda como borrador; añadir características reservadas para comprobar propiedad. Este rol solo puede consultar sus registros y editar sus propios borradores sin recepción confirmada.
4. Seleccionar **Decanato**, abrir ese registro y confirmar recepción, fecha y ubicación de custodia. Publicarlo; un objeto sin recepción confirmada no puede publicarse. El administrador también puede realizar estas operaciones.
5. Volver al catálogo público y buscar su código. Abrir el detalle y utilizar **Copiar código para consultar**. El botón copia texto; no envía mensajes ni inicia una reclamación.
6. Regresar al decanato, comprobar una característica ficticia de propiedad y registrar la entrega con los datos ficticios solicitados. Verificar que el objeto sale del catálogo disponible y que la entrega permanece en su historial interno.
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

Developer queda por encima de Administrador y no aparece entre los roles asignables. Nadie puede asignarlo, degradarlo, desactivarlo ni editar el documento de acceso de la cuenta reservada desde la app, incluido Developer. La demo añade ese perfil simulado sin borrar otros permisos. En Firebase requiere identidad Google verificada y un documento explícito de acceso activo; conocer el correo no concede permisos. Su alta real y las reglas nuevas todavía están pendientes, sin bootstrap automático. Este rol no concede IAM ni permisos en la consola de Google.

## Entrega con identificación y evidencia externa

El estudiante debe acreditar la propiedad y presentar documento de identidad o carné de estudiante. El personal revisa la identificación presencialmente y toma evidencia de la entrega junto al objeto, según el protocolo que apruebe UCSD. Las nuevas entregas requieren receptor, prueba de propiedad, tipo de identificación verificada y referencia de la fotografía externa, además de la confirmación del operador. La app no solicita número de documento, no toma imágenes, no carga archivos y no guarda la foto. Fecha y responsable quedan en el historial. Los registros anteriores se conservan sin inventar evidencia.

Para una URL pública y la evaluación de fotografías, consultar [alojamiento y evidencia externa](docs/alojamiento-y-evidencia.md). La URL y la asignación Developer real no están activadas por esta ampliación.

## Persistencia y límites

- Los objetos se guardan en `localStorage` bajo `ucsd-lost-found-demo-v1`; los permisos se conservan por separado bajo `ucsd-lost-found-demo-access-v1`. Persisten al recargar mientras el navegador permita guardar datos.
- No se comparten entre dispositivos, perfiles de navegador ni direcciones distintas. El sitio de desarrollo y la vista previa pueden tener datos separados por usar puertos diferentes.
- En modo local, las identidades y roles son una simulación, no un inicio de sesión ni autorización real. Cualquier persona con acceso al navegador puede inspeccionar o modificar su almacenamiento. El código y los datos iniciales también contienen detalles internos ficticios.
- La vista pública omite información reservada, pero esto solo demuestra la presentación. **No introducir datos reales hasta disponer de un backend y controles de acceso verificados.**
- No existe correo, WhatsApp ni formulario de envío integrado. UCSD debe confirmar el contacto, horario, responsables y condiciones de reclamación.

La instalación nueva contiene **37 objetos ficticios**: los 12 originales y 25 ejemplos universitarios; 30 están disponibles, hay dos donaciones y una remisión de ejemplo, y dos casos pendientes de revisión a 90 días. Al abrir una demo existente, se agregan únicamente los ejemplos universitarios cuyos IDs faltan. La carga es idempotente: conserva registros, códigos e historial previos, y no modifica roles. Por eso los totales de una demo ya utilizada pueden diferir de los iniciales. No se transfiere ningún ejemplo a Firebase.

## Firebase preparado y costes

La demo local no necesita Gmail, Firebase ni pagos. El proyecto institucional `ucsd-objetos-perdidos` está comprobado en Spark, **Sin costo · USD0/mes**, sin facturación vinculada. La app **UCSD Objetos Perdidos Web** está registrada, Google aparece **Habilitada** y `localhost` está autorizado. Firestore Standard `(default)` está creado en producción en **`nam5`**; el selector no permitió elegir `us-east1` y no se recreó la base.

Las reglas ampliadas para destinos se publicaron y compilaron el **29 de septiembre, 00:06**. La versión del 28 de septiembre, 23:35, permanece como referencia para rollback. Las cinco comprobaciones anónimas se repitieron y aprobaron después de publicar esa ampliación. La modificación posterior de fuente con Developer y evidencia de entrega aún no se compiló ni publicó en Firestore; no confundir la versión activa con la fuente actual. Las pruebas anónimas no validan permisos autenticados.

Consultar [la preparación de Firebase](docs/firebase-setup.md) para completar el ingreso Google real y preparar después el acceso inicial Developer. Esta computadora tiene los cuatro valores públicos del SDK en `.env.firebase.local`, excluido de Git. En otra computadora se debe recrear desde `.env.example`, establecer `VITE_DATA_MODE=firebase` y completar la configuración de la app web. Utilizar `.env.local` cambiaría también el modo predeterminado; el archivo específico de Firebase permite mantener la demo local separada. Si falta configuración o falla la conexión, no se sustituyen los datos remotos por los ejemplos locales. No se transfieren automáticamente objetos ni permisos locales a Firebase.

La integración exige Google, correo verificado, dominio exacto `ucsd.edu.do` y entrada activa en la lista explícita de autorización. Las reglas de Firestore verifican esos requisitos y las operaciones de cada rol; las restricciones visuales no bastan. `publicItems`, `privateItems` y `access` separan catálogo publicable, registro completo y autorizaciones.

La [comprobación remota anónima](scripts/verify-firebase-public.mjs) aprobó cinco casos de solo lectura:

```powershell
node --env-file=.env.firebase.local scripts/verify-firebase-public.mjs
```

El catálogo público limitado a 500 respondió con 0 documentos; documentos privados, permisos, consulta sin límite y límite 501 se denegaron. Esto no valida permisos autenticados. En el navegador integrado, el popup de Google se cerró y la redirección regresó anónima; Authentication Users sigue vacío. **No hay UID, administrador inicial ni E2E autenticado completado.** Probar el popup en un navegador normal con `http://localhost:5174`; el acceso inicial solo se prepara después de comprobar un UID real. Hosting no está publicado. `origin` está configurado con GitHub; esta entrega se conserva mediante un commit local, sin push.

El piloto propone [Firebase Hosting](https://firebase.google.com/docs/hosting), Firestore y autenticación con Google en [Spark](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans), manteniendo la facturación deshabilitada. El objetivo es US$0 de infraestructura dentro de las cuotas; superar límites puede interrumpir operaciones o el servicio. Desarrollo, mantenimiento y atención del decanato requieren tiempo. Antes de operar, acordar administración institucional del proyecto y confirmar el acceso de la cuenta inicial.

Cloud Functions y Cloud Storage no forman parte de esta entrega. No incluye carga ni almacenamiento de fotografías, compra de dominio o componentes comerciales. Cloud Storage para Firebase requiere Blaze actualmente; se conserva Spark sin facturación y se propone custodia manual de evidencias externas.

## Documentación y verificación

- [Arquitectura y mantenimiento](docs/arquitectura.md): módulos, datos públicos e internos, operaciones, límites y recuperación.
- [Protocolo propuesto](docs/protocolo-propuesto.md): recepción, custodia, reclamación, entrega y destinos tras 90 días.
- [Preparación de Firebase](docs/firebase-setup.md): configuración, acceso institucional, reglas y pasos pendientes.
- [Alojamiento y evidencia externa](docs/alojamiento-y-evidencia.md): URL de Hosting, costes y custodia de fotografías.
- [Verificación](docs/verificacion.md): pruebas realizadas, resultados y límites de la evidencia.

La revisión final del 29 de septiembre aprobó **39 pruebas automatizadas de Node**, análisis estático y ambas compilaciones con comprobación de tipos. Incluye tres regresiones corregidas: confirmar recepción exige fecha y custodia incluso en un borrador; los límites de texto se validan antes de guardar; archivar una entrega conserva sus datos y agrega exactamente un evento al historial. Las comprobaciones previas de la demo cubrieron filtros, permisos simulados, publicación, entrega, retirada pública, destinos, historial, persistencia y presentación móvil. Los datos utilizados son ficticios.

El código de las reglas nuevas con Developer y evidencia está preparado, pero **todavía no se compiló ni publicó en Firestore**. El alta Developer real, el ingreso Google y las operaciones autenticadas requieren verificación antes del piloto. No se publicó Hosting ni se creó almacenamiento de fotografías. Compilar la app y probar roles simulados no sustituye esas comprobaciones.
