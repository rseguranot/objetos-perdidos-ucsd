# Servicio privado de fotografías

`Code.gs` y `appsscript.json` se instalan en proyectos Apps Script distintos para QA y piloto, propiedad de `rsegura20250554@ucsd.edu.do`. Publicar como aplicación web ejecutada por la propietaria. El acceso del endpoint permite invocación anónima para que HTMLService funcione incrustado; todas las operaciones de datos exigen un token Firebase verificado y un permiso activo. No habilitar facturación.

## Configuración

Propiedades del script (no añadir credenciales ni IDs reales a Git):

| Propiedad | Valor |
|---|---|
| `PROJECT_ID` | Proyecto Firebase correspondiente al entorno |
| `API_KEY` | API key pública Firebase de ese mismo proyecto |
| `FOLDER_ID` | Carpeta Drive privada, sin lectores ni editores adicionales |
| `OWNER_EMAIL` | `rsegura20250554@ucsd.edu.do` |
| `ALLOWED_ORIGINS` | Array JSON de orígenes exactos HTTPS de la app; localhost solo para QA |
| `QA_USERS` | Solo QA: objeto `{correo: {uid, role}}` con las identidades ficticias fijas de las reglas |

La propietaria autoriza una vez los scopes declarados. Su identidad OAuth requiere permiso IAM de lectura/escritura de datos Firestore (`roles/datastore.user`) en el proyecto elegido y la API de Firestore disponible. No se necesita clave privada de cuenta de servicio. No compartir el OAuth token del propietario con el navegador. El permiso IAM evita las reglas del cliente; los controles de este servicio son la frontera de autorización.

## API del puente

`doGet` recibe `origin` y `nonce` (solo configuración de conexión, nunca tokens). HTMLService responde `ready` con nonce; el origen exacto, ventana emisora y nonce se comprueban en ambos extremos.

Mensajes desde la app: `{kind:'request', nonce, requestId, idToken, action, payload}`. Respuestas: `{kind:'response', nonce, requestId, ok, result?, error?}`. `dispatch({idToken, action, payload})` no registra entradas, fotografías ni tokens en logs.

- `deliver`: `{itemId, operationId, expectedHistoryId, delivery:{recipient,proof,identityType}, photos:[{base64,mimeType:'image/jpeg',size,width,height}]}` → `{itemId,evidenceId}`. El tamaño y dimensiones enviados no se consideran fiables. Entre 1 y 3 JPEG de hasta 1 MB (1.000.000 bytes), máximo 1600 px por lado, sin segmentos de metadatos EXIF/ICC/IPTC/comentarios. Se comprueban firma, segmentos y dimensiones; no se sustituye por un decodificador de imagen completo en GAS.
- `list`: `{cursor?:string|null}` → `{items:[{id,itemId,code,title,deliveredAt,photoCount}],cursor:string|null}`. 25 constancias por página; consulta 26 para detectar la siguiente. El cursor debe reenviarse sin modificar.
- `view`: `{evidenceId}` → `{photos:[{base64,mimeType,size,width,height}]}`. Los IDs de Drive no se aceptan desde la app y no salen de esta respuesta.

Todos los roles activos pueden listar y ver evidencias. Solo Developer, Administrador y Decanato pueden entregar. Las constancias no incluyen receptor, prueba de propiedad, custodia ni características privadas.

## Entrega, reintentos y recuperación

Cada operación usa SHA-256 de UID+operationId. La huella incluye objeto, versión de historial, entrega y fotografías. Cambiar la carga conservando operationId produce conflicto. Un reintento completado recupera la evidencia existente sin duplicar Drive ni Firestore.

`evidenceOperations` conserva pendientes y archivos creados. Los nombres deterministas permiten recuperar un archivo cuyo ID no llegó a guardarse por una interrupción. Un bloqueo de script serializa entregas y mantenimiento, acorde al volumen previsto. Nunca se confirma entrega antes de guardar todas las fotos.

Después de subir, el servicio revalida la identidad y usa una transacción Firestore que lee acceso, objeto y operación. El commit incluye objeto entregado, historial, fecha local para métricas, eliminación pública, constancia y operación completada. La lectura transaccional de acceso protege frente a revocación concurrente; las precondiciones updateTime y expectedHistoryId protegen cambios del objeto.

No hay una transacción conjunta Drive/Firestore: si falla Firestore pueden quedar archivos pendientes privados. `cleanupPending_` es mantenimiento manual exclusivo del editor, no invocable con `google.script.run`: procesa hasta 25 operaciones pendientes/abandonadas de más de 7 días. Antes de mandar fotos a la papelera verifica que no exista constancia ni entrega vinculada. Conserva la operación como limpiada, no borra evidencias completadas. No instalar un trigger automático sin acordarlo.

Si la subida pierde la respuesta, conservar operationId y la carga exacta para reintentar. Un conflicto de versión exige recargar el objeto y una operación nueva. Error de cuotas o conexión no significa entrega completada.

## Verificación y limitaciones

Las pruebas Node ejecutan las funciones del servicio con GAS simulado, sin red ni fotografías reales. El gate real del iframe, autorización propietaria, IAM, carpeta privada, subida y transacción deben validarse además en QA antes de publicar el piloto. No confundir pruebas del mock con disponibilidad real del despliegue.

Apps Script y Drive están sujetos a cuotas y política de UCSD. El servicio devuelve mensajes seguros sin cuerpos de error de Google, tokens ni información interna. No se activa facturación ni un servicio Cloud facturable. Conservar evidencias completadas sin borrado automático; antes de fotos reales acordar información al reclamante y retención institucional.
