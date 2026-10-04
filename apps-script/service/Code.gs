// Private handover service. Configure Script Properties, never credentials in source.
function config_() {
  var p = PropertiesService.getScriptProperties().getProperties();
  if (!p.PROJECT_ID || !p.API_KEY || !p.FOLDER_ID || !p.ALLOWED_ORIGINS) throw new Error('CONFIGURATION');
  if (Session.getEffectiveUser().getEmail().toLowerCase() !== (p.OWNER_EMAIL || 'rsegura20250554@ucsd.edu.do')) throw new Error('CONFIGURATION');
  return { project: p.PROJECT_ID, apiKey: p.API_KEY, folder: p.FOLDER_ID, origins: JSON.parse(p.ALLOWED_ORIGINS), qaUsers: p.PROJECT_ID === 'ucsd-objetos-perdidos-pruebas' ? JSON.parse(p.QA_USERS || '{}') : {} };
}
function doGet(e) {
  var c = config_(), origin = e.parameter.origin, nonce = e.parameter.nonce;
  if (c.origins.indexOf(origin) < 0 || !/^[a-zA-Z0-9-]{20,80}$/.test(nonce || '')) return HtmlService.createHtmlOutput('Origen no permitido.');
  var page = '<!doctype html><html><body><script>var origin=' + JSON.stringify(origin).replace(/</g, '\\u003c') + ',nonce=' + JSON.stringify(nonce) + ';' +
    'window.addEventListener("message",function(e){if(e.origin!==origin||e.source!==window.top||!e.data||e.data.nonce!==nonce||e.data.kind!=="request")return;' +
    'var id=e.data.requestId;google.script.run.withSuccessHandler(function(result){window.top.postMessage({kind:"response",nonce:nonce,requestId:id,ok:result.ok,result:result.result,error:result.error},origin);})' +
    '.withFailureHandler(function(){window.top.postMessage({kind:"response",nonce:nonce,requestId:id,ok:false,error:"No se pudo completar la operación."},origin);})' +
    '.dispatch({idToken:e.data.idToken,action:e.data.action,payload:e.data.payload});});window.top.postMessage({kind:"ready",nonce:nonce,service:"ucsd-delivery-evidence"},origin);</script></body></html>';
  return HtmlService.createHtmlOutput(page).setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}
