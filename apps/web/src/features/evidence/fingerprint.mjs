// Local fingerprint reference only. Not a stored document, digital signature or proof of authenticity.
export function formatFingerprintReference(name,bytes,sha){
 if(typeof sha!=='string'||!(/^[0-9a-f]{64}$/i).test(sha))throw new Error('Hash SHA-256 inválido.');
 if(!Number.isSafeInteger(bytes)||bytes<0||bytes>10485760)throw new Error('Tamaño fuera del máximo de 10 MiB.');
 const short=String(name||'documento').replace(/[\r\n|<>]/g,'_').slice(0,90);
 return 'sha256:'+sha.toLowerCase()+'|archivo:'+short+'|bytes:'+bytes;
}
export function parseFingerprintReference(text){
 const m=/^sha256:([a-f0-9]{64})\|archivo:([^|]{1,90})\|bytes:(\d{1,10})$/i.exec(String(text));
 if(!m)return null;
 return {sha256:m[1].toLowerCase(),name:m[2],bytes:Number(m[3])};
}
