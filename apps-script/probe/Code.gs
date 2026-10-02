// Connectivity probe only: no Drive, Firebase, tokens or photographs.
function doGet(e) {
  var origin = e.parameter.origin;
  var nonce = e.parameter.nonce;
  if (['http://127.0.0.1:5181', 'https://ucsd-objetos-perdidos-pruebas.web.app'].indexOf(origin) < 0 || !/^[a-zA-Z0-9-]{20,80}$/.test(nonce || '')) {
    return HtmlService.createHtmlOutput('Origen no permitido.');
  }
  var page = '<!doctype html><html><body><p>Prueba de conexión UCSD</p><script>' +
    'var origin=' + JSON.stringify(origin) + ',nonce=' + JSON.stringify(nonce) + ';' +
    'window.addEventListener("message",function(e){if(e.origin!==origin||e.source!==window.top||!e.data||e.data.nonce!==nonce||e.data.kind!=="ping")return;' +
    'google.script.run.withSuccessHandler(function(result){window.top.postMessage({kind:"pong",nonce:nonce,result:result},origin);}).withFailureHandler(function(){window.top.postMessage({kind:"failed",nonce:nonce},origin);}).ping();});' +
    'window.top.postMessage({kind:"ready",nonce:nonce},origin);' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(page).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function ping() { return { ok: true, service: 'ucsd-bridge-probe' }; }
