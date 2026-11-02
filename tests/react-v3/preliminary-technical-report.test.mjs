import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoState} from '../../web/domain.mjs';
import {createDiablillosState} from '../../apps/web-v3/src/lib/diablillosDemo.mjs';
import {buildPreliminaryTechnicalReview,renderPreliminaryTechnicalHtml,
 preparePreliminaryTechnicalDownload,TECHNICAL_REPORT_SCHEMA}
 from '../../apps/web-v3/src/features/reporting/preliminary-technical-report.mjs';

test('Diablillos: report follows every linked documentary module without inventing metrics',()=>{
 const d=createDiablillosState(),source=JSON.stringify(d);
 const out=preparePreliminaryTechnicalDownload(d),m=out.model;
 assert.equal(m.schema,TECHNICAL_REPORT_SCHEMA);
 assert.deepEqual(m.counts,{impacts:4,programs:4,measures:4,inspections:2,
  evidence:6,findings:1,correctiveActions:1,documentaryWarnings:0});
 const measure=m.measureRows.find(x=>x.id==='MED-DIAB-002');
 assert.deepEqual(measure.inspectionIds,['INSP-DIAB-002']);
 assert.deepEqual(measure.evidenceIds,['EVID-D-004']);
 assert.deepEqual(measure.findingIds,['HALL-D-001']);
 assert.deepEqual(measure.actionIds,['AC-D-001']);
 assert.equal(m.impactRows.find(x=>x.id==='IMP-D-EFL').measures[0],'MED-DIAB-002');
 assert.equal(m.provenance.officialBoundaryVerified,false);
 assert.equal(m.provenance.originalFilesIncluded,false);
 assert.match(m.disclaimer,/No constituye Estudio de Impacto Ambiental/i);
 assert(m.readiness.some(x=>x.name.includes('significancia')&&x.status==='No documentado'));
 assert(out.html.includes('9. Matriz de información faltante para un EsIA'));
 assert(out.html.includes('10. Condiciones para avanzar'));
 assert.equal(JSON.stringify(d),source);
});
test('Default DEMO generates a complete report even without evidence and findings',()=>{
 const d=createDemoState(),before=JSON.stringify(d);
 const m=buildPreliminaryTechnicalReview(d);
 assert.equal(m.counts.impacts,4);
 assert.equal(m.counts.evidence,0);
 assert.equal(m.counts.findings,0);
 assert.equal(m.readiness.find(x=>x.name==='Referencias de evidencia').status,'No documentado');
 const html=renderPreliminaryTechnicalHtml(m);
 assert.match(html,/Sin registros declarados/);
 assert.match(html,/doctype html/i);
 assert.equal(JSON.stringify(d),before);
});
test('No invented significance scores or environmental compliance claims',()=>{
 const m=buildPreliminaryTechnicalReview(createDiablillosState());
 const text=renderPreliminaryTechnicalHtml(m);
 assert(!/aprobación automática|impacto alto\s*\(|cumplimiento confirmado/i.test(text));
 assert.match(text,/sin valoración de significancia/i);
 assert.match(text,/No se calcularon impactos/i);
 assert.match(text,/No se incluyen archivos de evidencia/i);
});
test('Escapes potentially malicious project and evidence fields in printable HTML',()=>{
 const d=createDiablillosState();
 d.project.name='<img src=x onerror=alert(1)>';
 d.evidence[0].reference='</td><script>window.XSS=1</script>';
 d.findings[0].description='<svg onload=alert(1)>';
 const html=preparePreliminaryTechnicalDownload(d).html;
 assert(!html.includes('<script>'));
 assert(!html.includes('<img src=x'));
 assert(!html.includes('<svg onload'));
 assert(html.includes('&lt;script&gt;'));
 assert(html.includes('&lt;img src=x onerror=alert(1)&gt;'));
 assert(html.includes('&lt;svg onload=alert(1)&gt;'));
});
test('Duplicate measure or impact IDs do not create invented unique links',()=>{
 const d=createDiablillosState();
 d.measures.push({...d.measures[1],title:'Otro homónimo'});
 d.impacts.push({...d.impacts[0],name:'Impacto ambiguo'});
 const report=buildPreliminaryTechnicalReview(d);
 assert(report.measureRows.filter(x=>x.id==='MED-DIAB-002').every(x=>x.ambiguous));
 assert(report.impactRows.filter(x=>x.id==='IMP-D-AGU').every(x=>x.measures.length===0));
 assert(report.counts.documentaryWarnings>0);
});
test('Output deterministic for an unchanged local expediente',()=>{
 const d=createDiablillosState(),one=preparePreliminaryTechnicalDownload(d),two=preparePreliminaryTechnicalDownload(d);
 assert.equal(one.html,two.html);
 assert.equal(one.filename,two.filename);
 assert.match(one.filename,/^ambienta-diagnostico-preliminar-[\w-]+\.html$/);
 assert(!one.html.includes('<script'));
});
