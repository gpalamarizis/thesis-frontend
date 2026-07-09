// Extract metadata from Office and PDF files, client-side.
// Office (docx/xlsx/pptx) files are ZIP archives — we read docProps/core.xml.
// PDF files have an /Info dictionary near the file start or end.

import { unzipSync } from 'fflate';

export async function extractFileMetadata(file) {
  try {
    const name = file.name.toLowerCase();
    const buf = new Uint8Array(await file.arrayBuffer());

    if (name.endsWith('.docx') || name.endsWith('.xlsx') || name.endsWith('.pptx') ||
        name.endsWith('.docm') || name.endsWith('.xlsm') || name.endsWith('.pptm')) {
      return extractOffice(buf);
    }
    if (name.endsWith('.pdf')) {
      return extractPdf(buf);
    }
    return {};
  } catch (err) {
    // Silent fail — metadata is best-effort
    return {};
  }
}

function extractOffice(bytes) {
  try {
    const zip = unzipSync(bytes, { filter: (f) => f.name === 'docProps/core.xml' });
    const coreXmlBytes = zip['docProps/core.xml'];
    if (!coreXmlBytes) return {};
    const xml = new TextDecoder('utf-8').decode(coreXmlBytes);
    const get = (tag) => {
      const re = new RegExp(`<(?:[a-zA-Z]+:)?${tag}(?:\\s[^>]*)?>([^<]*)</`, 'i');
      const m = xml.match(re);
      return m ? decodeEntities(m[1].trim()) : null;
    };
    const author           = get('creator');
    const lastModifiedBy   = get('lastModifiedBy');
    const modifiedAt       = get('modified');
    const createdAt        = get('created');
    const title            = get('title');
    return {
      metadata_author:            author,
      metadata_last_modified_by:  lastModifiedBy || author,
      metadata_modified_at:       modifiedAt,
      metadata_created_at:        createdAt,
      metadata_title:             title,
    };
  } catch {
    return {};
  }
}

function extractPdf(bytes) {
  try {
    // Read entire file as latin1 for byte-safe regex, but cap at 500KB from start + 100KB from end
    // (Info dictionary is usually near the trailer at end, but also often at start)
    const startSize = Math.min(bytes.length, 500 * 1024);
    const startText = decodeLatin1(bytes.subarray(0, startSize));
    const endStart = Math.max(0, bytes.length - 100 * 1024);
    const endText = decodeLatin1(bytes.subarray(endStart));
    const text = startText + endText;

    const getStr = (key) => {
      // /Key (...) form
      const paren = text.match(new RegExp(`/${key}\\s*\\(((?:\\\\.|[^)\\\\])*)\\)`, 'i'));
      if (paren) return decodePdfString(paren[1]);
      // /Key <...> hex form
      const hex = text.match(new RegExp(`/${key}\\s*<([0-9a-fA-F\\s]+)>`, 'i'));
      if (hex) return decodePdfHex(hex[1]);
      return null;
    };

    const author = getStr('Author');
    const modDateRaw = getStr('ModDate');
    const createdRaw = getStr('CreationDate');

    return {
      metadata_author:            author,
      metadata_last_modified_by:  author,  // PDF has no separate "last modified by"
      metadata_modified_at:       parsePdfDate(modDateRaw),
      metadata_created_at:        parsePdfDate(createdRaw),
      metadata_title:             getStr('Title'),
    };
  } catch {
    return {};
  }
}

// ---- helpers ----

function decodeLatin1(bytes) {
  let s = '';
  for (let i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
  return s;
}

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function decodePdfString(raw) {
  // Handle escape sequences \n, \r, \t, \\, \(, \), and octal \nnn
  let out = raw
    .replace(/\\(\d{1,3})/g, (_, n) => String.fromCharCode(parseInt(n, 8)))
    .replace(/\\n/g, '\n')
    .replace(/\\r/g, '\r')
    .replace(/\\t/g, '\t')
    .replace(/\\\(/g, '(')
    .replace(/\\\)/g, ')')
    .replace(/\\\\/g, '\\');
  // Check for BOM (UTF-16 BE)
  if (out.length >= 2 && out.charCodeAt(0) === 0xFE && out.charCodeAt(1) === 0xFF) {
    let s = '';
    for (let i = 2; i < out.length - 1; i += 2) {
      s += String.fromCharCode((out.charCodeAt(i) << 8) | out.charCodeAt(i + 1));
    }
    return s;
  }
  return out;
}

function decodePdfHex(hex) {
  const h = hex.replace(/\s/g, '');
  let out = '';
  for (let i = 0; i < h.length; i += 2) {
    out += String.fromCharCode(parseInt(h.substr(i, 2), 16));
  }
  if (out.length >= 2 && out.charCodeAt(0) === 0xFE && out.charCodeAt(1) === 0xFF) {
    let s = '';
    for (let i = 2; i < out.length - 1; i += 2) {
      s += String.fromCharCode((out.charCodeAt(i) << 8) | out.charCodeAt(i + 1));
    }
    return s;
  }
  return out;
}

function parsePdfDate(raw) {
  if (!raw) return null;
  // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
  const m = raw.match(/^D?:?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?/);
  if (!m) return raw;
  const [, y, mo = '01', d = '01', hh = '00', mm = '00', ss = '00'] = m;
  return `${y}-${mo}-${d}T${hh}:${mm}:${ss}`;
}
