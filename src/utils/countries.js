// src/utils/countries.js
//
// Χώρες κατά ISO 3166-1 alpha-2. Η υπηκοότητα αποθηκεύεται ως κωδικός
// (GR, CY, GB…). Ίδια λίστα με το backend (src/utils/countries.js) — αν
// αλλάξει η μία, αλλάζει και η άλλη.

const RAW = `
GR|Ελλάδα|Greece|ΕΛΛΑΣ;HELLAS;HELLENIC REPUBLIC;ΕΛΛΗΝΙΚΗ;ΕΛΛΗΝΙΚΗ ΔΗΜΟΚΡΑΤΙΑ;GREEK;ΕΛ;EL;GRC
CY|Κύπρος|Cyprus|ΚΥΠΡΙΑΚΗ ΔΗΜΟΚΡΑΤΙΑ;ΚΥΠΡΙΑΚΗ;CYPRIOT;CYP
AF|Αφγανιστάν|Afghanistan|
AL|Αλβανία|Albania|ΑΛΒΑΝΙΚΗ;ALBANIAN
DZ|Αλγερία|Algeria|
AD|Ανδόρα|Andorra|
AO|Αγκόλα|Angola|
AG|Αντίγκουα και Μπαρμπούντα|Antigua and Barbuda|
AR|Αργεντινή|Argentina|
AM|Αρμενία|Armenia|
AU|Αυστραλία|Australia|AUSTRALIAN
AT|Αυστρία|Austria|AUSTRIAN
AZ|Αζερμπαϊτζάν|Azerbaijan|
BS|Μπαχάμες|Bahamas|
BH|Μπαχρέιν|Bahrain|
BD|Μπανγκλαντές|Bangladesh|
BB|Μπαρμπάντος|Barbados|
BY|Λευκορωσία|Belarus|
BE|Βέλγιο|Belgium|BELGIAN
BZ|Μπελίζ|Belize|
BJ|Μπενίν|Benin|
BT|Μπουτάν|Bhutan|
BO|Βολιβία|Bolivia|
BA|Βοσνία-Ερζεγοβίνη|Bosnia and Herzegovina|ΒΟΣΝΙΑ ΕΡΖΕΓΟΒΙΝΗ;ΒΟΣΝΙΑ
BW|Μποτσουάνα|Botswana|
BR|Βραζιλία|Brazil|
BN|Μπρουνέι|Brunei|
BG|Βουλγαρία|Bulgaria|BULGARIAN
BF|Μπουρκίνα Φάσο|Burkina Faso|
BI|Μπουρούντι|Burundi|
CV|Πράσινο Ακρωτήριο|Cabo Verde|CAPE VERDE
KH|Καμπότζη|Cambodia|
CM|Καμερούν|Cameroon|
CA|Καναδάς|Canada|CANADIAN
CF|Κεντροαφρικανική Δημοκρατία|Central African Republic|
TD|Τσαντ|Chad|
CL|Χιλή|Chile|
CN|Κίνα|China|ΛΑΙΚΗ ΔΗΜΟΚΡΑΤΙΑ ΤΗΣ ΚΙΝΑΣ;PRC;CHINESE
CO|Κολομβία|Colombia|
KM|Κομόρες|Comoros|
CG|Κονγκό|Congo|
CD|Λαϊκή Δημοκρατία του Κονγκό|Congo (DRC)|ΛΔ ΚΟΝΓΚΟ;DR CONGO
CR|Κόστα Ρίκα|Costa Rica|
CI|Ακτή Ελεφαντοστού|Côte d'Ivoire|IVORY COAST
HR|Κροατία|Croatia|
CU|Κούβα|Cuba|
CZ|Τσεχία|Czechia|CZECH REPUBLIC;ΤΣΕΧΙΚΗ ΔΗΜΟΚΡΑΤΙΑ
DK|Δανία|Denmark|DANISH
DJ|Τζιμπουτί|Djibouti|
DM|Ντομίνικα|Dominica|
DO|Δομινικανή Δημοκρατία|Dominican Republic|
EC|Ισημερινός|Ecuador|
EG|Αίγυπτος|Egypt|EGYPTIAN
SV|Ελ Σαλβαδόρ|El Salvador|
GQ|Ισημερινή Γουινέα|Equatorial Guinea|
ER|Ερυθραία|Eritrea|
EE|Εσθονία|Estonia|
SZ|Εσουατίνι|Eswatini|SWAZILAND
ET|Αιθιοπία|Ethiopia|
FJ|Φίτζι|Fiji|
FI|Φινλανδία|Finland|FINNISH
FR|Γαλλία|France|FRENCH;ΓΑΛΛΙΚΗ
GA|Γκαμπόν|Gabon|
GM|Γκάμπια|Gambia|
GE|Γεωργία|Georgia|
DE|Γερμανία|Germany|GERMAN;DEUTSCHLAND;ΓΕΡΜΑΝΙΚΗ
GH|Γκάνα|Ghana|
GD|Γρενάδα|Grenada|
GT|Γουατεμάλα|Guatemala|
GN|Γουινέα|Guinea|
GW|Γουινέα-Μπισάου|Guinea-Bissau|
GY|Γουιάνα|Guyana|
HT|Αϊτή|Haiti|
HN|Ονδούρα|Honduras|
HK|Χονγκ Κονγκ|Hong Kong|
HU|Ουγγαρία|Hungary|
IS|Ισλανδία|Iceland|
IN|Ινδία|India|INDIAN
ID|Ινδονησία|Indonesia|
IR|Ιράν|Iran|
IQ|Ιράκ|Iraq|
IE|Ιρλανδία|Ireland|IRISH;ΔΗΜΟΚΡΑΤΙΑ ΤΗΣ ΙΡΛΑΝΔΙΑΣ
IL|Ισραήλ|Israel|ISRAELI
IT|Ιταλία|Italy|ITALIAN;ITALIA;ΙΤΑΛΙΚΗ
JM|Τζαμάικα|Jamaica|
JP|Ιαπωνία|Japan|JAPANESE
JO|Ιορδανία|Jordan|
KZ|Καζακστάν|Kazakhstan|
KE|Κένυα|Kenya|
KI|Κιριμπάτι|Kiribati|
KP|Βόρεια Κορέα|North Korea|
KR|Νότια Κορέα|South Korea|KOREA;ΚΟΡΕΑ
XK|Κοσσυφοπέδιο|Kosovo|ΚΟΣΟΒΟ
KW|Κουβέιτ|Kuwait|
KG|Κιργιζία|Kyrgyzstan|
LA|Λάος|Laos|
LV|Λετονία|Latvia|
LB|Λίβανος|Lebanon|
LS|Λεσότο|Lesotho|
LR|Λιβερία|Liberia|
LY|Λιβύη|Libya|
LI|Λιχτενστάιν|Liechtenstein|
LT|Λιθουανία|Lithuania|
LU|Λουξεμβούργο|Luxembourg|
MO|Μακάο|Macao|
MG|Μαδαγασκάρη|Madagascar|
MW|Μαλάουι|Malawi|
MY|Μαλαισία|Malaysia|
MV|Μαλδίβες|Maldives|
ML|Μάλι|Mali|
MT|Μάλτα|Malta|MALTESE
MH|Νήσοι Μάρσαλ|Marshall Islands|ΜΑΡΣΑΛ
MR|Μαυριτανία|Mauritania|
MU|Μαυρίκιος|Mauritius|
MX|Μεξικό|Mexico|
FM|Μικρονησία|Micronesia|
MD|Μολδαβία|Moldova|
MC|Μονακό|Monaco|
MN|Μογγολία|Mongolia|
ME|Μαυροβούνιο|Montenegro|
MA|Μαρόκο|Morocco|
MZ|Μοζαμβίκη|Mozambique|
MM|Μιανμάρ|Myanmar|
NA|Ναμίμπια|Namibia|
NR|Ναουρού|Nauru|
NP|Νεπάλ|Nepal|
NL|Ολλανδία|Netherlands|ΚΑΤΩ ΧΩΡΕΣ;HOLLAND;DUTCH;THE NETHERLANDS
NZ|Νέα Ζηλανδία|New Zealand|
NI|Νικαράγουα|Nicaragua|
NE|Νίγηρας|Niger|
NG|Νιγηρία|Nigeria|
MK|Βόρεια Μακεδονία|North Macedonia|ΠΓΔΜ;FYROM;ΣΚΟΠΙΑ
NO|Νορβηγία|Norway|NORWEGIAN
OM|Ομάν|Oman|
PK|Πακιστάν|Pakistan|
PW|Παλάου|Palau|
PS|Παλαιστίνη|Palestine|
PA|Παναμάς|Panama|ΠΑΝΑΜΑ
PG|Παπούα Νέα Γουινέα|Papua New Guinea|
PY|Παραγουάη|Paraguay|
PE|Περού|Peru|
PH|Φιλιππίνες|Philippines|
PL|Πολωνία|Poland|POLISH
PT|Πορτογαλία|Portugal|PORTUGUESE
QA|Κατάρ|Qatar|
RO|Ρουμανία|Romania|ROMANIAN
RU|Ρωσία|Russia|ΡΩΣΙΚΗ ΟΜΟΣΠΟΝΔΙΑ;RUSSIAN FEDERATION;RUSSIAN
RW|Ρουάντα|Rwanda|
KN|Άγιος Χριστόφορος και Νέβις|Saint Kitts and Nevis|
LC|Αγία Λουκία|Saint Lucia|
VC|Άγιος Βικέντιος και Γρεναδίνες|Saint Vincent and the Grenadines|
WS|Σαμόα|Samoa|
SM|Άγιος Μαρίνος|San Marino|
ST|Σάο Τομέ και Πρίνσιπε|Sao Tome and Principe|
SA|Σαουδική Αραβία|Saudi Arabia|
SN|Σενεγάλη|Senegal|
RS|Σερβία|Serbia|
SC|Σεϋχέλλες|Seychelles|
SL|Σιέρα Λεόνε|Sierra Leone|
SG|Σιγκαπούρη|Singapore|
SK|Σλοβακία|Slovakia|
SI|Σλοβενία|Slovenia|
SB|Νήσοι Σολομώντα|Solomon Islands|
SO|Σομαλία|Somalia|
ZA|Νότια Αφρική|South Africa|
SS|Νότιο Σουδάν|South Sudan|
ES|Ισπανία|Spain|SPANISH;ESPAÑA;ESPANA
LK|Σρι Λάνκα|Sri Lanka|
SD|Σουδάν|Sudan|
SR|Σουρινάμ|Suriname|
SE|Σουηδία|Sweden|SWEDISH
CH|Ελβετία|Switzerland|SWISS;SCHWEIZ;SUISSE
SY|Συρία|Syria|
TW|Ταϊβάν|Taiwan|
TJ|Τατζικιστάν|Tajikistan|
TZ|Τανζανία|Tanzania|
TH|Ταϊλάνδη|Thailand|
TL|Ανατολικό Τιμόρ|Timor-Leste|
TG|Τόγκο|Togo|
TO|Τόνγκα|Tonga|
TT|Τρινιντάντ και Τομπάγκο|Trinidad and Tobago|
TN|Τυνησία|Tunisia|
TR|Τουρκία|Türkiye|TURKEY;TURKISH;TÜRKIYE
TM|Τουρκμενιστάν|Turkmenistan|
TV|Τουβαλού|Tuvalu|
UG|Ουγκάντα|Uganda|
UA|Ουκρανία|Ukraine|UKRAINIAN
AE|Ηνωμένα Αραβικά Εμιράτα|United Arab Emirates|ΗΑΕ;UAE;ΝΤΟΥΜΠΑΙ;DUBAI
GB|Ηνωμένο Βασίλειο|United Kingdom|ΜΕΓΑΛΗ ΒΡΕΤΑΝΙΑ;ΑΓΓΛΙΑ;ΒΡΕΤΑΝΙΑ;UK;U.K.;GREAT BRITAIN;ENGLAND;BRITISH;ΣΚΩΤΙΑ;SCOTLAND;WALES;ΟΥΑΛΙΑ;GBR
US|Ηνωμένες Πολιτείες|United States|ΗΠΑ;Η.Π.Α.;ΑΜΕΡΙΚΗ;USA;U.S.A.;US;UNITED STATES OF AMERICA;AMERICA;AMERICAN;ΗΝΩΜΕΝΕΣ ΠΟΛΙΤΕΙΕΣ ΑΜΕΡΙΚΗΣ
UY|Ουρουγουάη|Uruguay|
UZ|Ουζμπεκιστάν|Uzbekistan|
VU|Βανουάτου|Vanuatu|
VA|Βατικανό|Vatican City|
VE|Βενεζουέλα|Venezuela|
VN|Βιετνάμ|Vietnam|
YE|Υεμένη|Yemen|
ZM|Ζάμπια|Zambia|
ZW|Ζιμπάμπουε|Zimbabwe|
VG|Βρετανικές Παρθένοι Νήσοι|British Virgin Islands|BVI;ΠΑΡΘΕΝΟΙ ΝΗΣΟΙ
KY|Νήσοι Κέιμαν|Cayman Islands|ΚΕΙΜΑΝ
GI|Γιβραλτάρ|Gibraltar|
IM|Νήσος του Μαν|Isle of Man|
JE|Τζέρσεϊ|Jersey|
GG|Γκέρνσεϊ|Guernsey|
BM|Βερμούδες|Bermuda|
`;


export const COUNTRIES = RAW.trim().split('\n').map((line) => {
  const [code, el, en] = line.split('|');
  return { code, el, en };
});

// Για dropdown: Ελλάδα πρώτη, μετά αλφαβητικά στα ελληνικά
export const COUNTRY_OPTIONS = [
  ...COUNTRIES.filter(c => c.code === 'GR'),
  ...COUNTRIES.filter(c => c.code !== 'GR').sort((a, b) => a.el.localeCompare(b.el, 'el')),
];

const BY_CODE = new Map(COUNTRIES.map(c => [c.code, c]));
export const countryName = (code) => (BY_CODE.get(code) || {}).el || code || '';
