# Protocolo propuesto de objetos perdidos UCSD

Documento para discusión con la universidad. **No constituye una política oficial ni establece obligaciones aprobadas por UCSD.** La demostración utiliza únicamente objetos, personas y pruebas de propiedad ficticios.

## Responsables y recepción

Bedeles, mantenimiento, seguridad y otras áreas canalizan los hallazgos al Decanato de Estudiantes. El decanato centraliza recepción, custodia, publicación y reclamación, evitando que el estudiante tenga que recorrer varias oficinas. El personal de otras áreas puede registrar hallazgos si recibe autorización explícita.

| Rol | Responsabilidad propuesta |
|---|---|
| Registro de hallazgos (`registro`) | Crear borradores y editar sus propios borradores sin recepción confirmada; consultar únicamente sus registros internos |
| Decanato (`decanato`) | Registrar y editar, confirmar recepción y custodia, publicar, comprobar propiedad, entregar, archivar y documentar destinos autorizados |
| Administrador (`admin`) | Gestionar autorización individual y roles, además de realizar las operaciones del decanato |
| Developer (`developer`) | Todas las operaciones del administrador y custodio, reservado a `rsegura20250554@ucsd.edu.do`; no asignable ni editable desde el gestor |

El correo institucional por sí solo no otorga un rol. Un administrador asigna autorización activa; el visitante y la identidad sin permiso pueden consultar el catálogo público.

Al registrar un hallazgo, el personal autorizado selecciona categoría principal y tipo compatible, además de descripción general, fecha y zona del hallazgo. Las ocho categorías son Electrónica, Documentos, Llaves, Material académico, Ropa, Bolsos y accesorios, Dinero y Otros. Los tipos controlados concretan el objeto dentro de cada categoría y facilitan la búsqueda.

El decanato registra internamente fecha de recepción, ubicación de custodia y características particulares para validar propiedad. Se propone documentar también el área que remitió el objeto cuando corresponda; la implementación final deberá incorporar los campos operativos que UCSD confirme.

El registro comienza como **borrador**. Solo pasa a **disponible** cuando se confirma recepción y se registra fecha y custodia. Publicar un hallazgo todavía no recibido podría dirigir al estudiante a una oficina que no lo tiene.

## Consulta y reclamación

El catálogo público permite consultar sin cuenta. Publica código, nombre, categoría principal, tipo de objeto, descripción general, fecha y zona del hallazgo. La ficha distingue dónde se encontró de dónde se propone retirarlo.

Las fechas **Hallazgo desde/hasta** permanecen visibles para facilitar la consulta. El periodo incluye sus extremos; Hoy, Este mes y Sin fechas lo ajustan, y Limpiar filtros retira los demás criterios. El panel interno añade filtros de estado, texto y seguimiento/destino. Son herramientas de consulta, no modifican la custodia.

No publicar nombres, matrículas, contenido de documentos, números de tarjetas ni características reservadas que permitan acreditar propiedad. Para documentos identificables, usar una descripción genérica y verificar la identidad presencialmente según el procedimiento que apruebe UCSD.

Para dinero, proponer una descripción pública genérica y conservar internamente monto, moneda, denominaciones y forma del hallazgo como elementos de comprobación. La descripción es texto libre; esta orientación no oculta automáticamente datos que el personal escriba en ella. UCSD deberá acordar además su procedimiento de custodia y devolución.

El estudiante consulta al decanato indicando el código. Ese código identifica el registro; no demuestra que el objeto le pertenece. Antes de entregar, el personal verifica una característica no publicada o una prueba proporcional al tipo de objeto. La demo permite copiar el código, pero no envía mensajes.

Para el retiro, el estudiante presenta un documento de identidad o su carné estudiantil, además de demostrar la propiedad. El personal verifica visualmente la identificación; el registro guarda solo el tipo presentado, sin solicitar su número ni guardar una fotografía del documento.

### Secuencia de devolución propuesta

1. Localizar el registro por su código y comprobar la propiedad mediante características reservadas o una prueba aportada.
2. Revisar presencialmente documento de identidad o carné de estudiante y consignar su tipo.
3. Explicar al receptor el uso, responsables y conservación de la fotografía de evidencia según lo que apruebe UCSD.
4. Documentar la devolución con una fotografía de evidencia de la entrega junto al objeto; evitar incluir el documento identificativo, su número y personas ajenas.
5. Seleccionar entre una y tres imágenes desde la app. Revisar la vista previa ampliada y confirmar la entrega; el servicio las guarda en Drive institucional privado.
6. Consignar receptor, comprobación de propiedad y tipo de identificación. Confirmar esos pasos y registrar la entrega: cambia a Entregado en el catálogo, con fecha, responsable y fotografías exclusivamente internos.

