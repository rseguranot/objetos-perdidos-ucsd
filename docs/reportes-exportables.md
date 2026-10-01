# Reportes exportables

Desde Gestión, «Descargar reporte» permite elegir el año y el formato. La tabla mensual ya no ocupa el panel. PDF abre una pestaña de visualización; Excel y CSV descargan `ucsd-reporte-AÑO.xlsx` o `.csv`.

Los tres formatos incluyen doce meses y total anual de hallazgos, entregas, donaciones y remisiones. Utilizan las métricas completas existentes, independientes de la página y filtros visibles. Registro exporta «Mis registros»; los otros perfiles autorizados exportan «Todos los registros». No se incluyen custodias, características reservadas, receptores ni evidencia fotográfica. Los botones se deshabilitan mientras falta el reporte del año elegido.

PDF se genera con pdf-lib 1.17.1 y Excel con ExcelJS 4.4.0, versiones aprobadas y fijadas en npm/lockfile. Se cargan bajo demanda al exportar. No hay servicios externos, nuevas escrituras de Firestore ni almacenamiento de archivos en Firebase. El navegador puede requerir permitir la nueva pestaña PDF; sus preferencias de PDF determinan si muestra el visor integrado.

La revisión del 01/10/2026 aprobó 80 pruebas, tipos, lint y compilación Firebase. Las pruebas de exportación verifican CSV con BOM, doce meses y totales, XLSX reabierto con cantidades numéricas y PDF A4 válido con título anual. La interfaz local se revisó en computadora y viewport móvil de 390 px, sin errores de consola. La inspección automatizada del visor PDF quedó bloqueada por la política del navegador para direcciones blob; no se declara esa inspección visual como aprobada.

`npm audit` detectó seis entradas: cuatro altas en la cadena Firebase/gRPC existente y dos moderadas por ExcelJS/uuid. ExcelJS usa uuid v4; la advertencia de uuid corresponde a otras funciones (v3/v5/v6 con buffer). No se aplicó `audit fix --force`, que proponía cambios de versiones ajenos al alcance. Revisar estas dependencias antes de una entrega institucional.

Referencias: [pdf-lib](https://pdf-lib.js.org/), [ExcelJS](https://github.com/exceljs/exceljs), [aviso uuid](https://github.com/advisories/GHSA-w5hq-g745-h8pq).

Hosting se publicó primero en QA y luego en el piloto el 01/10/2026. En ambos se comparó el HTML publicado con su compilación y se confirmó el botón de reporte en el recurso AdminPanel servido. No se modificaron reglas, índices ni registros de Firestore. Las tres compilaciones (demo, QA y piloto) aprobaron. La generación Excel desde UI terminó sin error, pero no se confirmó el archivo descargado en disco; su contenido se verificó en pruebas de reapertura. CSV quedó validado por pruebas de contenido, sin confirmar una descarga de extremo a extremo.
