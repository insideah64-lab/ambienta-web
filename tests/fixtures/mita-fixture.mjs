// Synthetic adapter/transport fixture, never a satellite measurement.
export const tiffFixture=()=>{
 const tags=[[256,4,2],[257,4,2],[258,3,32],[259,3,1],[262,3,1],[273,4,134],[277,3,1],[278,4,2],[279,4,16],[339,3,3]];
 const b=Buffer.alloc(150);b.write('II');b.writeUInt16LE(42,2);b.writeUInt32LE(8,4);b.writeUInt16LE(tags.length,8);
 tags.forEach(([tag,type,value],i)=>{const p=10+i*12;b.writeUInt16LE(tag,p);b.writeUInt16LE(type,p+2);b.writeUInt32LE(1,p+4);b.writeUInt32LE(value,p+8);});
 [.2,.4,.6,.8].forEach((n,i)=>b.writeFloatLE(n,134+i*4));return b;
};
export const mitaFixture=hash=>({engine:'MITA',version:'0.2.0',index:'NDVI',generated_at_utc:'2026-11-04T12:00:00Z',provider:'earthsearch',collection:'sentinel-2-c1-l2a',scene_id:'QA-SYNTHETIC-NOT-A-SATELLITE-SCENE',acquisition_datetime:'2025-05-29T14:39:41Z',scene_cloud_percent:25,bbox_epsg4326:[-65.470,-24.760,-65.465,-24.755],assets:{red:'https://example.invalid/red.tif',nir:'https://example.invalid/nir.tif',scl:'https://example.invalid/scl.tif'},stac_catalog:'https://example.invalid/stac',calibration:{red_scale:.0001,red_offset:-.1,nir_scale:.0001,nir_offset:-.1},quality:{scl_valid_classes:[4,5,6],resampling_nir:'bilinear',resampling_scl:'nearest',inside_bbox_pixels:4,valid_pixels:4,valid_fraction_inside_bbox:1},raster:{crs:'EPSG:4326',width:2,height:2,format:'GeoTIFF',nodata:-9999},statistics:{pixels:4,valid_pixels:4,valid_fraction:1,ndvi_min:.2,ndvi_max:.8,ndvi_mean:.5},validation_status:'QA SINTÉTICO. Sin georreferenciación validada ni resultado ambiental real.',output_sha256:hash});
