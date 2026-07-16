# run-frontend.ps1
# Unified frontend deploy: myDATA UI (panel + QR PDF) + client extras UI (GAK/EAK + tax/property tab)
# Greek strings base64-encoded to survive PS 5.x encoding.
#
# Prerequisites:
#   1. Extract thesis-batch.zip in Downloads first (see run-backend.ps1)
#   2. cd C:\thesis-frontend
#   3. Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
#   4. .\run-frontend.ps1

$ErrorActionPreference = 'Stop'
$repo = 'C:\thesis-frontend'

if (-not (Test-Path $repo)) { throw "Repo path $repo not found" }
Set-Location $repo

$src = "$env:USERPROFILE\Downloads\thesis-batch\frontend"
if (-not (Test-Path $src)) {
    Write-Host ""
    Write-Host "ERROR: Source dir not found: $src"
    Write-Host ""
    Write-Host "Run this first to extract the zip:"
    Write-Host "  Expand-Archive -Path ""`$env:USERPROFILE\Downloads\thesis-batch.zip"" -DestinationPath ""`$env:USERPROFILE\Downloads\"" -Force"
    throw "Missing source dir"
}

# Base64-decode helper
function U([string]$b) { [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String($b)) }

# Greek UI strings (base64-encoded UTF-8)
$header       = U 'bXlEQVRBIOKAlCDOlM65zrHOss6vzrLOsc+Dzrcgz4PPhM63zr0gzpHOkc6UzpU='
$creds_hint   = U 'zqTOsSBjcmVkZW50aWFscyDOss+Bzq/Pg866zr/Ovc+EzrHOuSDPg8+Ezr8gcG9ydGFsIG15REFUQSDPhM63z4IgzpHOkc6UzpUuIM6jz4TOvyBkZXYgz4DOtc+BzrnOss6szrvOu86/zr0gz4fPgc63z4POuc68zr/PgM6/zq/Ot8+DzrUgdGVzdCDOus+JzrTOuc66zr/Pjc+CIOKAlCDOtM61zr0gzq3Ph86/z4XOvSDPhs6/z4HOv867zr/Os865zrrOriDOtM61z4POvM61z4XPhM65zrrPjM+EzrfPhM6xLg=='
$env_label    = U 'zqDOtc+BzrnOss6szrvOu86/zr0='
$sandbox      = U 'U2FuZGJveCAoZGV2KQ=='
$prod         = U 'zqDOsc+BzrHOs8+JzrPOriAocHJvZCk='
$default_type = U 'zqDPgc6/zrXPgM65zrvOtc6zzrzOrc69zr/PgiDPhM+Nz4DOv8+CIM+AzrHPgc6xz4PPhM6xz4TOuc66zr/PjQ=='
$type_21      = U 'Mi4xIOKAlCDOoM6xz4HOv8+Hzq4gzqXPgM63z4HOtc+DzrnPjs69'
$type_11      = U 'MS4xIOKAlCDOoM+OzrvOt8+Dzrc='
$cat_esodou   = U 'zprOsc+EzrfOs86/z4HOr86xIM61z4PPjM60zr/PhSAoY2xhc3NpZmljYXRpb25UeXBlKQ=='
$subcat       = U 'zqXPgM6/zrrOsc+EzrfOs86/z4HOr86xIChjbGFzc2lmaWNhdGlvbkNhdGVnb3J5KQ=='
$check_btn    = U '8J+UjSDOiM67zrXOs8+Hzr/PgiBteURBVEEgY3JlZGVudGlhbHM='
$check_hint   = U 'zprOrM69zrXOuSDOrc69zrEgdGVzdCBjYWxsIM+Dz4TOvyDOkc6RzpTOlSDOs865zrEgzr3OsSDOtc+AzrnOss61zrLOsc65z47Pg861zrkgz4zPhM65IFVzZXIgSUQgKyBTdWJzY3JpcHRpb24gS2V5IM61zq/Ovc6xzrkgz4PPic+Dz4TOrC4='

