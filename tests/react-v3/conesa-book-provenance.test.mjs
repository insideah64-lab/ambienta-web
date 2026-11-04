import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

/**
 * Source transition guard: the historical didactic engine remains intact.
 * The complete 3rd-edition book can be adopted only with a new versioned
 * algorithm and explicit review of the method's documented exceptional cases.
 */
test('Conesa single book workbench preserves distinct historic drafts and audit provenance',async()=>{
 const base='apps/web-v3/src/features/impacts/';
 const [model,ui,hub,audit]=await Promise.all([
  readFile(base+'ConesaSimplificadoModel.ts','utf8'),
  readFile(base+'ConesaSimplificado.tsx','utf8'),
  readFile(base+'MatrixMethodHub.tsx','utf8'),
  readFile('docs/CONESA_GUIA_COMPLETA_1997_AUDITORIA_F0_2026-11-03.md','utf8')
 ]);
 assert.match(model,/METHOD_ID='conesa-simplificado-tutorial-v1'/);
 assert.match(model,/3\*v\.IN\+2\*\(v\.EX\+v\.EX_CR\)/);
 assert.match(model,/3rd ed\. \(1997\)/);
 assert.match(ui,/La implementación completa del libro está pendiente/);
 assert.match(hub,/name:'Conesa'/);
 assert.match(hub,/<ConesaLibroPanel key=/);
 assert.doesNotMatch(hub,/data-conesa-variant-switch/);
 assert.match(hub,/data-conesa-simplified-archive/);
 assert.match(hub,/readOnly\/>/);
 assert.match(hub,/oldSimplifiedArchive/);
 assert.match(audit,/1997.*2000/);
 assert.match(audit,/Sin cambios|SIN cambiar cálculo/);
 assert.match(audit,/Umbral|bordes 50 y 75/i);
 assert.match(audit,/UIP/);
 assert.match(audit,/Banderas rojas/);
 assert.match(audit,/Sinergia|Sinergismo|RV=3|Reversibilidad/i);
});
