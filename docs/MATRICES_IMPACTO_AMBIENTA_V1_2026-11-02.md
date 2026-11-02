# AMBIENTA — Constructor de matrices de impacto V1 (02/11/2026)

## Integración
Módulo React V3 **Herramientas → Matrices ambientales**, como espacio independiente. El módulo **Impactos** conserva el registro documental y un enlace contextual hacia la herramienta.
Sin cambios en V1/V2, expedientes transaccionales o simbología cartográfica.
Borradores aislados por proyecto en localStorage; no hay escrituras en Supabase.

## Metodología y bibliografía
- Leopold et al. (1971), USGS Circular 645, identificación de relaciones acción/factor, magnitud e importancia 1–10: https://www.usgs.gov/publications/a-procedure-evaluating-environmental-impact
- Garmendia et al. (2005), Evaluación de impacto ambiental, capítulos 7–8.
- Vidal y Regaldo (2022), Gestión ambiental, capítulo 5, matrices y PGA.
- Ejemplo EsIA Lomas de Docta, Córdoba: Matriz_Identificación.pdf (+1/−1), Matriz_Valoracion_Absoluta.pdf y Matriz_Valoracion_Relativa_1/2.pdf, con UIP.
- Ley nacional 25.675, artículos 11–13: https://www.argentina.gob.ar/normativa/nacional/ley-25675-79980/texto
- Ley provincial 7070 de Salta, artículos 38–45: https://www.argentina.gob.ar/normativa/provincial/ley-7070-123456789-0abc-defg-070-7000avorpyel/actualizacion
- IAIA buenas prácticas EIA: https://iaia.org/mejor-practica-principios-de-evaluacion-de-impacto-ambiental/

## Tres vistas de los mismos datos
1. Identificación: − / + / ∅ / —.
2. Leopold: signo, magnitud e importancia 1–10, nota y fuente.
3. Ponderación **exploratoria de AMBIENTA**: signo × magnitud × importancia × peso del factor (0,1–5).
   NO equivale al cálculo de importancia de Conesa ni a la valoración absoluta/relativa del ejemplo Docta.

Las celdas sin evaluar permanecen vacías. No se crean puntuaciones reales para Diablillos.
El catálogo inicial de acciones es explícitamente ilustrativo y los pesos empiezan
en 1. Los ejemplos de Córdoba NO se extrapolan al proyecto de Salta.

## Operaciones
Agregar, renombrar y quitar acciones/factores; fases de proyecto; importar
solo nombres de factores asociados al expediente; editar cada interacción,
justificación y referencia; persistencia en navegador por identificador de
expediente; descarga CSV UTF-8 y JSON; importación JSON validada;
protección contra inyección de fórmulas al abrir CSV; reinicio con confirmación.
El trabajo local no constituye informe oficial, firma, custodia ni conformidad.

## Próximas etapas
- Incorporar Conesa con ficha de variante y fórmula documentada, umbrales y QA.
- Diferenciar valoración absoluta, relativa y residual; comparar alternativas.
- Conectar interacciones evaluadas a medidas PGA, evidencias y geometrías SIG.
- Habilitar revisiones multiusuario vía Supabase solamente tras definir
  autorización, tenant por proyecto, RLS y registro de versiones.
- Exportador profesional XLSX/PDF con fuentes, firma responsable y anexos.

## Pruebas
Chromium 1366/1800: estado inicialmente sin evaluar, edición de signo,
magnitud e importancia, autoguardado, exportaciones, acciones/factores
añadidos, ancho responsive y no alterar expediente. CI preserva V1/V2.

## Ajuste de arquitectura del 02/11/2026
El constructor se trasladó al grupo de navegación **Herramientas**, ruta `/matrices`.
La ruta `/impactos` conserva únicamente la consulta documental, sus vínculos
espaciales y un enlace al taller. La clave local de almacenamiento se mantiene
sin cambios: los borradores anteriores siguen siendo legibles bajo el mismo
identificador de expediente. La navegación suma 16 destinos ilustrados distintos.