function dispatch(envelope) {
  try {
    if (!envelope || typeof envelope !== 'object') throw new Error('INVALID_REQUEST');
    var idToken = envelope.idToken, action = envelope.action, payload = envelope.payload;
    var c = config_();
    var identity = identity_(c, idToken);
    var access = access_(c, identity);
    if (action === 'list') return { ok: true, result: list_(c, payload || {}) };
    if (action === 'view') return { ok: true, result: view_(c, payload || {}) };
    if (action !== 'deliver') throw new Error('INVALID_REQUEST');
    if (['developer', 'admin', 'decanato'].indexOf(access.value.role) < 0) throw new Error('FORBIDDEN');
    var lock = LockService.getScriptLock();
    if (!lock.tryLock(1000)) throw new Error('BUSY');
    try { return { ok: true, result: deliver_(c, identity, idToken, payload || {}) }; }
    finally { lock.releaseLock(); }
  } catch (error) {
    var known = ['CONFIGURATION', 'UNAUTHORIZED', 'FORBIDDEN', 'INVALID_REQUEST', 'INVALID_IMAGE', 'CONFLICT', 'BUSY', 'NOT_FOUND', 'UNAVAILABLE'];
    var code = known.indexOf(error.message) >= 0 ? error.message : 'UNAVAILABLE';
    var messages = { CONFIGURATION: 'El servicio de fotografías no está configurado.', UNAUTHORIZED: 'Inicia sesión nuevamente.', FORBIDDEN: 'No tienes permiso para esta operación.', INVALID_REQUEST: 'Revisa los datos de la entrega.', INVALID_IMAGE: 'Selecciona fotografías JPEG válidas de hasta 1 MB.', CONFLICT: 'El objeto cambió. Actualiza el registro antes de continuar.', BUSY: 'Hay otra subida en curso. Inténtalo nuevamente.', NOT_FOUND: 'La fotografía no está disponible.', UNAVAILABLE: 'No se pudo completar la operación. Inténtalo nuevamente.' };
    return { ok: false, code: code, error: messages[code] };
  }
}
function identity_(c, token) {
  if (typeof token !== 'string' || token.length > 16000) throw new Error('UNAUTHORIZED');
  var claims;
  try { claims = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(token.split('.')[1])).getDataAsString()); }
  catch (_) { throw new Error('UNAUTHORIZED'); }
  if (claims.aud !== c.project || claims.iss !== 'https://securetoken.google.com/' + c.project || typeof claims.sub !== 'string' || !claims.sub || claims.sub.length > 128 || typeof claims.exp !== 'number' || typeof claims.iat !== 'number' || claims.exp <= Date.now() / 1000 || claims.iat > Date.now() / 1000 + 60) throw new Error('UNAUTHORIZED');
  // lookup validates the opaque token on Google's server, not the decoded claims alone.
  var result = request_('https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=' + encodeURIComponent(c.apiKey), 'post', { idToken: token });
  var u = result.users && result.users[0];
  if (!u || u.localId !== claims.sub || u.disabled || typeof u.email !== 'string' || u.email.toLowerCase() !== String(claims.email || '').toLowerCase()) throw new Error('UNAUTHORIZED');
  if (u.validSince && (typeof claims.auth_time !== 'number' || claims.auth_time < Number(u.validSince))) throw new Error('UNAUTHORIZED');
  var mail = u.email.toLowerCase(), provider = claims.firebase && claims.firebase.sign_in_provider;
  var qa = c.qaUsers[mail];
  if (qa) {
    if (provider !== 'password' || qa.uid !== u.localId) throw new Error('UNAUTHORIZED');
  } else if (!/^[^@/]+@ucsd\.edu\.do$/.test(mail) || u.emailVerified !== true || claims.email_verified !== true || ['google.com', 'password'].indexOf(provider) < 0) throw new Error('UNAUTHORIZED');
  return { uid: u.localId, email: mail, expectedRole: qa && qa.role };
}
function access_(c, identity, transaction) {
  var doc = get_(c, 'access/' + identity.email, transaction);
  if (!doc || doc.value.email !== identity.email || doc.value.active !== true || ['developer', 'admin', 'decanato', 'registro'].indexOf(doc.value.role) < 0 || (doc.value.role === 'developer' && identity.email !== 'rsegura20250554@ucsd.edu.do') || (identity.expectedRole && identity.expectedRole !== doc.value.role)) throw new Error('FORBIDDEN');
  return doc;
}
function request_(url, method, body, owner, c) {
  var response = UrlFetchApp.fetch(url, { method: method, contentType: 'application/json', payload: body === undefined ? undefined : JSON.stringify(body), headers: owner ? { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } : {}, muteHttpExceptions: true });
  var status = response.getResponseCode();
  if (status === 404) return null;
  if (status < 200 || status >= 300) {
    if (!owner && (status === 400 || status === 401)) throw new Error('UNAUTHORIZED');
    if (status === 409 || status === 412) throw new Error('CONFLICT');
    throw new Error('UNAVAILABLE');
  }
  var content = response.getContentText();
  return content ? JSON.parse(content) : {};
}
function base_(c) { return 'https://firestore.googleapis.com/v1/projects/' + c.project + '/databases/(default)/documents'; }
function name_(c, path) { return 'projects/' + c.project + '/databases/(default)/documents/' + path; }
function get_(c, path, transaction) {
  var data = request_(base_(c) + '/' + path + (transaction ? '?transaction=' + encodeURIComponent(transaction) : ''), 'get', undefined, true, c);
  return data ? { value: decodeMap_(data.fields || {}), fields: data.fields, updateTime: data.updateTime, name: data.name } : null;
}
function decode_(v) {
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('nullValue' in v) return null;
  if (v.arrayValue) return (v.arrayValue.values || []).map(decode_);
  if (v.mapValue) return decodeMap_(v.mapValue.fields || {});
  throw new Error('INVALID_REQUEST');
}
function decodeMap_(fields) { var out = {}; Object.keys(fields).forEach(function(k) { out[k] = decode_(fields[k]); }); return out; }
function encode_(v) {
  if (v === null) return { nullValue: null };
  if (typeof v === 'string') return { stringValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  if (typeof v === 'number' && Number.isSafeInteger(v)) return { integerValue: String(v) };
  if (Array.isArray(v)) return { arrayValue: { values: v.map(encode_) } };
  if (v && typeof v === 'object') return { mapValue: { fields: encodeMap_(v) } };
  throw new Error('INVALID_REQUEST');
}
function encodeMap_(value) { var out = {}; Object.keys(value).forEach(function(k) { out[k] = encode_(value[k]); }); return out; }
function write_(c, path, fields, precondition, transform) {
  var out = { update: { name: name_(c, path), fields: fields }, currentDocument: precondition };
  if (transform) out.updateTransforms = [{ fieldPath: 'updatedAt', setToServerValue: 'REQUEST_TIME' }];
  return out;
}
function commit_(c, writes, transaction) { return request_(base_(c) + ':commit', 'post', { writes: writes, transaction: transaction }, true, c); }
function id_(v) { if (typeof v !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(v)) throw new Error('INVALID_REQUEST'); return v; }
function hash_(value) { return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value, Utilities.Charset.UTF_8).map(function(b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join(''); }
function jpeg_(photo) {
  if (!photo || photo.mimeType !== 'image/jpeg' || typeof photo.base64 !== 'string' || photo.base64.length > 1398104 || !/^[A-Za-z0-9+/]+={0,2}$/.test(photo.base64)) throw new Error('INVALID_IMAGE');
  var raw = Utilities.base64Decode(photo.base64), b = raw.map(function(x) { return x & 255; });
  if (b.length > 1000000 || b.length < 12 || b[0] !== 255 || b[1] !== 216 || b[b.length - 2] !== 255 || b[b.length - 1] !== 217) throw new Error('INVALID_IMAGE');
  var offset = 2, dimensions, scan = false;
  while (offset < b.length - 2) {
    if (b[offset++] !== 255) throw new Error('INVALID_IMAGE');
    while (b[offset] === 255) offset++;
    var marker = b[offset++];
    if (marker === 218) {
      var scanLength = b[offset] * 256 + b[offset + 1];
      if (scanLength < 6 || offset + scanLength >= b.length - 2) throw new Error('INVALID_IMAGE');
      scan = true; break;
    }
    if (marker === 217 || marker === 216 || marker === 0) throw new Error('INVALID_IMAGE');
    var length = b[offset] * 256 + b[offset + 1];
    if (length < 2 || offset + length > b.length) throw new Error('INVALID_IMAGE');
    // Reject embedded metadata; frontend produces a clean canvas JPEG.
    if (marker === 225 || marker === 226 || marker === 237 || marker === 254) throw new Error('INVALID_IMAGE');
    if ([192, 193, 194].indexOf(marker) >= 0) {
      if (length < 8) throw new Error('INVALID_IMAGE');
      dimensions = { height: b[offset + 3] * 256 + b[offset + 4], width: b[offset + 5] * 256 + b[offset + 6] };
    }
    offset += length;
  }
  if (!scan || !dimensions || !dimensions.width || !dimensions.height || dimensions.width > 1600 || dimensions.height > 1600) throw new Error('INVALID_IMAGE');
  return { bytes: raw, size: b.length, mimeType: 'image/jpeg', width: dimensions.width, height: dimensions.height };
}
function input_(payload) {
  var delivery = payload.delivery || {};
  if (typeof delivery.recipient !== 'string' || !delivery.recipient.trim() || delivery.recipient.trim().length > 300 || typeof delivery.proof !== 'string' || !delivery.proof.trim() || delivery.proof.trim().length > 2000 || ['documento_identidad', 'carnet_estudiante'].indexOf(delivery.identityType) < 0 || !Array.isArray(payload.photos) || payload.photos.length < 1 || payload.photos.length > 3 || typeof payload.expectedHistoryId !== 'string' || !payload.expectedHistoryId || payload.expectedHistoryId.length > 100) throw new Error('INVALID_REQUEST');
  return { itemId: id_(payload.itemId), operationId: id_(payload.operationId), expectedHistoryId: payload.expectedHistoryId, delivery: { recipient: delivery.recipient.trim(), proof: delivery.proof.trim(), identityType: delivery.identityType }, photos: payload.photos.map(jpeg_) };
}
function deliverySearchTerms_(item, recipient) {
  if (!Array.isArray(item.searchTerms)) throw new Error('CONFLICT');
  var words = recipient.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
  var terms = Array.from(new Set(item.searchTerms.concat(words)));
  if (terms.length > 500) throw new Error('INVALID_REQUEST');
  return terms;
}
function deliver_(c, identity, token, payload) {
  var p = input_(payload), operation = hash_(identity.uid + ':' + p.operationId), path = 'evidenceOperations/' + operation;
  var fingerprint = hash_(JSON.stringify({ itemId: p.itemId, delivery: p.delivery, expectedHistoryId: p.expectedHistoryId, photos: payload.photos.map(function(photo) { return photo.base64; }) }));
  var existing = get_(c, path);
  if (existing && (existing.value.fingerprint !== fingerprint || existing.value.uid !== identity.uid)) throw new Error('CONFLICT');
  if (existing && ['pending', 'completed'].indexOf(existing.value.state) < 0) throw new Error('CONFLICT');
  if (existing && existing.value.state === 'completed') return { evidenceId: operation, itemId: p.itemId };
  var item = get_(c, 'privateItems/' + p.itemId);
  if (!item || item.value.status !== 'disponible' || item.value.delivery || item.value.disposition || item.value.received !== true || !item.value.history || item.value.history[item.value.history.length - 1].id !== p.expectedHistoryId) throw new Error('CONFLICT');
  // Match the client index before any upload. Otherwise archiving would rebuild
  // searchTerms with the recipient and violate the immutable-delivery rule.
  deliverySearchTerms_(item.value, p.delivery.recipient);
  if (!existing) {
    commit_(c, [write_(c, path, encodeMap_({ uid: identity.uid, itemId: p.itemId, fingerprint: fingerprint, state: 'pending', createdAt: new Date().toISOString(), files: [] }), { exists: false })]);
    existing = get_(c, path);
  }
  var folder = DriveApp.getFolderById(c.folder);
  if (folder.getSharingAccess() !== DriveApp.Access.PRIVATE || folder.getEditors().length || folder.getViewers().length) throw new Error('CONFIGURATION');
  var photos = [];
  p.photos.forEach(function(photo, index) {
    var filename = 'UCSD-' + operation + '-' + index + '.jpg', matches = folder.getFilesByName(filename), file;
    if (matches.hasNext()) { file = matches.next(); if (matches.hasNext()) throw new Error('CONFLICT'); }
    else file = folder.createFile(Utilities.newBlob(photo.bytes, 'image/jpeg', filename));
    if (file.getSharingAccess() !== DriveApp.Access.PRIVATE || file.getEditors().length || file.getViewers().length || file.getSize() !== photo.size) throw new Error('CONFIGURATION');
    photos.push({ fileId: file.getId(), mimeType: 'image/jpeg', size: photo.size });
    var pending = existing.value; pending.files = photos;
    commit_(c, [write_(c, path, encodeMap_(pending), { updateTime: existing.updateTime })]);
    existing = get_(c, path);
  });
  // Recheck token after uploading. Transaction reads bind access revocation and object version.
  identity = identity_(c, token);
  var tx = request_(base_(c) + ':beginTransaction', 'post', { options: { readWrite: {} } }, true, c).transaction;
  try {
    var access = access_(c, identity, tx);
    if (['developer', 'admin', 'decanato'].indexOf(access.value.role) < 0) throw new Error('FORBIDDEN');
    item = get_(c, 'privateItems/' + p.itemId, tx);
    if (!item || item.value.history[item.value.history.length - 1].id !== p.expectedHistoryId || item.value.status !== 'disponible' || item.value.delivery || item.value.disposition) throw new Error('CONFLICT');
    var op = get_(c, path, tx);
    if (op.value.state === 'completed') return { evidenceId: operation, itemId: p.itemId };
    var at = new Date().toISOString(), fields = item.fields;
    if (!Array.isArray(item.value.history) || item.value.history.length >= 1000) throw new Error('CONFLICT');
    fields.status = encode_('entregado'); fields.delivery = encode_({ recipient: p.delivery.recipient, proof: p.delivery.proof, identityType: p.delivery.identityType, deliveredAt: at, evidenceId: operation });
    fields.deliveryDate = encode_(Utilities.formatDate(new Date(at), 'America/Santo_Domingo', 'yyyy-MM-dd'));
    fields.searchTerms = encode_(deliverySearchTerms_(item.value, p.delivery.recipient));
    fields.updatedByUid = encode_(identity.uid);
    fields.history = encode_(item.value.history.concat([{ id: operation, at: at, actor: identity.email, action: 'Objeto entregado; propiedad e identidad comprobadas y fotografías registradas' }]));
    var evidence = { id: operation, itemId: p.itemId, code: item.value.code, title: item.value.title, deliveredAt: at, operatorUid: identity.uid, photos: photos, operationId: p.operationId };
    op.value.state = 'completed'; op.value.completedAt = at;
    commit_(c, [write_(c, 'privateItems/' + p.itemId, fields, { updateTime: item.updateTime }, true), write_(c, 'publicItems/' + p.itemId, encodeMap_(publicItemProjection_(item.value))), write_(c, 'deliveryEvidence/' + operation, encodeMap_(evidence), { exists: false }), write_(c, path, encodeMap_(op.value), { updateTime: op.updateTime })], tx);
    return { evidenceId: operation, itemId: p.itemId };
  } finally {
    // A successful commit closes the transaction; rollback of a closed one is harmless.
    try { request_(base_(c) + ':rollback', 'post', { transaction: tx }, true, c); } catch (_) {}
  }
}
function publicItemProjection_(v) {
  return { id: v.id, code: v.code, title: v.title, category: v.category, itemType: v.itemType, description: v.description, foundDate: v.foundDate, foundLocation: v.foundLocation, status: 'entregado', buildingId: v.buildingId, searchTerms: v.publicSearchTerms };
}
function projection_(v) { return { id: v.id, itemId: v.itemId, code: v.code, title: v.title, deliveredAt: v.deliveredAt, photoCount: v.photos.length }; }
function list_(c, payload) {
  var query = { from: [{ collectionId: 'deliveryEvidence' }], orderBy: [{ field: { fieldPath: 'deliveredAt' }, direction: 'DESCENDING' }, { field: { fieldPath: '__name__' }, direction: 'DESCENDING' }], limit: 26 };
  if (payload.cursor) {
    var cursor;
    try { cursor = JSON.parse(payload.cursor); } catch (_) { throw new Error('INVALID_REQUEST'); }
    id_(cursor.id);
    if (typeof cursor.deliveredAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(cursor.deliveredAt)) throw new Error('INVALID_REQUEST');
    query.startAt = { values: [encode_(cursor.deliveredAt), { referenceValue: name_(c, 'deliveryEvidence/' + cursor.id) }], before: false };
  }
  var result = request_(base_(c) + ':runQuery', 'post', { structuredQuery: query }, true, c);
  var docs = result.filter(function(row) { return row.document; }).map(function(row) { return decodeMap_(row.document.fields); });
  var page = docs.slice(0, 25), last = page[page.length - 1];
  return { items: page.map(projection_), cursor: docs.length > 25 ? JSON.stringify({ id: last.id, deliveredAt: last.deliveredAt }) : null };
}
function view_(c, payload) {
  var doc = get_(c, 'deliveryEvidence/' + id_(payload.evidenceId));
  if (!doc) throw new Error('NOT_FOUND');
  return { photos: doc.value.photos.map(function(photo) {
  var file = DriveApp.getFileById(photo.fileId), parents = file.getParents(), inFolder = false;
  while (parents.hasNext()) if (parents.next().getId() === c.folder) inFolder = true;
  if (!inFolder || file.isTrashed() || file.getSharingAccess() !== DriveApp.Access.PRIVATE || file.getEditors().length || file.getViewers().length || file.getSize() > 1000000) throw new Error('NOT_FOUND');
  var base64 = Utilities.base64Encode(file.getBlob().getBytes()), parsed = jpeg_({ mimeType: 'image/jpeg', base64: base64 });
  return { mimeType: 'image/jpeg', base64: base64, size: parsed.size, width: parsed.width, height: parsed.height };
  }) };
}
// Editor-only maintenance; trailing underscore prevents google.script.run calls.
// Never trash linked evidence. Only pending/abandoned operation files older than seven days.
function cleanupPending_() {
  var c = config_(), lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) throw new Error('BUSY');
  try {
    var rows = request_(base_(c) + ':runQuery', 'post', { structuredQuery: { from: [{ collectionId: 'evidenceOperations' }], where: { fieldFilter: { field: { fieldPath: 'state' }, op: 'IN', value: encode_(['pending', 'abandoned']) } }, limit: 25 } }, true, c);
    var cleaned = 0;
    rows.filter(function(row) { return row.document; }).forEach(function(row) {
      var op = decodeMap_(row.document.fields), key = row.document.name.split('/').pop();
      if (!op.createdAt || Date.parse(op.createdAt) > Date.now() - 7 * 86400000) return;
      if (get_(c, 'deliveryEvidence/' + key)) return;
      var item = get_(c, 'privateItems/' + id_(op.itemId));
      if (item && item.value.delivery && item.value.delivery.evidenceId === key) return;
      op.state = 'abandoned';
      commit_(c, [write_(c, 'evidenceOperations/' + key, encodeMap_(op), { updateTime: row.document.updateTime })]);
      var folder = DriveApp.getFolderById(c.folder);
      // Deterministic filenames recover files created just before an interrupted pending write.
      for (var i = 0; i < 3; i++) {
        var files = folder.getFilesByName('UCSD-' + key + '-' + i + '.jpg');
        while (files.hasNext()) files.next().setTrashed(true);
      }
      var current = get_(c, 'evidenceOperations/' + key); op.state = 'cleaned';
      commit_(c, [write_(c, 'evidenceOperations/' + key, encodeMap_(op), { updateTime: current.updateTime })]);
      cleaned++;
    });
    return { cleaned: cleaned };
  } finally { lock.releaseLock(); }
}
