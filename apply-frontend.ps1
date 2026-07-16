# apply-frontend.ps1
# Εφαρμογή myDATA batch στο frontend (C:\thesis-frontend)
#
# Χρήση:
#   cd C:\thesis-frontend
#   .\apply-frontend.ps1

$ErrorActionPreference = 'Stop'
$repo = 'C:\thesis-frontend'

if (-not (Test-Path $repo)) { throw "Repo path $repo not found" }
Set-Location $repo

$src = "$env:USERPROFILE\Downloads\thesis-mydata\frontend"
if (-not (Test-Path $src)) { throw "Δεν βρήκα $src — extract πρώτα το thesis-mydata.zip στο Downloads." }

# --- 1. Copy new files ---
Copy-Item "$src\MyDataPanel.jsx" -Destination "src\pages\Invoices\MyDataPanel.jsx" -Force
Copy-Item "$src\invoicePdf.js"   -Destination "src\utils\invoicePdf.js"           -Force
Write-Host "OK: 2 frontend files copied (MyDataPanel + invoicePdf with QR)"

# --- 2. Patch api.js — προσθήκη mydata export ---
$apiPath = 'src\api.js'
$api     = Get-Content $apiPath -Raw -Encoding UTF8

if ($api -match "export const mydata\s*=") {
    Write-Host "SKIP: api.js mydata module already present"
} else {
    $mydataBlock = @"

export const mydata = {
  send:   (invoiceId, invoiceType, correlatedMark) => api.post(`/api/mydata/invoices/`+invoiceId+`/send`, { invoiceType, correlatedMark }),
  cancel: (invoiceId)              => api.post(`/api/mydata/invoices/`+invoiceId+`/cancel`, {}),
  status: (invoiceId)              => api.get(`/api/mydata/invoices/`+invoiceId+`/status`),
  health: ()                       => api.get(`/api/mydata/health`),
};
"@
    # Πρόσθεσέ το στο τέλος του αρχείου
    $api = $api.TrimEnd() + "`r`n" + $mydataBlock + "`r`n"
    Set-Content $apiPath $api -NoNewline -Encoding UTF8
    Write-Host "OK: api.js patched (mydata module)"
}

# --- 3. Patch InvoiceEdit.jsx — 2 σημεία: import + render ---
$iePath = 'src\pages\Invoices\InvoiceEdit.jsx'
$ie     = Get-Content $iePath -Raw -Encoding UTF8

$importNeedle = "import { generateInvoicePdf } from '../../utils/invoicePdf';"
$importAdd    = "import { generateInvoicePdf } from '../../utils/invoicePdf';`r`nimport MyDataPanel from './MyDataPanel';"

if ($ie.Contains("import MyDataPanel")) {
    Write-Host "SKIP: MyDataPanel import already present in InvoiceEdit"
} elseif ($ie.Contains($importNeedle)) {
    $ie = $ie.Replace($importNeedle, $importAdd)
    Write-Host "OK: MyDataPanel import added"
} else {
    Write-Warning "Δεν βρήκα το import needle στο InvoiceEdit — πρόσθεσε χειροκίνητα: import MyDataPanel from './MyDataPanel';"
}

# Render — μπαίνει στο τέλος του status bar section, αμέσως μετά το κλείσιμο του status div
# Χρησιμοποιώ μια πολύ συγκεκριμένη γραμμή για ασφάλεια
$renderNeedle = "      {/* Status bar */}"
$renderAnchor = "      {/* myDATA panel */}"

if ($ie.Contains($renderAnchor)) {
    Write-Host "SKIP: MyDataPanel render already present"
} elseif ($ie.Contains($renderNeedle)) {
    # Βάζω το panel μέσα σε ένα conditional που δείχνει μόνο για μη-draft (issued/cancelled) invoices
    # Το βάζω ακριβώς πάνω από το status bar, γιατί το status bar πάει πάντα στην κορυφή
    $renderInject = @"
      {/* myDATA panel */}
      {form.aa && form.status !== 'draft' && (
        <MyDataPanel invoiceId={form.aa} invoiceStatus={form.status} />
      )}

      {/* Status bar */}
"@
    $ie = $ie.Replace($renderNeedle, $renderInject)
    Write-Host "OK: MyDataPanel render added"
} else {
    Write-Warning "Δεν βρήκα το render anchor στο InvoiceEdit — πρόσθεσε χειροκίνητα το panel μετά το status bar"
}