# Frontend needles for FysikaEdit/NomikaEdit tabs
$stoixeia    = U 'zqPPhM6/zrnPh861zq/OsQ=='
$diefth      = U 'zpTOuc61z4XOuM+Nzr3Pg861zrnPgg=='
$tilefona    = U 'zqTOt867zq3Phs+Jzr3OsQ=='
$etairia     = U 'zpXPhM6xzrnPgc61zq/OsQ=='
$edra        = U 'zojOtM+BzrE='
$epikoinonia = U 'zpXPgM65zrrOv865zr3Pic69zq/OsQ=='
$palios_kod  = U 'zqDOsc67zrnPjM+CIM6az4nOtM65zrrPjM+C'
$fol_idiokt  = U 'zqbOv8+Bzr/Ou86/zrPOuc66zqwgJiDOmc60zrnOv866z4TOt8+Dzq/OsQ=='
$gak_label   = U 'zpPOkc6aICjOk861zr3Ouc66z4zPgiDOkc+BzrnOuM68z4zPgiDOms6xz4TOrM64zrXPg863z4Ip'
$gak_place   = U 'z4Auz4cuIDEyMzQ1LzIwMjY='
$eak_label   = U 'zpXOkc6aICjOlc65zrTOuc66z4zPgiDOkc+BzrnOuM68z4zPgiDOms6xz4TOrM64zrXPg863z4Ip'
$eak_place   = U 'z4Auz4cuIDY3ODkvMjAyNg=='
$ar_label    = U 'zpHPgc65zrjOvM+Mz4IgzrXOuc+DzrHOs8+JzrPOuc66zr/PjSDOtc6zzrPPgc6sz4bOv8+FIC8gzprPic60zrnOus+Mz4I='

Write-Host "=== Frontend deploy starting ==="
Write-Host ""

# --------------------------------------------------------------
# PART A: myDATA UI
# --------------------------------------------------------------
Write-Host "--- Part A: myDATA UI ---"

# A1. Copy files
Copy-Item "$src\MyDataPanel.jsx" -Destination "src\pages\Invoices\MyDataPanel.jsx" -Force
Copy-Item "$src\invoicePdf.js"   -Destination "src\utils\invoicePdf.js"           -Force
Write-Host "OK: MyDataPanel.jsx + invoicePdf.js copied"

# A2. Patch api.js
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
    $api = $api.TrimEnd() + "`r`n" + $mydataBlock + "`r`n"
    Set-Content $apiPath $api -NoNewline -Encoding UTF8
    Write-Host "OK: api.js patched"
}

# A3. Patch InvoiceEdit.jsx
$iePath = 'src\pages\Invoices\InvoiceEdit.jsx'
$ie     = Get-Content $iePath -Raw -Encoding UTF8

$impOld = "import { generateInvoicePdf } from '../../utils/invoicePdf';"
$impNew = "$impOld`r`nimport MyDataPanel from './MyDataPanel';"
if ($ie.Contains("import MyDataPanel")) {
    Write-Host "SKIP: InvoiceEdit MyDataPanel import already present"
} elseif ($ie.Contains($impOld)) {
    $ie = $ie.Replace($impOld, $impNew)
    Write-Host "OK: InvoiceEdit MyDataPanel import added"
}

$renOld = "      {/* Status bar */}"
$renNew = @"
      {/* myDATA panel */}
      {form.aa && form.status !== 'draft' && (
        <MyDataPanel invoiceId={form.aa} invoiceStatus={form.status} />
      )}

      {/* Status bar */}
"@
if ($ie.Contains("MyDataPanel invoiceId=")) {
    Write-Host "SKIP: InvoiceEdit MyDataPanel render already present"
} elseif ($ie.Contains($renOld)) {
    $ie = $ie.Replace($renOld, $renNew)
    Write-Host "OK: InvoiceEdit MyDataPanel render added"
}
Set-Content $iePath $ie -NoNewline -Encoding UTF8

# A4. Patch OrganizationSettings.jsx (add myDATA section with Greek via $vars)
$osPath = 'src\pages\OrganizationSettings.jsx'
$os     = Get-Content $osPath -Raw -Encoding UTF8

