# MITA NDVI: recorte por polígono — continuidad 2026-11-05

Estado: implementación local comprobada; pendiente CI del nuevo PR. No fusionar ni desplegar. Continúa el HOLD documental del handoff original.

Base pública verificada: `f9c2a634487fba95994d63504c32cfdce239e66f`, PR #90. Nueva rama: `feature/mita-ndvi-poligono-2026-11-05`. El nuevo PR depende de #90. El historial previo y main no se reemplazan.

## Comportamiento visible

En MITA satelital se puede elegir **Usar polígono guardado** o importar un GeoJSON WGS84 con un único Polygon/MultiPolygon. Se conservan huecos y partes separadas. La selección es una copia para el trabajo: no modifica el perímetro, su fuente ni sus respaldos. El período sigue siendo editable; cambiarlo invalida la búsqueda anterior. Para volver al modo previo existe **Usar solo ventana rectangular**.

Los límites visibles se ajustan a la extensión del polígono y permanecen de solo lectura mientras la máscara está seleccionada. El exterior y los huecos quedan sin datos y transparentes en la vista previa. El GeoTIFF conserva una grilla rectangular georreferenciada, con nodata en las zonas excluidas. Se consideran los centros de píxel; no se reparan ni simplifican contornos automáticamente. Límite del piloto: 180 KB por archivo, 2.000 posiciones y extensión de hasta 0,1° por lado. No cambia la fórmula NDVI.

Las estadísticas y el porcentaje principal corresponden al polígono. La ficha de revisión mantiene además los porcentajes respecto de la ventana y del ráster, con sus denominadores explícitos. La geometría del trabajo vuelve a cargarse al abrir su URL. El historial evita descargar repetidamente todas las geometrías.

## Evidencia y resultados

| Comprobación | Estado | Resultado |
|---|---|---|
| Unitarias web | PASS | 266 pruebas |
| Compilación y TypeScript | PASS | Build local satisfactorio; advertencias preexistentes de assets/tamaño |
| Playwright, ambas demos a 1366/1800 | PASS | Descargas reales con servidor fixture, recarga, revisión explícita, importación y rechazo de geometría inválida, invalidación al cambiar fecha y retorno al rectángulo |
| Escena satelital real | PASS | `S2B_T20JKT_20250529T143737_L2A`; polígono sintético cóncavo con hueco en el piloto Salta |
| GeoTIFF/JSON descargados | PASS | SHA-256 coincidente; geometría conservada; lectura independiente de cada centro de píxel y recálculo de estadísticas |
| Resultado numérico | PASS | Grilla 52 × 57, EPSG:32720; 2.029 píxeles válidos en polígono; 935 píxeles de grilla excluidos; mínimo 0,006998, promedio 0,509690, máximo 0,825769 |
| Persistencia e histórico | PASS | Recarga conserva máscara; informe rectangular anterior idéntico; almacenamiento previo sin cambios |
| Revisión visual | PASS | Capturas completas y del panel a 1366 y 1800 abiertas y revisadas; exterior y hueco transparentes visibles |
| CI del nuevo PR | NOT_RUN | Consultar cierre y enlaces de ejecución en el PR; este documento registra el estado al crear el commit |
| Publicación/Pages | NOT_RUN | No fusionado ni desplegado, por HOLD vigente |
| Validación ambiental del emplazamiento | NOT_RUN | Geometría sintética de QA; no representa DEMO-001 ni acredita un límite oficial |

La primera prueba real detectó FAIL en la conexión entre búsqueda y máscara: la consulta de catálogo recibía un parámetro de geometría no admitido. Se corrigió la separación entre consulta por extensión y máscara del resultado, y se agregó una regresión con firma estricta. Reprueba: PASS. No se atribuye este fallo a React ni a la red.

Capturas del flujo reproducible en CI: artefacto `ambienta-matrices-handoff-qa`, carpeta `qa/ambienta-ndvi/`. Evidencia real local entregada en `AMBIENTA_NDVI_Poligono_QA.zip`: cuatro capturas, TIFF, JSON, PNG, verificaciones y geometría sintética de entrada, con manifiesto SHA-256. Conservar esa entrega junto a este handoff. La prueba real y las fixtures están diferenciadas.

Pendientes: completar CI de los dos PR dependientes, revisión antes de integración, despliegue autorizado del servicio, visor georreferenciado y series temporales. Contaminantes criterio continúan fuera de esta etapa. No se gastaron créditos TinyFish ni vidIQ.