Set-Content $iePath $ie -NoNewline -Encoding UTF8

# --- 4. Patch OrganizationSettings.jsx — νέο section myDATA πριν το κουμπί αποθήκευσης ---
$osPath = 'src\pages\OrganizationSettings.jsx'
$os     = Get-Content $osPath -Raw -Encoding UTF8

$anchor = "      {isAdmin && ("

$mydataSection = @"
      <div className="section">
        <h2>myDATA — Διαβίβαση στην ΑΑΔΕ</h2>
        <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 13, color: '#4a5568' }}>
          Τα credentials βρίσκονται στο portal myDATA της ΑΑΔΕ. Στο dev περιβάλλον χρησιμοποίησε test κωδικούς — δεν έχουν φορολογική δεσμευτικότητα.
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>Περιβάλλον</label>
            <select value={form.mydata_environment || 'dev'} onChange={c('mydata_environment')} disabled={!isAdmin}>
              <option value="dev">Sandbox (dev)</option>
              <option value="prod">Παραγωγή (prod)</option>
            </select>
          </div>
          <div />
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>myDATA User ID</label>
            <input type="text" value={form.mydata_user_id || ''} onChange={c('mydata_user_id')} disabled={!isAdmin} autoComplete="off" />
          </div>
          <div className="form-group">
            <label>myDATA Subscription Key</label>
            <input type="password" value={form.mydata_subscription_key || ''} onChange={c('mydata_subscription_key')} disabled={!isAdmin} autoComplete="new-password" />
          </div>
        </div>
        <div className="form-grid-3">
          <div className="form-group">
            <label>Προεπιλεγμένος τύπος παραστατικού</label>
            <select value={form.mydata_default_invoice_type || '2.1'} onChange={c('mydata_default_invoice_type')} disabled={!isAdmin}>
              <option value="2.1">2.1 — Παροχή Υπηρεσιών</option>
              <option value="1.1">1.1 — Πώληση</option>
            </select>
          </div>
          <div className="form-group">
            <label>Κατηγορία εσόδου (classificationType)</label>
            <input type="text" value={form.mydata_classification_type || 'E3_561_001'} onChange={c('mydata_classification_type')} disabled={!isAdmin} placeholder="E3_561_001" />
          </div>
          <div className="form-group">
            <label>Υποκατηγορία (classificationCategory)</label>
            <input type="text" value={form.mydata_classification_category || 'category1_3'} onChange={c('mydata_classification_category')} disabled={!isAdmin} placeholder="category1_3" />
          </div>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button
              type="button"
              className="btn btn-sm"
              onClick={async () => {
                try {
                  const { mydata } = await import('../api');
                  setError(''); setSaved(false);
                  const r = await mydata.health();
                  if (r.ok) {
                    setError('');
                    setSaved(false);
                    alert('✓ ' + r.message);
                  } else {
                    alert('✕ ' + r.message);
                  }
                } catch (e) { alert('✕ ' + e.message); }
              }}
              disabled={!isAdmin}
            >
              🔍 Έλεγχος myDATA credentials
            </button>
            <span style={{ fontSize: 12, color: '#4a5568' }}>
              Κάνει ένα test call στο ΑΑΔΕ για να επιβεβαιώσει ότι User ID + Subscription Key είναι σωστά.
            </span>
          </div>
        </div>
      </div>

"@

if ($os.Contains("myDATA — Διαβίβαση")) {
    Write-Host "SKIP: OrganizationSettings myDATA section already present"
} elseif ($os.Contains($anchor)) {
    $os = $os.Replace($anchor, $mydataSection + $anchor)
    Set-Content $osPath $os -NoNewline -Encoding UTF8
    Write-Host "OK: OrganizationSettings myDATA section added"
} else {
    Write-Warning "Δεν βρήκα το anchor στο OrganizationSettings — πρόσθεσε χειροκίνητα"
}

Write-Host ""
Write-Host "=== Frontend patches εφαρμόστηκαν. ==="
Write-Host "Trέξε build για verification:"
Write-Host "  npm run build"
Write-Host ""
Write-Host "Και commit + push από cmd:"
Write-Host "  cd C:\thesis-frontend"
Write-Host "  git add -A"
Write-Host "  git commit -m ""myDATA integration UI (send/cancel/status panel + org credentials)"""
Write-Host "  git push origin main"
