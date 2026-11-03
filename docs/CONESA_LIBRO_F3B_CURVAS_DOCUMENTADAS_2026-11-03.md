# AMBIENTA — Conesa F3b: editor de curvas de transformación documentadas

**Fecha:** 03/11/2026. **Estado:** experimental, sujeto a validación CI y revisión profesional. **Continuidad:** issue #64.

## Fuente bibliográfica obligatoria

Vicente Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, 3.ª ed. (1997), reimpresión 2000, pp. impresas 113–117 (§5.3.1–5.3.2) y Anejo 4 desde p. 253. Contraste con el PDF del usuario (páginas de archivo 107–111, 244 y siguientes). Ver especialmente figura 18, p. 115 (PDF p. 109).

La guía describe formas directas/inversas, curvas con extremos intermedios, umbrales y discontinuidades, cuyo uso debe justificarse por indicador, territorio y datos. No presume una curva única para todos los ambientes. El Anejo 4 contiene ejemplos y advierte diferencias entre criterios que asignan CA=0 y CA=0,5 en el límite de tolerancia: no pueden mezclarse inadvertidamente sin justificar coherencia.

La magnitud neta normalizada se obtiene con **CA_CON − CA_SIN**, después de evaluar cada magnitud por separado. No se debe calcular **f(M_CON − M_SIN)** para una curva genérica.

## Contrato técnico entregado

- **F3a preservado:** la clave `ambienta-conesa-libro-1997-f3a:` permanece intacta, incluyendo la función lineal, fechas, mediciones y fuentes existentes. No se reescriben sus registros.
- **F3b separado:** esquema `ambienta.conesa-libro-1997.curvas-documentadas.f3b`, clave `ambienta-conesa-libro-1997-f3b:`, por proyecto y factor.
- **Selección reversible por factor:** la persona elige F3a lineal o F3b por tramos. Una F3b incompleta impide todo cálculo en modo F3b y **no usa F3a como reemplazo oculto**.
- **Fuente exigida:** documento/edición o acta, tipo de origen (Anejo 4, estudio externo, panel), página impresa si procede, ámbito de aplicación, responsable de revisión y evidencia de reconstrucción.
- **Puntos:** 2 a 24 pares M,CA (0≤CA≤1), magnitudes finitas estrictamente crecientes y sin duplicados. Interpolación lineal **solamente entre nudos aportados y dentro del dominio**. No se extrapola, no se resuelven saltos/discontinuidades ni se reconstruye automáticamente un original gráfico.
- **Dependencia de F3a:** reutiliza el indicador, la unidad, las magnitudes SIN/CON, fechas y fuentes que haya declarado la persona en F3a. Si se cambia indicador/unidad se invalida la vinculación; reiniciar la curva exige acción explícita, con aviso de respaldar los puntos.
- **Exportación:** JSON F3b independiente, CSV comparativo rotulado según función realmente usada y tabla visual con procedencia. Si la clave F3b está dañada, se conserva su contenido en bruto y se ofrece una descarga sin sobrescribirlo.
- **Visualización:** la vista conserva escala CA 0–1, diferencias y etiquetas SIN/CON medido/estimado; incorpora el método usado en la tabla exacta.

## Exclusiones deliberadas

No está implementada una biblioteca de curvas digitalizadas automáticamente, ni aproximaciones de umbrales discontinuos, ni funciones continuas de otra forma matemática (polinomios, sigmoides, exponenciales), ni validación normativa local, incertidumbre probabilística, ni el cálculo integral Vj/IAj/UIP o impacto total. Los puntos ingresados **no deben atribuirse numéricamente a Conesa** sin comparación documental y juicio experto de lectura. En caso de duda, resultado pendiente.

## Pruebas y criterio de aceptación

`tests/react-v3/conesa-libro-f3b.test.mjs` y `v3/overrides/scripts/conesa-libro-f3b-smoke.mjs`:
- Calidad SIN/CON y diferencia exacta con curvas crecientes, decrecientes y un máximo intermedio.
- Nulos, valores no finitos, puntos duplicados, CA fuera de [0,1], cambios de unidad, documentación insuficiente, fechas inválidas y magnitudes fuera del dominio.
- Cambio F3a ↔ F3b sin modificación de F3a; exportación, persistencia tras recarga, respaldo dañado y dos anchos de escritorio.
- Pantalla inicial sin curvas inventadas ni valores precargados.

**No fusionar sin CI íntegramente verde ni publicar antes de validación.**