$anchor = "      {isAdmin && ("

$mydataSection = @"
      <div className="section">
        <h2>$header</h2>
        <div style={{ background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6, padding: 12, marginBottom: 16, fontSize: 13, color: '#4a5568' }}>
          $creds_hint
        </div>
        <div className="form-grid-2">
          <div className="form-group">
            <label>$env_label</label>
            <select value={form.mydata_environment || 'dev'} onChange={c('mydata_environment')} disabled={!isAdmin}>
              <option value="dev">$sandbox</option>
              <option value="prod">$prod</option>
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
            <label>$default_type</label>
            <select value={form.mydata_default_invoice_type || '2.1'} onChange={c('mydata_default_invoice_type')} disabled={!isAdmin}>
              <option value="2.1">$type_21</option>
              <option value="1.1">$type_11</option>
            </select>
          </div>
          <div className="form-group">
            <label>$cat_esodou</label>
            <input type="text" value={form.mydata_classification_type || 'E3_561_001'} onChange={c('mydata_classification_type')} disabled={!isAdmin} placeholder="E3_561_001" />
          </div>
          <div className="form-group">
            <label>$subcat</label>
            <input type="text" value={form.mydata_classification_category || 'category1_3'} onChange={c('mydata_classification_category')} disabled={!isAdmin} placeholder="category1_3" />
          </div>
        </div>
        <div style={{ marginTop: 12, padding: 12, background: '#f7fafc', border: '1px solid #e2e8f0', borderRadius: 6 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-sm" onClick={async () => { try { const { mydata } = await import('../api'); const r = await mydata.health(); if (r.ok) { alert('OK: ' + r.message); } else { alert('FAIL: ' + r.message); } } catch (e) { alert('FAIL: ' + e.message); } }} disabled={!isAdmin}>
              $check_btn
            </button>
            <span style={{ fontSize: 12, color: '#4a5568' }}>
              $check_hint
            </span>
          </div>
        </div>
      </div>

"@

if ($os.Contains($header)) {
    Write-Host "SKIP: OrganizationSettings myDATA section already present"
} elseif ($os.Contains($anchor)) {
    $os = $os.Replace($anchor, $mydataSection + $anchor)
    Set-Content $osPath $os -NoNewline -Encoding UTF8
    Write-Host "OK: OrganizationSettings myDATA section added"
} else {
    Write-Warning "OrganizationSettings anchor not found"
}

Write-Host ""
Write-Host "--- Part B: Client extras UI ---"

# --------------------------------------------------------------
# PART B: Client extras UI (GAK/EAK on cases + tax/property tab)
# --------------------------------------------------------------

# B1. Copy component
Copy-Item "$src\ClientCredentialsSection.jsx" -Destination "src\components\ClientCredentialsSection.jsx" -Force
Write-Host "OK: ClientCredentialsSection.jsx copied"

# B2. FysikaEdit.jsx
$fePath = 'src\pages\Fysika\FysikaEdit.jsx'
$fe     = Get-Content $fePath -Raw -Encoding UTF8

$imp1 = "import Tabs from '../../components/Tabs';"
$imp2 = "$imp1`r`nimport ClientCredentialsSection from '../../components/ClientCredentialsSection';"
if ($fe.Contains("import ClientCredentialsSection")) {
    Write-Host "SKIP: FysikaEdit import already present"
} elseif ($fe.Contains($imp1)) {
    $fe = $fe.Replace($imp1, $imp2)
    Write-Host "OK: FysikaEdit import added"
}

$oc1 = "  const onChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));"
$oc2 = "  const onChange = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));"
if ($fe.Contains("e.target.type === 'checkbox'")) {
    Write-Host "SKIP: FysikaEdit onChange already checkbox-safe"
} elseif ($fe.Contains($oc1)) {
    $fe = $fe.Replace($oc1, $oc2)
    Write-Host "OK: FysikaEdit onChange patched"
}

$feTabsOld = "          Tabs tabs={[`r`n            { label: '$stoixeia',    content: tabPersonal },`r`n            { label: '$diefth', content: tabAddresses },`r`n            { label: '$tilefona',    content: tabPhones },`r`n          ]}/>"
$feTabsNew = "          Tabs tabs={[`r`n            { label: '$stoixeia',                content: tabPersonal },`r`n            { label: '$diefth',             content: tabAddresses },`r`n            { label: '$tilefona',                content: tabPhones },`r`n            { label: '$fol_idiokt', content: <ClientCredentialsSection form={form} onChange={onChange} kind=""fysiko"" /> },`r`n          ]}/>"

if ($fe.Contains($fol_idiokt)) {
    Write-Host "SKIP: FysikaEdit 4th tab already present"
} elseif ($fe.Contains($feTabsOld)) {
    $fe = $fe.Replace($feTabsOld, $feTabsNew)
    Write-Host "OK: FysikaEdit 4th tab added"
} else {
    $feTabsOldLF = $feTabsOld.Replace("`r`n", "`n")
    if ($fe.Contains($feTabsOldLF)) {
        $fe = $fe.Replace($feTabsOldLF, $feTabsNew)
        Write-Host "OK: FysikaEdit 4th tab added (LF fallback)"
    } else {
        Write-Warning "FysikaEdit tabs needle not found"
    }
}
Set-Content $fePath $fe -NoNewline -Encoding UTF8

# B3. NomikaEdit.jsx
$nePath = 'src\pages\Nomika\NomikaEdit.jsx'
$ne     = Get-Content $nePath -Raw -Encoding UTF8

if ($ne.Contains("import ClientCredentialsSection")) {
    Write-Host "SKIP: NomikaEdit import already present"
} elseif ($ne.Contains($imp1)) {
    $ne = $ne.Replace($imp1, $imp2)
    Write-Host "OK: NomikaEdit import added"
}

if ($ne.Contains("e.target.type === 'checkbox'")) {
    Write-Host "SKIP: NomikaEdit onChange already checkbox-safe"
} elseif ($ne.Contains($oc1)) {
    $ne = $ne.Replace($oc1, $oc2)
    Write-Host "OK: NomikaEdit onChange patched"
}

$neTabsOld = "          Tabs tabs={[`r`n            { label: '$etairia',    content: tabCompany },`r`n            { label: '$edra',        content: tabAddress },`r`n            { label: '$epikoinonia', content: tabPhones },`r`n          ]}/>"
$neTabsNew = "          Tabs tabs={[`r`n            { label: '$etairia',                content: tabCompany },`r`n            { label: '$edra',                    content: tabAddress },`r`n            { label: '$epikoinonia',             content: tabPhones },`r`n            { label: '$fol_idiokt', content: <ClientCredentialsSection form={form} onChange={onChange} kind=""nomiko"" /> },`r`n          ]}/>"

if ($ne.Contains($fol_idiokt)) {
    Write-Host "SKIP: NomikaEdit 4th tab already present"
} elseif ($ne.Contains($neTabsOld)) {
    $ne = $ne.Replace($neTabsOld, $neTabsNew)
    Write-Host "OK: NomikaEdit 4th tab added"
} else {
    $neTabsOldLF = $neTabsOld.Replace("`r`n", "`n")
    if ($ne.Contains($neTabsOldLF)) {
        $ne = $ne.Replace($neTabsOldLF, $neTabsNew)
        Write-Host "OK: NomikaEdit 4th tab added (LF fallback)"
    } else {
        Write-Warning "NomikaEdit tabs needle not found"
    }
}
Set-Content $nePath $ne -NoNewline -Encoding UTF8

# B4. CaseEdit.jsx
$cePath = 'src\pages\Cases\CaseEdit.jsx'
$ce     = Get-Content $cePath -Raw -Encoding UTF8

$ceState1 = "  const [oldKod, setOldKod] = useState(caseData.old_kod || '');"
$ceState2 = "$ceState1`r`n  const [gak, setGak] = useState(caseData.gak || '');`r`n  const [eak, setEak] = useState(caseData.eak || '');`r`n  const [arithmosEisagogikou, setArithmosEisagogikou] = useState(caseData.arithmos_eisagogikou || '');"
if ($ce.Contains("const [gak, setGak]")) {
    Write-Host "SKIP: CaseEdit state already present"
} elseif ($ce.Contains($ceState1)) {
    $ce = $ce.Replace($ceState1, $ceState2)
    Write-Host "OK: CaseEdit state added"
}

$ceEff1 = "    setOldKod(caseData.old_kod || '');"
$ceEff2 = "$ceEff1`r`n    setGak(caseData.gak || '');`r`n    setEak(caseData.eak || '');`r`n    setArithmosEisagogikou(caseData.arithmos_eisagogikou || '');"
if ($ce.Contains("setGak(caseData.gak")) {
    Write-Host "SKIP: CaseEdit effect already syncs"
} elseif ($ce.Contains($ceEff1)) {
    $ce = $ce.Replace($ceEff1, $ceEff2)
    Write-Host "OK: CaseEdit effect sync added"
}

$ceSave1 = "    old_kod:                 oldKod || null,"
$ceSave2 = "$ceSave1`r`n    gak:                     gak || null,`r`n    eak:                     eak || null,`r`n    arithmos_eisagogikou:    arithmosEisagogikou || null,"
if ($ce.Contains("gak:                     gak")) {
    Write-Host "SKIP: CaseEdit save already patched"
} elseif ($ce.Contains($ceSave1)) {
    $ce = $ce.Replace($ceSave1, $ceSave2)
    Write-Host "OK: CaseEdit save patched"
}

$ceUi1 = "        <div className=""form-grid-2"">`r`n          <div className=""form-group"">`r`n            <label>$palios_kod</label>`r`n            <input type=""text"" value={oldKod} onChange={e => setOldKod(e.target.value)} />`r`n          </div>`r`n          <div />`r`n        </div>"
$ceUi2 = "$ceUi1`r`n        <div className=""form-grid-3"">`r`n          <div className=""form-group"">`r`n            <label>$gak_label</label>`r`n            <input type=""text"" value={gak} onChange={e => setGak(e.target.value)} placeholder=""$gak_place"" />`r`n          </div>`r`n          <div className=""form-group"">`r`n            <label>$eak_label</label>`r`n            <input type=""text"" value={eak} onChange={e => setEak(e.target.value)} placeholder=""$eak_place"" />`r`n          </div>`r`n          <div className=""form-group"">`r`n            <label>$ar_label</label>`r`n            <input type=""text"" value={arithmosEisagogikou} onChange={e => setArithmosEisagogikou(e.target.value)} />`r`n          </div>`r`n        </div>"

if ($ce.Contains($gak_label)) {
    Write-Host "SKIP: CaseEdit UI already patched"
} elseif ($ce.Contains($ceUi1)) {
    $ce = $ce.Replace($ceUi1, $ceUi2)
    Write-Host "OK: CaseEdit UI patched"
} else {
    $ceUi1LF = $ceUi1.Replace("`r`n", "`n")
    $ceUi2LF = $ceUi2.Replace("`r`n", "`n")
    if ($ce.Contains($ceUi1LF)) {
        $ce = $ce.Replace($ceUi1LF, $ceUi2LF)
        Write-Host "OK: CaseEdit UI patched (LF fallback)"
    } else {
        Write-Warning "CaseEdit UI needle not found"
    }
}
Set-Content $cePath $ce -NoNewline -Encoding UTF8

Write-Host ""
Write-Host "================================================================"
Write-Host "  FRONTEND DEPLOY COMPLETE"
Write-Host "================================================================"
Write-Host ""
Write-Host "NEXT STEPS:"
Write-Host ""
Write-Host "1. Verify build:"
Write-Host "   npm run build"
Write-Host ""
Write-Host "2. Commit + push from cmd:"
Write-Host "   cd C:\thesis-frontend"
Write-Host "   git add -A"
Write-Host "   git commit -m ""myDATA UI + client extras UI (GAK/EAK + tax/property tab)"""
Write-Host "   git push origin main"
Write-Host ""
