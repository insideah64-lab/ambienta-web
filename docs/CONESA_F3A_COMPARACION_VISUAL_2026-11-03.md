# AMBIENTA — Conesa F3a: comparación visual de calidad ambiental

**Alcance:** mejora de lectura del motor F3a, no una nueva fórmula de Conesa.

## Base bibliográfica

Conesa Fernández-Vítora, *Guía metodológica para la evaluación del impacto ambiental*, 3.ª ed. 1997, reimp. 2000, §5.3, pp. 113–116. La transformación ambiental sigue calculándose exclusivamente en el motor F3a, con datos, fuentes y funciones declaradas. La vista compara CA SIN y CON, y su ΔCA.

## Diseño y tecnología

Se consultó el contrato actual de Lumen UI 4.3 (React; DumbbellChart y Chart), sus tokens y requisitos de accesibilidad. El repositorio **no tiene instalado** el paquete npm `@santi020k/lumen-react`. Por seguridad del lockfile, esta versión no añade una dependencia ni simula una integración real: implementa una vista React existente compatible con la lógica de Lumen (observación base, observación actual, tabla exacta, escala común y tratamiento de vacíos). La instalación y migración a componentes Lumen reales queda como tarea independiente para revisión de versiones.

- Gráfico de pares con escala CA 0–1 y marcas visualmente distintas para SIN (círculo hueco) y CON (círculo lleno), con distancia conectada.
- La tabla semántica incluye números completos, indicador, método, fechas, fuente de escenario y función, sin depender del color ni de un tooltip.
- No se agregan valores ni se inventan magnitudes; solo se dibujan factores con ambas calidades validadas. Si todo está pendiente, se presenta un estado vacío claro.
- Los registros incompletos permanecen visibles en el editor y se señalan como pendientes, sin forzar un cero ni completar con promedios.
- La escala idéntica no implica que los pesos UIP de F2 se hayan aprobado, ni permite sumar ΔCA de distintos factores para afirmar un impacto total.
- Uso de variables semánticas de Lumen con valores de respaldo CSS; no se modifica la paleta global de AMBIENTA, V1 o V2.

## Calidad

El smoke de Playwright F3a incluye verificación de vista vacía, pares visibles cuando hay datos, tabla exacta, 5 referencias de escala y persistencia tras recargar en 1366 y 1800 px. La suite numérica F3a sigue siendo la fuente de verdad.

**HOLD:** no fusionar sin CI verde. F3b bibliográfico de curvas del Anejo 4 y F3c de ponderación global permanecen pendientes.