El servicio comprueba la subida antes de confirmar la entrega y vincula su constancia privada al objeto. Las entregas antiguas conservan referencias externas sin exigir fotografías retroactivas. UCSD debe definir permisos, plazo de conservación, atención a solicitudes y situaciones excepcionales antes de utilizar fotos reales. La propuesta de 90 días para objetos no define el plazo de conservación de fotografías.

La ausencia de coincidencias significa que no hay un registro público que coincida; no permite asegurar que nadie encontró el objeto. Se orienta al estudiante a consultar al decanato.

## Custodia, entrega y archivo

- Guardar cada objeto en una ubicación interna identificada y mantener actualizado su registro.
- Registrar la devolución después de verificar propiedad: constancia mínima del receptor, evidencia de validación, fecha y personal responsable. En la demo, todos esos datos deben ser ficticios.
- Cambiar a **entregado**: deja de contar como disponible, pero su ficha permanece consultable para posibles reclamaciones. No publicar quién lo recibió ni sus fotografías.
- Usar **archivado** para cerrar un registro interno por una razón documentada. Si tuvo entrega, su ficha pública conserva el estado Entregado. Una donación registrada tras el plazo conserva su ficha como Donado. Esos estados se muestran al abrir Ver detalles. Archivar no equivale a devolver el objeto ni autoriza desecharlo.
- Mantener historial de registro, correcciones y cambios de estado. La demo ilustra esa trazabilidad; su almacenamiento local es modificable y no constituye una auditoría confiable de producción. La integración Firebase preparada conserva historial e identidad de cada operación; necesita verificaciones reales antes de operar.

## Propuesta de revisión a 90 días y destino final

Se propone revisar objetos no reclamados después de **90 días calendario desde la fecha de recepción confirmada**, al inicio del día 90 en Santo Domingo (UTC−4). La idea parte de la referencia del Metro indicada por el usuario; no se adopta como base jurídica ni como política de UCSD. El plazo no produce caducidad de reclamaciones, pérdida automática de derechos, archivo ni donación automáticos.

La universidad debe aprobar expresamente las condiciones de disposición. La demo permite a Decanato o Administrador documentar un traslado manual ya autorizado y completado, con estos destinos:

- **Documentos:** remisión a la institución emisora, registrando receptor y constancia de recepción.
- **Otros objetos, excepto dinero:** donación de un objeto en buen estado a una organización sin fines de lucro, con receptor y constancia.
- **Dinero:** mantiene seguimiento como pendiente de revisión cuando cumple el plazo, pero no permite donación ni remisión. Requiere un protocolo especial que UCSD debe definir.

El formulario exige destinatario, referencia/constancia y confirmación expresa del traslado autorizado y completado. No realiza una donación ni envía documentos por sí mismo. Un objeto ya devuelto o con destino registrado no permite otro destino.

El registro queda **archivado** con destino interno e historial conservado. Los estados siguen siendo borrador, disponible, entregado y archivado; «Donado» y «Remitido al emisor» son etiquetas derivadas. El archivo común no documenta ni cuenta como donación. Un archivado sin entrega ni destino puede completarlo después si cumple los requisitos. Una vez documentado el destino, la app impide reescribirlo o retirarlo; los eventos anteriores permanecen.

En Firebase, las métricas de donados, documentos remitidos y pendientes a 90 días usan conteos independientes de las páginas de 25; filtrar la tabla no cambia esos totales. En la demo local, los conteos corresponden a los objetos almacenados en ese navegador.

## Acuerdos pendientes antes de operar

UCSD debe confirmar el responsable del servicio y sus suplentes, autorización del personal, canal de contacto, horarios y punto de retiro. También debe definir lugares de custodia, tratamiento de objetos de valor o sensibles, plazo de conservación, destino de objetos no reclamados y conservación de datos e historial.

Para un piloto real, acordar administración institucional de la infraestructura, identidad Google y lista explícita de personas autorizadas. La integración preparada exige proveedor Google, correo institucional verificado y permiso activo. Verificar esos requisitos y los límites de cada rol directamente contra las reglas del backend, separar información publicable de información reservada y revisar cuotas del plan gratuito sin habilitar facturación. La cuenta institucional de preparación no sustituye estas decisiones.

El proyecto Firebase institucional ya está creado en Spark; eso no prueba conexión de la herramienta, permisos efectivos ni publicación. La [guía de Firebase](firebase-setup.md) describe configuración, administrador inicial y comprobaciones pendientes. En la demo local, identidades, objetos y permisos siguen en el navegador; no se sincronizan ni se transfieren automáticamente al proyecto.

Hasta completar esos acuerdos y las comprobaciones de seguridad, utilizar únicamente datos ficticios. No restablecer objetos ni permisos como parte de preparar el piloto: preservar el trabajo local y decidir por separado cualquier migración necesaria.
