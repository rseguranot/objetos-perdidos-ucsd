# Campus y lugares del hallazgo

El selector toma los lugares de la [guía oficial para estudiantes de UCSD](https://www.ucsd.edu.do/estudiantes/), consultada el 29/09/2026. La guía enumera 16 puntos; el punto 11 reúne EFV y ECL. La herramienta los separa en dos opciones, por lo que ofrece **17 lugares oficiales y «Otro lugar del campus»**. No se añaden siglas a los lugares que la guía no identifica con ellas.

| Lugar mostrado | Sigla de la guía |
|---|---|
| Biblioteca Octavio Cardenal Beras Rojas | — |
| Edificio La Altagracia | EAL |
| Edificio Inmaculada | EIN |
| Edificio Pedro de Córdova | EPC |
| Edificio de Rectoría | — |
| Edificio de Postgrado | — |
| Edificio Administrativo | — |
| Centro de Investigación y Ciencias de la Familia | — |
| Centro de Rehabilitación | — |
| Edificio Santa Catalina | ESC |
| Edificio Francisco de Vitoria | EFV |
| Edificio Nicolás de Jesús Cardenal López Rodríguez | ECL |
| Cafeterías | — |
| Piscina Universitaria | — |
| Helados Bón | — |
| Escuela de Graduados de Odontología | — |
| Parroquia Universitaria Santa María de la Anunciación | — |

## Variaciones y compatibilidad

La guía escribe **Pedro de Córdova** y **Francisco de Victoria**. La [noticia oficial de inauguración de espacios académicos](https://www.ucsd.edu.do/universidad-catolica-santo-domingo-inaugura-espacios-academicos/) usa **Pedro de Córdoba** y **Francisco de Vitoria**. El selector mantiene Córdova para EPC y Vitoria para EFV; reconoce las otras grafías como alias, sin crear edificios adicionales. No pretende resolver la nomenclatura institucional definitiva.

También reconoce las siglas publicadas, «Biblioteca» y «Cafetería». La comparación ignora mayúsculas y acentos y exige coincidencia del nombre o alias completo antes del separador ` · `. No deduce un edificio por una coincidencia parcial dentro de una descripción.

## Registrar y consultar

El formulario separa **Edificio o lugar**, obligatorio, de **Aula o lugar específico**, opcional. Se guarda el mismo campo textual `foundLocation`, por ejemplo:

```text
Edificio La Altagracia (EAL) · Aula 206
```

«Aula 206», «Entrada principal» y los otros detalles de las semillas son **ejemplos ficticios**. No son un inventario verificado de aulas ni ubicaciones de hallazgos reales. El lugar del hallazgo sigue siendo distinto de la custodia y del punto de retiro.

Catálogo y panel tienen filtro por edificio. Un nombre anterior desconocido se conserva como ubicación anterior: no se asigna a un edificio inventado y sigue visible cuando no se limita el edificio. Si se edita otro dato sin cambiar esa ubicación, se conserva su texto previo. Seleccionar un edificio conocido convierte expresamente la ubicación al formato nuevo.

## Datos y estado de entrega

Este cambio organiza texto y filtros del frontend; no crea campos remotos, colecciones, reglas ni una migración automática. Las nuevas semillas de 37 ejemplos utilizan los nombres del campus con detalles ficticios. Los registros anteriores no se reescriben automáticamente.

La actualización de ejemplos QA se limita a IDs conocidos en borrador o disponible, conserva historial y actualiza conjuntamente la proyección pública cuando corresponde. Los registros cerrados y ubicaciones antiguas quedan preservados. El piloto institucional sigue sin objetos.

La revisión del 29/09 aprobó 57 pruebas, lint y las tres compilaciones con tipos. Ambos Hosting publicaron esta versión; HTML y assets recuperados por HTTP coincidieron con las compilaciones locales. El SDK actualizó 30 ejemplos QA editables y preservó siete cerrados, sin objetos en el piloto ni cambios de reglas.

En UI QA, el catálogo filtrado por EAL y búsqueda «EAL 206» devolvió dos resultados; el panel mostró los mismos dos. El formulario guardó un nuevo borrador ficticio con EAL y Aula 206. Recarga y edición recuperaron el edificio y «Aula 206» exactos; el registro de prueba quedó archivado con historial conservado. QA cerró con 60 privados y 28 públicos. Roles del piloto con Developer mostró formulario y tabla sin introducción, avisos técnicos ni tarjetas explicativas.

El DOM a 390 píxeles no desbordó horizontalmente; la captura móvil integrada es evidencia complementaria, no una validación visual completa ni prueba en teléfono físico. Capturas locales: `evidence/campus-filtro-eal.png`, `evidence/campus-movil.png` y `evidence/roles-compacto-publicado.png`. Ver [resultados fechados](verificacion.md).
