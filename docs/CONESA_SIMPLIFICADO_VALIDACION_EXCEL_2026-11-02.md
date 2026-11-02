# AMBIENTA — Conesa simplificado: revisión contra video y Excel (02/11/2026)

## Propósito
Añadir una variante **nueva y explícitamente experimental** de Conesa simplificado,
sin reemplazar el motor histórico `conesa-1997-2ex` ni su almacenamiento.
Ruta: **Herramientas → Matrices ambientales → Conesa simplificado · revisión**.
La persistencia nueva se aísla por expediente en `ambienta-conesa-simplificado-v1:<id>`.
Abrir la sección no crea ni modifica datos. No se precargan valoraciones de Diablillos.

## Evidencia primaria aportada
1. `Valoración de Impacto Ambiental  método CONESA Simplificado.mp4`: recorrido visual,
   planillas y resultados en el minuto 09:35. **No** se obtuvo una transcripción
   integral de audio, por lo cual la revisión se limita a pantallas y datos.
2. `matriz metodo CONESSA.xlsx`: hojas **CRITERIOS-ALGORITMO** y **EJEMPLO**,
   rango `A5:N9` de esta última. La hoja **MATRIZ PROYECTO** está vacía de
   valoraciones. No se subieron bytes del Excel o video original al repositorio.

### Reproducción de los cinco casos de Excel

| Impacto didáctico | IN | EX | MO | PE | RV | SI | AC | EF | PR | MC | Importancia abs. | Categoría | QA |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Reducción cobertura vegetal | 2 | 2 | 4 | 4 | 1 | 1 | 1 | 4 | 1 | 2 | 28 | Moderado | válido |
| Deterioro paisaje | 8 | 2 | 4 | 2 | 2 | 1 | 1 | 1 | 4 | 4 | 47 | Moderado | válido |
| Contaminación agua por sólidos | 8 | 8 | 4 | 4 | **3** | 1 | 4 | 4 | 2 | 4 | 66 | Severo | **fuera de escala RV** |
| Contaminación aire por partículas | 8 | 1 | 4 | 4 | 1 | 1 | 1 | 4 | 2 | 1 | 44 | Moderado | válido |
| Contaminación suelo por residuos | 12 | 1 | 4 | 4 | 4 | 1 | 4 | 4 | 2 | 1 | 62 | Severo | válido |

Todos los valores se recalcularon a partir de los parámetros de la hoja, sin confiar
en que todas sus celdas estuvieran formuladas: solo `M5` es fórmula;
`M6:M9` son constantes. La fila RV=3 reproduce matemáticamente 66,
pero **contradice los valores 1, 2, 4 declarados en la propia ficha del tutorial**.
No se cambia ni se admite silenciosamente. Una variante diferente podría
admitir 3, pero necesitaría una fuente, versión y QA independientes.

## Especificación informática v1

- Se mantienen **10 criterios base** IN, EX, MO, PE, RV, SI, AC, EF, PR, MC.
- Los recargos `EX_CR` y `MO_CR` son **modificadores independientes 0/+4**,
  no onceavo y duodécimo criterios ambientales: permiten distinguir
  la extensión base del área crítica y el momento base del instante crítico.
- Importancia absoluta:
  `3IN + 2(EX+EX_CR) + (MO+MO_CR) + PE+RV+SI+AC+EF+PR+MC`.
- Resultado con signo: `signo * importancia_absoluta`.
- Solo se devuelve un cálculo si se completaron todos los campos en sus escalas.
  Un recargo crítico requiere texto de fundamento y referencia evidencial.
- Categorías **descriptivas de esta variante**: abs <25 irrelevante;
  25≤abs<50 moderado; 50≤abs<75 severo; abs≥75 crítico.
  La **naturaleza** se conserva por separado: no corresponde interpretar
  un beneficio con gran importancia como contaminación crítica.
- Cuadro de revisión por impacto: valores de criterios, resultados absoluto
  y firmado, categoría y errores/pendientes.
- CSV y JSON incluyen el ID de variante y los valores críticos;
  textos se protegen frente a inyección de fórmulas, números conservan signo.
- No hay conversión entre Conesa anterior y revisado; el usuario debe cargar
  la evaluación en la variante adecuada y consultar sus supuestos.

## Corroboración externa
- DREM San Martín, resolución 035-2024, informe sobre un EsIA que utiliza
  Conesa 2010 y rangos **<25, [25,50), [50,75), ≥75**:
  https://www.dremsm.gob.pe/archivos/rdr/rdr24/rdr35.pdf
- SENACE, observaciones a estudios: confirma necesidad de incluir +4
  para extensión crítica y momento crítico, además de que las escalas deben
  concordar con la edición declarada:
  https://cdn.www.gob.pe/uploads/document/file/2597676/Informe%20N%C2%B0%2000809-2021-SENACE-PE/DEAR.pdf
- EsIA argentino, Conesa 1997, fórmula de importancia:
  https://www.argentina.gob.ar/sites/default/files/eiasrn9sgodelesteroyanexos_0.pdf

Estos ejemplos **no homologan** automáticamente el procedimiento para
la provincia de Salta ni demuestran la validez de una EIA particular.

## QA
Playwright desktop 1366 y 1800: comprueba resultados absolutos y con signo
de cuatro filas conformes, anomalía RV=3 en la quinta, cálculo reactivo
al cambiar criterios, recargo EX_CR +4 aplicado dentro de 2EX,
bloqueo de criticidad sin respaldo, CSV, recarga y almacenamiento aislado.
El caso de prueba se carga en localStorage **solo durante QA** y nunca
se agrega al expediente de producción Diablillos.
