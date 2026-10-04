# Ejemplos de octubre de 2026

Se añadieron 24 objetos ficticios disponibles al piloto: tres por cada categoría (Electrónica, Documentos, Llaves, Material académico, Ropa, Bolsos y accesorios, Dinero y Otros). Fechas del 1 al 4 de octubre. El catálogo de octubre muestra 25 objetos contando el ejemplo anterior.

El manifiesto `buildMonthlyExamples` usa IDs estables `demo-month-2026-10-0001` a `0024`, conserva edificio en el filtro y detalles del lugar en descripción. La importación requiere proyecto y fecha explícitos, OAuth local del propietario Developer activo/verificado y facturación deshabilitada. Por defecto simula; `--apply` crea registros privados y proyecciones públicas con índices en un solo commit Firestore, siempre con precondiciones `exists: false`. No sobrescribe datos ni recrea fichas de objetos que ya hayan sido entregados. El manifiesto previo queda en evidence, excluido de Git.

Comprobación: tipos, lint y 116 pruebas aprobados. Simulación previa: 24 nuevos, tres por categoría. Aplicación: 24 creados. Repetición: cero nuevos y 24 conservados. Navegador del piloto: las ocho categorías muestran los tres ejemplos nuevos; Electrónica además conserva el ejemplo anterior. Consola sin errores. Captura: evidence/objetos-octubre-publicados.png. No fue necesario desplegar Hosting: la app consulta los datos desde Firebase.
