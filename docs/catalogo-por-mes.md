# Consulta del catálogo por mes

El catálogo para estudiantes permite elegir Año y Mes. Al abrirlo selecciona el mes actual según la zona America/Santo_Domingo. El año permite escribir para localizar una opción.

La consulta conserva los filtros de texto, categoría, tipo y edificio, y envía a Firestore el primer y último día del mes elegido como límites inclusivos de foundDate. También se aplica a la demo local y a todas las páginas siguientes. Cambiar el período vuelve a la primera página; Limpiar filtros restablece el mes actual.

Los filtros de fecha de Gestión no cambian. Los registros y las métricas históricas se conservan; el período elegido solo limita la consulta pública.

Pruebas de calendario en tests/catalog-period.test.ts: febrero bisiesto y común, diciembre, mes completo y cambio de mes/año entre UTC y Santo Domingo. La actualización de estados y donaciones terminó antes de publicar este ajuste. Este cambio no requiere reglas, índices, migraciones ni dependencias nuevas.

Validación local: compilación de pruebas, tipos y lint correctos; 108 pruebas aprobadas. En navegador se comprobó el valor inicial Octubre/2026, selección de 2025, septiembre en dos páginas y restablecimiento del mes actual. La vista local consultó datos ficticios de QA; no se publicó Hosting ni se modificaron registros. Captura: evidence/catalogo-mes-actual.png.

Publicación completada en QA y piloto el 3 de octubre de 2026: 113 pruebas aprobadas, lint y ambas compilaciones con tipos correctos. Se corrigió únicamente la declaración del tipo de fields en la prueba nueva de migración de donaciones, que impedía compilar. Solo se desplegó Hosting; no hubo cambios de datos, reglas, Apps Script o facturación en esta publicación. Ambos dominios del piloto coinciden con dist-firebase/index.html. Navegador público: inicio en Octubre/2026, consulta de Septiembre/2026 con 25 registros, consola sin errores y Limpiar filtros de vuelta a octubre. Captura: evidence/catalogo-mes-publicado.png. Logs: evidence/deploy-mes-qa.log y evidence/deploy-mes-piloto.log.

Períodos permitidos: desde enero de 2022 hasta el mes actual de Santo Domingo. El año actual ofrece solo meses hasta el actual; los años anteriores ofrecen los doce meses. Al pasar desde diciembre de un año anterior al actual, se ajusta automáticamente al mes actual. No se permite seleccionar años futuros ni anteriores a 2022. Pruebas adicionales cubren esos límites, el cambio de año y enero de un nuevo año.

Restricción publicada y validada en QA y piloto: 115 pruebas, lint, tipos en ambas compilaciones y Hosting correctos. Navegador del piloto ofrece años 2026–2022 y meses enero–octubre para 2026; QA comprobó diciembre de 2025 y ajuste automático a octubre al seleccionar 2026. Consola del piloto sin errores. Captura: evidence/periodos-validos-piloto.png. No se modificaron registros ni permisos.
