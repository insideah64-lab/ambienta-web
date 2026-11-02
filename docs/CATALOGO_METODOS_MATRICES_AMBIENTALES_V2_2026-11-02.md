# AMBIENTA — catálogo de matrices ambientales V2 (02/11/2026)

## Arquitectura

En Herramientas → Matrices ambientales se distinguen los MÉTODOS,
las ETAPAS de un EsIA y las VISTAS que cada método puede ofrecer.
Impactos sigue siendo el registro documental del expediente.

No existe una fórmula universal que permita comparar directamente
las puntuaciones de Leopold, Conesa, RIAM o Battelle.

## Métodos y disponibilidad

1. Identificación causa–efecto: acciones × factores, signos beneficioso
   o perjudicial, interacción expresamente ausente y celda no evaluada.
   Se mantiene el editor de AMBIENTA V1.
2. Leopold (USGS, 1971): magnitud e importancia independientes de
   1 a 10 y signo. Su ponderación exploratoria heredada no es el
   método original y se seguirá indicando como experimental.
3. Conesa Fernández-Vítora: motor nuevo, versión que utiliza
   importancia = signo × (3IN + 2EX + MO + PE + RV + SI + AC + EF + PR + MC).
   Los diez atributos se completan manualmente, sin valores inventados.
   Las escalas y el identificador de variante se conservan en la
   exportación: conesa-1997-2ex. Otras variantes requieren otra ficha.
4. RIAM (Pastakia/Jensen, 1998): motor nuevo y separado. A1 (0–4),
   A2 (−3 a +3), B1, B2 y B3 (1–3). Resultado
   ES = (A1 × A2) × (B1 + B2 + B3). No se heredan datos de Conesa.
5. Battelle-Columbus: metodología reconocida, motor no habilitado.
   Requiere mediciones, curvas de transformación, ponderaciones
   homologadas e índices en escenarios con/sin proyecto; carecemos de
   esa base verificable en el expediente DEMO.

## Etapas y productos (no métodos nuevos por sí solos)

- Identificación: ¿qué acción puede afectar qué receptor?
- Valoración absoluta: impacto antes de ajustar importancia relativa.
- Valoración relativa: requiere ponderaciones justificados por factores.
- Residual: reevaluación tras medidas del PGA.
- Acumulativa/sinérgica: evaluación de interacciones y escenarios.
- Seguimiento del PGA: medida, plazo, indicador y evidencia, no puntaje.

Los ejemplos del EsIA Lomas de Docta muestran identificación, valoración
absoluta y valoración relativa. No se transplantan sus números a Salta.

## Persistencia y salvaguardas

El catálogo de acciones/factores existente es compartido en modo
lectura, y sus borradores continúan con la misma clave local.
Las valoraciones Conesa y RIAM se guardan en claves separadas por
proyecto y método. Abrir la herramienta no crea registros; solo
se persiste cuando el usuario introduce valores.
Cada método exporta CSV y JSON con la versión y fundamento;
una celda sin criterio completo permanece Pendiente.
No se escribe en Supabase ni se certifica cumplimiento regulatorio.

## Bibliografía contrastada

- Leopold et al. (1971), USGS Circular 645:
  https://pubs.usgs.gov/publication/cir645
- Conesa, variante 3IN+2EX en estudio ambiental bonaerense:
  https://www.ambiente.gba.gob.ar/sites/default/files/ABSTRACT-SERVICIOS%20PORTUARIOS%20INTEGRADOS%20S.A.pdf
- Vidal y Regaldo (eds.), Gestión ambiental, cap. 5, páginas
  189–212, documento proporcionado por el usuario.
- Pastakia y Jensen (1998), RIAM for EIA:
  https://www.sciencedirect.com/science/article/pii/S0195925598000183
- Dee et al. (1973), Environmental Evaluation System:
  https://agupubs.onlinelibrary.wiley.com/doi/10.1029/WR009i003p00523

## Pruebas

Chromium escritorio 1366 y 1800 px. Fórmulas de prueba: Conesa
−27 y RIAM −48; ambas derivadas de criterios asignados por QA,
no resultados ambientales del proyecto. Persistencia, aislamiento,
CSVs, 16 rutas y regresiones SIG/V1/V2 se verifican en CI.
