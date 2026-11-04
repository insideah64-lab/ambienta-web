# AMBIENTA · Conesa F3b — Auditoría local de digitalización, F3b-QA1

**Fecha:** 2026-11-04. **Alcance:** control documental/manual de curvas continuas del Anejo 4, no digitalización automática ni habilitación de biblioteca aprobada.

## Fuente y principio metodológico

Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, 3.ª ed. 1997, reimpresión 2000, § 5.3.1–5.3.2 (pp. 113–117) y Anejo 4. La guía presenta formas de calidad ambiental que no son necesariamente lineales y exige justificación por factor y ámbito. Las 27 fichas bibliográficas ya cotejadas permanecen en `ConesaAnnex4Catalog.ts`; no se les asignan automáticamente coordenadas cuantitativas.

La calibración manual sigue el principio de usar **dos referencias numéricas por eje**, identificadas en el gráfico original, y de conservar la procedencia de la extracción. La geometría puede digitalizarse con software especializado fuera de AMBIENTA y pegarse como texto; esta etapa **no incorpora un lector de imágenes** ni promete exactitud subpíxel.

## Protocolo operable en Matrices → Conesa según libro → F3b

1. En una ficha **continua**, conservar la cita exacta y página, vincular el indicador y la unidad en F3b y declarar los nudos finales manualmente. Las fichas con múltiples series, variables categóricas o saltos **no son elegibles** para este modelo de una sola curva continua.
2. Abrir **Auditoría de digitalización · calibración y doble lectura**. Seleccionar la ficha original, registrar el archivo o recorte de evidencia y cuatro pares de referencia: píxel 1 + magnitud 1 / píxel 2 + magnitud 2 del eje horizontal, y píxel 1 + CA 1 / píxel 2 + CA 2 del eje vertical. Los extremos de CA deben permanecer en [0,1].
3. Registrar dos personas lectoras diferentes y pegar sus listas de nudos **en orden creciente**, con filas `magnitud;calidad_ambiental`. Se aceptan coma o punto decimal, pero no separadores ambiguos o valores no finitos. Las lecturas y F3b deben tener de 2 a 24 nudos y la misma longitud.
4. Declarar las tolerancias **abs. M** y **abs. CA** y justificar sus valores según la resolución del gráfico; AMBIENTA **no inventa umbrales universales de aceptación**. Muestra por separado la discrepancia máxima entre lectores y la desviación máxima de cada lector respecto de los nudos F3b.
5. Registrar correspondencia entre indicador, unidad, período, contexto, región y tipo de curva; completar una **tercera revisión** con fecha y dictamen. Los controles impiden registrar la decisión si falta documentación, hay discrepancias superiores a las tolerancias o cambian fuente/página/unidades.
6. Pulsar **Registrar decisión de revisión interna**. Se conserva una huella simple, **no criptográfica**, que vincula el expediente con la versión de la curva. Si se modifica después cualquier dato del expediente o los nudos, la decisión anterior queda **no vigente**.
7. Exportar `JSON` de auditoría. El expediente se conserva en la clave independiente `ambienta-conesa-1997-f3b-auditoria:<projectId>:<factorId>`. Un respaldo inválido se bloquea y permite descargar el texto original sin sobrescribirlo.

## Invariantes y limitaciones deliberadas

- **NO** altera los cálculos `CA_SIN`, `CA_CON` ni `ΔCA` de F3b; los resultados experimentales actuales siguen sometidos a revisión profesional. La constancia de revisión no convierte el cálculo en un resultado certificado.
- **NO** cambia la persistencia de F1, F2, F3a ni F3b. Un expediente de auditoría no modifica los nudos originales ni activa una curva para otros proyectos.
- **NO** sube ni almacena el escaneo, ni digitaliza píxeles o calcula automáticamente incertidumbre estadística. La referencia al recorte y la calibración son declarativas y deben cotejarse con el archivo original.
- **NO** es una firma digital, mecanismo de autenticidad contra manipulación local ni homologación por autoridad ambiental. El identificador `local-v1` es una huella de coherencia interna.
- **NO** hay reutilización de curvas para otros factores/proyectos; su habilitación requiere otra etapa independiente de versionado, revisión y control profesional.
- **NO** se emplea el motor lineal de F3b para codificar saltos o series múltiples; la revisión devuelve bloqueo explícito si se seleccionan esas fichas.
- El sistema obliga a verificar igualdad exacta de **unidad** y de **cita**. No realiza conversiones automáticas ni equipara indicadores sin un dictamen local.

## Arquitectura

- `ConesaF3DigitizationModel.ts` — parser, calibración, validación independiente, métricas de discrepancias, concordancia con nudos, invalidación de decisiones obsoletas.
- `ConesaF3DigitizationAudit.tsx` — expediente de revisión React, lectura/escritura local, degradación segura de documentos dañados, exportación y controles de accesibilidad.
- `ConesaF3DigitizationAudit.css` — contraste legible y foco visible dentro del editor F3b; no requiere una nueva dependencia de componentes.
- Lumen UI fue consultado como referencia de accesibilidad y contratos. No se importa el paquete React, que **no está instalado** en este proyecto, para no introducir una dependencia ajena al alcance de esta etapa.

## Criterios para habilitar una biblioteca de curvas reutilizables en el futuro

Se requerirán un registro de versión inmutable por curva, referencia a la imagen original o respaldo adjunto, un mecanismo de autenticidad auditable (no localStorage), revisión por especialistas, análisis de incertidumbre/escala, compatibilidad local y tests de los datos digitalizados con su fuente. Las 27 fichas del catálogo siguen `pendiente-de-digitalizacion`.

## Pruebas

- `tests/react-v3/conesa-f3b-auditoria.test.mjs` valida números, múltiples lecturas, fechas, calibraciones, discrepancias, bloqueo de variantes incompatibles y obsolescencia de decisiones.
- `v3/overrides/scripts/conesa-f3b-auditoria-smoke.mjs` prueba el formulario en Chromium a 1366 y 1800 px, guarda una revisión local, exporta JSON, modifica un nudo para invalidarla y recupera un respaldo corrupto sin afectar F3b.

**Estado del documento:** revisar CI del PR antes de fusionar o publicar.
