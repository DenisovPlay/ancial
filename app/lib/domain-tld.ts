/**
 * Похоже ли слово без схемы на адрес сайта. «звуке.Мелкие» и «end.Next» — это опечатка без пробела после точки, а не домен:
 * зона (последняя часть) должна быть настоящей. Проверка не зависит от языка текста вокруг. С явной схемой (https://…) слово
 * считается ссылкой как есть: человек сам написал, что это адрес.
 */

const COUNTRY = 'ac ad ae af ag ai al am ao aq ar as at au aw ax az ba bb bd be bf bg bh bi bj bm bn bo br bs bt bw by bz ca cc cd cf cg ch ci ck cl cm cn co cr cu cv cw cx cy cz de dj dk dm do dz ec ee eg er es et eu fi fj fk fm fo fr ga gd ge gf gg gh gi gl gm gn gp gq gr gs gt gu gw gy hk hm hn hr ht hu id ie il im in io iq ir is it je jm jo jp ke kg kh ki km kn kp kr kw ky kz la lb lc li lk lr ls lt lu lv ly ma mc md me mg mh mk ml mm mn mo mp mq mr ms mt mu mv mw mx my mz na nc ne nf ng ni nl no np nr nu nz om pa pe pf pg ph pk pl pm pn pr ps pt pw py qa re ro rs ru rw sa sb sc sd se sg sh si sk sl sm sn so sr ss st su sv sx sy sz tc td tf tg th tj tk tl tm tn to tr tt tv tw tz ua ug uk us uy uz va vc ve vg vi vn vu wf ws ye yt za zm zw';

const GENERIC = 'com org net edu gov mil int info biz name pro mobi asia tel travel jobs museum coop aero cat xxx app dev page cloud online site store shop tech club live news blog link wiki space website media music video studio design agency digital network systems solutions services company group team world today life love fun top vip xyz art cool email chat game games zone host press tools work works click download party science stream trade date win men loan bid academy city center money bank pay finance fund capital market movie film photo photos pics pictures gallery gold diamonds fashion style beauty health care clinic hospital doctor dental fitness yoga sport sports football golf bike cars car auto taxi tours flights hotel hotels restaurant cafe coffee bar pub beer wine food kitchen recipes pizza education school college university institute science lab labs engineering software code codes tools tips guide guru expert ninja rocks one plus pink red blue black green social community forum events event party tickets promo sale deals discount coupons shopping boutique market mall bio eco green earth garden land estate realty homes house apartments rent properties construction build builders support help care contact direct express global international ltd inc llc gmbh llp ventures partners holdings enterprises industries consulting marketing media agency ads advertising'

// Кириллические зоны (в нижнем регистре) и punycode-вид любых национальных зон.
const CYRILLIC = 'рф бел дети москва онлайн орг рус сайт срб укр католик ком мкд бг ею қаз мон';

const KNOWN = new Set(`${COUNTRY} ${GENERIC} ${CYRILLIC}`.split(/\s+/));

/** Расширения файлов, которые совпадают с настоящими зонами (.md — Молдавия, .sh — Св. Елена…): без схемы это имя файла, а не сайт. */
const FILE_LIKE = new Set(['md', 'py', 'sh', 'pl', 'rs', 'cc']);

export function isKnownTld(tld: string): boolean {
  const lower = tld.toLowerCase();
  return KNOWN.has(lower) || lower.startsWith('xn--');
}

/**
 * Годится ли слово без схемы на роль адреса: настоящая зона и не «слово.Слово» (зона с заглавной после строчной —
 * так выглядит предложение, склеенное без пробела). Слово со схемой, путём или @ проверяется как обычно.
 */
export function isPlausibleBareDomain(candidate: string): boolean {
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) return true;
  const host = candidate.split(/[/?#:]/, 1)[0];
  const labels = host.split('.');
  if (labels.length < 2) return false;
  const tld = labels[labels.length - 1];
  if (!isKnownTld(tld)) return false;
  // «слове.Рус»: зона «С Заглавной» после строчной буквы — граница предложения, а не домен.
  const before = labels[labels.length - 2];
  if (/^\p{Lu}\p{Ll}/u.test(tld) && /\p{Ll}$/u.test(before)) return false;
  // «README.md», «setup.sh»: без схемы и пути это скорее файл.
  if (FILE_LIKE.has(tld.toLowerCase()) && candidate === host && /^[\p{Lu}\p{Ll}0-9_-]+$/u.test(before)) {
    return !/^(readme|license|changelog|setup|install|run|build|test|main|index|app|script)$/i.test(before);
  }
  return true;
}
