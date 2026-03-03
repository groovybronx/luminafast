/* @ts-self-types="./luminafast_wasm.d.ts" */
/* global FinalizationRegistry */

/**
 * ============================================================================
 * WRAPPER WASM POUR FILTRES PIXELS - PixelFiltersWasm
 * ============================================================================
 *
 * Cette classe encapsule les filtres d'image WebAssembly générés par wasm-bindgen,
 * permettant l'application efficace d'ajustements photo complexes directement dans
 * le contexte JavaScript du frontend.
 *
 * RESPONSABILITÉS PRINCIPALES:
 * ──────────────────────────
 * 1. Encapsuler les getters/setters pour les paramètres de filtres (9 paramètres)
 * 2. Exposer apply_filters() pour traiter des données pixels RGBA (Uint8Array)
 * 3. Gérer automatiquement la libération mémoire WASM via FinalizationRegistry
 * 4. Maintenir un pointeur brut (__wbg_ptr) vers l'objet alloué en mémoire WASM
 *
 * PARAMÈTRES DE FILTRE (constructeur + getters/setters):
 * ───────────────────
 * - exposure:   Ajustement de la luminosité globale (-∞ à +∞, typiquement ±2)
 * - contrast:   Augmentation/réduction du contraste (0.5 à 2.0 généralement)
 * - saturation: Intensité des couleurs (0 = noir/blanc, 1 = normal, >1 = saturé)
 * - highlights: Récupération des tons clairs surexposés (0 à 100)
 * - shadows:    Remontée des tons sombres (0 à 100)
 * - clarity:    Amélioration de la netteté percée (0 à 100)
 * - vibrance:   Saturation intelligente préservant les teintes (0 à 100)
 * - color_temp: Température de couleur en Kelvin (3000-10000K ou décalage relatif)
 * - tint:       Décalage vert-magenta (-100 à +100)
 *
 * GESTION MÉMOIRE:
 * ────────────────
 * - Les instances allouent de la mémoire dans le heap WASM via le constructeur
 * - FinalizationRegistry enregistre automatiquement chaque instance
 * - À la destruction GC, __wbg_pixelfilterswasm_free() libère la mémoire WASM
 * - Appel manuel free() recommandé pour contrôle immédiat (non bloquant)
 *
 * UTILISATION TYPIQUE:
 * ────────────────────
 * @example
 * // Créer un instance avec paramètres initiaux
 * const filters = new PixelFiltersWasm(0, 0, 0, 0, 0, 0, 0, 0, 0);
 *
 * // Ajuster les paramètres (via setters)
 * filters.exposure = 0.5;      // +0.5 EV
 * filters.contrast = 1.2;      // +20% de contraste
 * filters.saturation = 1.3;    // +30% de saturation
 *
 * // Appliquer les filtres à des pixels RGBA
 * const imageData = ctx.getImageData(0, 0, width, height);
 * const filteredPixels = filters.apply_filters(imageData.data, width, height);
 *
 * // Résultat: Uint8Array des pixels traités (même longueur que input)
 * imageData.data.set(filteredPixels);
 * ctx.putImageData(imageData, 0, 0);
 *
 * // Libérer la mémoire WASM explicitement
 * filters.free();  // ou compter sur le FinalizationRegistry
 */
export class PixelFiltersWasm {
  /**
   * Détruit l'objet et récupère le pointeur brut vers la mémoire WASM
   *
   * Cette méthode INTERNE:
   * 1. Sauvegarde le pointeur (__wbg_ptr) vers la structure Rust allouée
   * 2. Invalide le pointeur local (set to 0) pour éviter double-free
   * 3. Désenregistre l'instance du FinalizationRegistry
   * 4. Retourne le pointeur pour passage à __wbg_pixelfilterswasm_free()
   *
   * Ne pas appeler directement — utiliser free() à la place.
   *
   * @private
   * @returns {number} Le pointeur brut vers l'allocation mémoire WASM
   */
  __destroy_into_raw() {
    const ptr = this.__wbg_ptr;
    this.__wbg_ptr = 0;
    PixelFiltersWasmFinalization.unregister(this);
    return ptr;
  }

  /**
   * Libère la mémoire allouée pour cette instance
   *
   * IMPORTANT: Cette méthode doit être appelée explicitement quand l'instance
   * n'est plus utilisée, surtout dans des boucles intensives ou lors du
   * changement de filtre. Le FinalizationRegistry capturera aussi les instances
   * orphelines, mais cela sera plus lent.
   *
   * Après free() -> cette instance ne peut plus être utilisée.
   *
   * @public
   */
  free() {
    const ptr = this.__destroy_into_raw();
    wasm.__wbg_pixelfilterswasm_free(ptr, 0);
  }
  // ═══════════════════════════════════════════════════════════════════════════
  // ACCESSEURS (GETTERS/SETTERS) POUR LES 9 PARAMÈTRES DE FILTRE
  // ═══════════════════════════════════════════════════════════════════════════
  // Chaque accesseur appelle une fonction WASM correspondante pour lire/écrire
  // directement en mémoire WASM. Aucun calcul ou validation côté JS.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Getter: Récupère la valeur actuelle de clarté
   * @returns {number} Valeur de clarté (0-100 ou plus)
   */
  get clarity() {
    const ret = wasm.__wbg_get_pixelfilterswasm_clarity(this.__wbg_ptr);
    return ret;
  }

  /**
   * Getter: Température de couleur en Kelvin ou décalage
   * @returns {number}
   */
  get color_temp() {
    const ret = wasm.__wbg_get_pixelfilterswasm_color_temp(this.__wbg_ptr);
    return ret;
  }

  /**
   * Getter: Multiplicateur de contraste
   * @returns {number} (0.5 = moins de contraste, 1.0 = normal, 2.0 = très contrasté)
   */
  get contrast() {
    const ret = wasm.__wbg_get_pixelfilterswasm_contrast(this.__wbg_ptr);
    return ret;
  }

  /**
   * Getter: Ajustement d'exposition (arrêts EV)
   * @returns {number} (-2 = plus sombre, 0 = normal, +2 = plus clair)
   */
  get exposure() {
    const ret = wasm.__wbg_get_pixelfilterswasm_exposure(this.__wbg_ptr);
    return ret;
  }

  /**
   * Getter: Récupération des highlights (tons clairs)
   * @returns {number} (0-100, redresse les zones surexposées)
   */
  get highlights() {
    const ret = wasm.__wbg_get_pixelfilterswasm_highlights(this.__wbg_ptr);
    return ret;
  }

  /**
   * Getter: Intensité de saturation des couleurs
   * @returns {number} (0 = B&W, 1.0 = normal, 2.0 = très saturé)
   */
  get saturation() {
    const ret = wasm.__wbg_get_pixelfilterswasm_saturation(this.__wbg_ptr);
    return ret;
  }

  /**
   * Getter: Remontée des ombres (tons sombres)
   * @returns {number} (0-100, illumine les zones sombre)
   */
  get shadows() {
    const ret = wasm.__wbg_get_pixelfilterswasm_shadows(this.__wbg_ptr);
    return ret;
  }

  /**
   * Getter: Décalage vert-magenta (teinte fine)
   * @returns {number} (-100 = vert, 0 = neutre, +100 = magenta)
   */
  get tint() {
    const ret = wasm.__wbg_get_pixelfilterswasm_tint(this.__wbg_ptr);
    return ret;
  }

  /**
   * Getter: Saturation intelligente préservant teintes
   * @returns {number} (0-100, moins agressif que saturation)
   */
  get vibrance() {
    const ret = wasm.__wbg_get_pixelfilterswasm_vibrance(this.__wbg_ptr);
    return ret;
  }

  /**
   * Applique TOUS les filtres pixel en une seule passe WASM
   *
   * FORMAT D'ENTRÉE ET SORTIE:
   * ─────────────────────────
   * pixels: Uint8Array au format RGBA linéaire
   *   - Structure: [R0, G0, B0, A0, R1, G1, B1, A1, ...]
   *   - Longueur: width × height × 4 octets
   *   - Exemple: pour image 100×100 → 40,000 octets
   *
   * width, height: Dimensions de l'image en pixels
   *
   * RETOUR:
   * ──────
   * Uint8Array const new Uint8Array avec pixels traités (même format RGBA)
   * Aucune validation — si dimensions invalides → comportement indéfini.
   *
   * PERFORMANCE:
   * ────────────
   * - Exécution en code machine compilé Rust → TRÈS rapide
   * - Tous les 9 filtres appliqués en parallèle lors du scan pixel
   * - Recommended: ≤ 10 appels/seconde en temps réel (preview)
   *
   * EXEMPLE:
   * ─────────
   * const canvas = document.getElementById('preview');
   * const ctx = canvas.getContext('2d');
   * const origImage = ctx.getImageData(0, 0, 100, 100);
   *
   * const filtered = filters.apply_filters(origImage.data, 100, 100);
   * origImage.data.set(filtered);
   * ctx.putImageData(origImage, 0, 0);
   *
   * @param {Uint8Array} pixels - Buffer RGBA des pixels à traiter
   * @param {number} width - Largeur de l'image en pixels
   * @param {number} height - Hauteur de l'image en pixels
   * @returns {Uint8Array} Pixels filtrés (même longueur que input)
   * @throws {Error} Si WASM rencontre une erreur (rare — format de données)
   */
  apply_filters(pixels, width, height) {
    try {
      // Allouer 4 slots stack pour résultats WASM (ptr, len, error_ptr, error_flag)
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);

      // Copier pixels JS → heap WASM, retourner pointeur + longueur
      const ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_export);
      const len0 = WASM_VECTOR_LEN;

      // APPEL WASM RÉEL: apply_filters demande traitement
      wasm.pixelfilterswasm_apply_filters(retptr, this.__wbg_ptr, ptr0, len0, width, height);

      // Lire résultats du stack WASM (DataView 32-bit little-endian)
      var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true); // ptr résultat
      var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true); // len résultat
      var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true); // erreur ptr
      var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true); // erreur flag

      // Vérifier s'il y a erreur et throw si oui
      if (r3) {
        throw takeObject(r2);
      }

      // Copier résultat WASM heap → JS Uint8Array (slice = copie, non référence)
      var v2 = getArrayU8FromWasm0(r0, r1).slice();

      // Libérer mémoire temporaire WASM utilisée pour le résultat
      wasm.__wbindgen_export2(r0, r1 * 1, 1);

      return v2;
    } finally {
      // Libérer stack WASM (nettoyer après l'appel, même si erreur)
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  /**
   * Constructeur: Alloue une nouvelle instance avec paramètres initiaux
   *
   * Chaque paramètre est un nombre JavaScript (f64/f32) converti automatiquement
   * en type Rust et stocké dans la structure WASM allouée.
   *
   * @param {number} exposure   - Ajustement d'exposition (EV stops)
   * @param {number} contrast   - Multiplicateur de contraste
   * @param {number} saturation - Intensité saturation
   * @param {number} highlights - Récupération highlights (0-100)
   * @param {number} shadows    - Remontée shadows (0-100)
   * @param {number} clarity    - Clarté (0-100)
   * @param {number} vibrance   - Saturation intelligente (0-100)
   * @param {number} color_temp - Température couleur (Kelvin)
   * @param {number} tint       - Tint vert-magenta (-100 à +100)
   */
  constructor(
    exposure,
    contrast,
    saturation,
    highlights,
    shadows,
    clarity,
    vibrance,
    color_temp,
    tint,
  ) {
    // Appel WASM pour allouer la structure Rust + retourner pointeur
    const ret = wasm.pixelfilterswasm_new(
      exposure,
      contrast,
      saturation,
      highlights,
      shadows,
      clarity,
      vibrance,
      color_temp,
      tint,
    );
    // Convertir pointeur 32-bit en nombre uint (masquer vers 0 les bits hauts)
    this.__wbg_ptr = ret >>> 0;
    // Enregistrer instance pour garbage collection + libération mémoire WASM
    PixelFiltersWasmFinalization.register(this, this.__wbg_ptr, this);
    return this;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // SETTERS (MUTATEURS) POUR LES 9 PARAMÈTRES DE FILTRE
  // ═══════════════════════════════════════════════════════════════════════════
  // Chaque setter appelle une fonction WASM pour mettre à jour la valeur
  // en mémoire. Utile pour UI interactive (sliders temps réel).
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Setter: Met à jour la clarté
   * @param {number} arg0 - Nouvelle valeur (0-100)
   */
  set clarity(arg0) {
    wasm.__wbg_set_pixelfilterswasm_clarity(this.__wbg_ptr, arg0);
  }

  /**
   * Setter: Met à jour la température de couleur
   * @param {number} arg0 - Nouvelle valeur (Kelvin ou décalage)
   */
  set color_temp(arg0) {
    wasm.__wbg_set_pixelfilterswasm_color_temp(this.__wbg_ptr, arg0);
  }

  /**
   * Setter: Met à jour le contraste
   * @param {number} arg0 - Nouvelle valeur (0.5-2.0 généralement)
   */
  set contrast(arg0) {
    wasm.__wbg_set_pixelfilterswasm_contrast(this.__wbg_ptr, arg0);
  }

  /**
   * Setter: Met à jour l'exposition
   * @param {number} arg0 - Nouvelle valeur (EV stops, ±2)
   */
  set exposure(arg0) {
    wasm.__wbg_set_pixelfilterswasm_exposure(this.__wbg_ptr, arg0);
  }

  /**
   * Setter: Met à jour la récupération des highlights
   * @param {number} arg0 - Nouvelle valeur (0-100)
   */
  set highlights(arg0) {
    wasm.__wbg_set_pixelfilterswasm_highlights(this.__wbg_ptr, arg0);
  }

  /**
   * Setter: Met à jour la saturation
   * @param {number} arg0 - Nouvelle valeur (0 B&W, 1 normal, 2+ saturé)
   */
  set saturation(arg0) {
    wasm.__wbg_set_pixelfilterswasm_saturation(this.__wbg_ptr, arg0);
  }

  /**
   * Setter: Met à jour la remontée des shadows
   * @param {number} arg0 - Nouvelle valeur (0-100)
   */
  set shadows(arg0) {
    wasm.__wbg_set_pixelfilterswasm_shadows(this.__wbg_ptr, arg0);
  }

  /**
   * Setter: Met à jour la teinte (tint)
   * @param {number} arg0 - Nouvelle valeur (-100 vert, +100 magenta)
   */
  set tint(arg0) {
    wasm.__wbg_set_pixelfilterswasm_tint(this.__wbg_ptr, arg0);
  }

  /**
   * Setter: Met à jour la vibrance
   * @param {number} arg0 - Nouvelle valeur (0-100)
   */
  set vibrance(arg0) {
    wasm.__wbg_set_pixelfilterswasm_vibrance(this.__wbg_ptr, arg0);
  }
}
// Support Symbol.dispose() pour utilisation avec 'using' (ECMAScript 2022+)
if (Symbol.dispose) PixelFiltersWasm.prototype[Symbol.dispose] = PixelFiltersWasm.prototype.free;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: CONFIGURATION D'IMPORTS WASM
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * __wbg_get_imports()
 *
 * Retourne l'objet imports pour la module WebAssembly, en mapant les
 * imports Rust/wasm-bindgen vers les fonctions JavaScript disponibles.
 *
 * Les imports Rust utilisés par le module compiled:
 * - __wbg___wbindgen_throw_* : Lance une exception JS avec message
 * - __wbindgen_cast_* : Cast ad-hoc pour convertir types
 *
 * Les imports permettent au code Rust de "reverser" vers le JS en cas d'erreur
 * (peu utilisé dans ce module car logique pure).
 *
 * @returns {Object} Objet avec clé './luminafast_wasm_bg.js' -> fonctions JS
 */
function __wbg_get_imports() {
  const import0 = {
    __proto__: null,
    __wbg___wbindgen_throw_39bc967c0e5a9b58: function (arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    },
    __wbindgen_cast_0000000000000001: function (arg0, arg1) {
      // Cast intrinsic for `Ref(String) -> Externref`.
      const ret = getStringFromWasm0(arg0, arg1);
      return addHeapObject(ret);
    },
  };
  return {
    __proto__: null,
    './luminafast_wasm_bg.js': import0,
  };
}

const PixelFiltersWasmFinalization =
  typeof FinalizationRegistry === 'undefined'
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry((ptr) => wasm.__wbg_pixelfilterswasm_free(ptr >>> 0, 1));

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: GESTION MÉMOIRE JAVASCRIPT/WASM
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * FinalizationRegistry pour libération automatique mémoire WASM
 *
 * Quand une instance PixelFiltersWasm devient inaccessible (GC), le callback
 * appelle __wbg_pixelfilterswasm_free(ptr, 1) pour libérer la mémoire WASM.
 *
 * Fallback: Si FinalizationRegistry est indisponible (navigateur ancien?),
 * utilise un fallback no-op pour éviter crash.
 *
 * ATTENTION: La libération n'est PAS garantie immédiate — dépend du GC JS.
 * Pour contrôle garantie, appeler instance.free() manuellement.
 */

/**
 * addHeapObject(obj)
 *
 * Ajoute un objet JS à la "heap" d'objets tracked, retourne un ID.
 * Les objets JS non-primitifs doivent être indexés pour passer à Rust via WASM.
 *
 * Heap = Array de 1024+ slots. Index < 1028 = réservé pour primitifs (undefined, null, true, false).
 *
 * @param {*} obj - Objet JS à ajouter
 * @returns {number} ID d'index pour retrouver l'objet plus tard
 */
function addHeapObject(obj) {
  if (heap_next === heap.length) heap.push(heap.length + 1);
  const idx = heap_next;
  heap_next = heap[idx];

  heap[idx] = obj;
  return idx;
}

/**
 * dropObject(idx)
 *
 * Marque un slot heap comme "réutilisable" en le chainant dans free list.
 * Les indices < 1028 ne sont JAMAIS libérés (constantes JS).
 *
 * @param {number} idx - Index du slot à libérer
 */
function dropObject(idx) {
  if (idx < 1028) return;
  heap[idx] = heap_next;
  heap_next = idx;
}

/**
 * getArrayU8FromWasm0(ptr, len)
 *
 * Construit une TypedArray Uint8Array à partir d'une région du WASM memory buffer.
 * La TypedArray est une vue (non-copie) — modifiée si on écrit via la vue.
 *
 * @param {number} ptr - Pointeur dans le WASM linear memory
 * @param {number} len - Nombre de bytes à mapper
 * @returns {Uint8Array} Vue sur la région [ptr, ptr+len)
 */
function getArrayU8FromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: ACCÈS AU WASM MEMORY BUFFER
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * WASM Memory est un ArrayBuffer partagé:
 * - Alloué soit par Rust (Module.memory), soit fourni par JS
 * - Linear address space: 0 à capacity (en bytes)
 * - Tables de cache: optimiser accès répétés au même buffer
 */

// Cache DataView pour accès rapide 32-bit au memory WASM
let cachedDataViewMemory0 = null;
/**
 * getDataViewMemory0()
 *
 * Retourne une DataView recalée sur le WASM memory buffer (wasm.memory.buffer).
 * Cache l'objet pour éviter nouvelles allocs DataView à chaque appel.
 *
 * Retire le cache si:
 * - Le buffer été détaché (Web Workers, etc.)
 * - Ou le memory WASM a changé (rare, mais possible en dynamic resize)
 *
 * @returns {DataView} Vue non-copie du WASM memory
 */
function getDataViewMemory0() {
  if (
    cachedDataViewMemory0 === null ||
    cachedDataViewMemory0.buffer.detached === true ||
    (cachedDataViewMemory0.buffer.detached === undefined &&
      cachedDataViewMemory0.buffer !== wasm.memory.buffer)
  ) {
    cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
  }
  return cachedDataViewMemory0;
}

/**
 * getStringFromWasm0(ptr, len)
 *
 * Décode une string UTF-8 depuis le WASM memory.
 * Utilise un TextDecoder global en cache (à réinitialiser tous les 2GB).
 *
 * @param {number} ptr - Pointeur dans WASM memory vers les bytes UTF-8
 * @param {number} len - Nombre de bytes à décoder
 * @returns {string} String JavaScript décodée
 */
function getStringFromWasm0(ptr, len) {
  ptr = ptr >>> 0;
  return decodeText(ptr, len);
}

// Cache Uint8Array pour accès rapide
let cachedUint8ArrayMemory0 = null;
/**
 * getUint8ArrayMemory0()
 *
 * Retourne un Uint8Array mappé sur le WASM memory buffer.
 * Cache pour performance. Se reinitialise si buffer vide ou détaché.
 *
 * @returns {Uint8Array} Vue sur WASM memory
 */
function getUint8ArrayMemory0() {
  if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
    cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
  }
  return cachedUint8ArrayMemory0;
}

/**
 * getObject(idx)
 *
 * Récupère un objet JS stocké dans le heap à l'index donné.
 * Utilisé lors de unmarshalling de Rust vers JS.
 *
 * @param {number} idx - Index dans le heap
 * @returns {*} L'objet JS stocké
 */
function getObject(idx) {
  return heap[idx];
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: HEAP GLOBALE ET MARSHALLING DONNÉES JS ↔ WASM
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * heap: Array utilisée pour stocker références à objets JS
 *
 * Indices réservés (0-1027):
 *   0: undefined
 *   1: null
 *   2: true
 *   3: false
 *   4+: libres pour objets
 *
 * Système de free list: heap[idx] pointe utilement vers next slot libre
 * quand dropObject(idx) est appelé.
 */
let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

/**
 * heap_next: Index du prochain slot libre dans la heap
 *
 * Maintenu par addHeapObject (alloc) et dropObject (free).
 * Commence à 1028 (après les slots réservés).
 */
let heap_next = heap.length;

/**
 * passArray8ToWasm0(arg, malloc)
 *
 * Copie un Uint8Array depuis JS vers le WASM heap.
 * Appelle malloc pour allouer len bytes, puis écrit les données.
 *
 * IMPORTANT: WASM_VECTOR_LEN global doit être assigné ici par l'appelant.
 * C'est un workaround wasm-bindgen pour éviter allocations vecteur supplémentaires.
 *
 * @param {Uint8Array} arg - Buffer JS à copier
 * @param {Function} malloc - Fonction WASM pour allouer mémoire
 * @returns {number} Pointeur vers données copiées en WASM memory
 */
function passArray8ToWasm0(arg, malloc) {
  const ptr = malloc(arg.length * 1, 1) >>> 0;
  getUint8ArrayMemory0().set(arg, ptr / 1);
  WASM_VECTOR_LEN = arg.length;
  return ptr;
}

/**
 * takeObject(idx)
 *
 * Récupère un objet du heap ET le marque comme libéré.
 * Utilisé lors d'unmarshalling — chaque objet JS est "retiré" une fois.
 * Appels multiples au même idx seront undefined.
 *
 * @param {number} idx - Index du heap
 * @returns {*} L'objet (ou undefined si déjà retiré)
 */
function takeObject(idx) {
  const ret = getObject(idx);
  dropObject(idx);
  return ret;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 6: DÉCODAGE TEXTE UTF-8 ET GESTION Safari
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * TextDecoder UTF-8 global en cache.
 * Réinitialisée tous les 2GB de décodage pour éviter une limite Safari.
 */
let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();

/**
 * Limite Safari pour décodage continu avant reset.
 * Au-delà, TextDecoder.prototype peut crash silencieusement.
 */
const MAX_SAFARI_DECODE_BYTES = 2146435072;

/**
 * Métrique: octets décodés cumulatifs
 */
let numBytesDecoded = 0;

/**
 * decodeText(ptr, len)
 *
 * Décode une string UTF-8 depuis WASM memory.
 * Gère la limite Safari en réinitialisant TextDecoder si cumul dépassé.
 *
 * Workaround: Après reset, on remet le compteur à len (non pas 0).
 *
 * @param {number} ptr - Pointeur WASM memory
 * @param {number} len - Nombre de bytes
 * @returns {string} String décodée
 */
function decodeText(ptr, len) {
  numBytesDecoded += len;
  if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
    cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
    cachedTextDecoder.decode();
    numBytesDecoded = len;
  }
  return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

/**
 * WASM_VECTOR_LEN: Variable globale utilisée par passArray8ToWasm0.
 * Évite une allocation wasm-bindgen supplémentaire pour la longueur.
 * Doit être reset après chaque utilisation (normalement en wasm-bindgen glue).
 */
let WASM_VECTOR_LEN = 0;

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 7: INITIALISATION WASM MODULE
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Variables globales pour la instance WASM
 *
 * WASM_MODULE: Le Module WASM compilé (WebAssembly.Module)
 *   - Contient le code compilé (immutable, réutilisable)
 *   - Créé une fois, peut créer plusieurs instances
 *
 * wasm: L'instance WASM (WebAssembly.Instance)
 *   - Le runtime actif avec mémoire, tables, fonctions exports
 *   - Accès via wasm.FONCTION_NAME() pour appeler du code Rust
 *   - Accès via wasm.memory pour le LinearMemory buffer
 */
let WASM_MODULE_, wasm;

/**
 * __wbg_finalize_init(instance, module)
 *
 * Finalise l'initialisation WASM après instantiation.
 * Sauvegarde l'instance + module globalement et reset caches.
 *
 * Called par __wbg_load() ou __wbg_init().
 *
 * @param {WebAssembly.Instance} instance - Instance WASM créée
 * @param {WebAssembly.Module} module - Module compilé
 * @returns {Object} wasm.exports pour compatibilité
 */
function __wbg_finalize_init(instance, module) {
  wasm = instance.exports;
  WASM_MODULE_ = module;
  // Invalide les caches — ils vont se réinitialiser au prochain accès
  cachedDataViewMemory0 = null;
  cachedUint8ArrayMemory0 = null;
  return wasm;
}

/**
 * __wbg_load(module, imports)
 *
 * Charge et instancie le module WASM depuis une source (file fetch, ArrayBuffer, etc.).
 *
 * Supporte deux chemins:
 * 1. Response: Utilise WebAssembly.instantiateStreaming (rapport ratio perf/lat)
 *    Fallback sur instantiate si MIME type incorrecte (HTTP server misconfigured)
 * 2. ArrayBuffer/Blob: Convertit en bytes, instancie avec WebAssembly.instantiate
 *
 * @param {Response|ArrayBuffer|WebAssembly.Module} module - Source WASM
 * @param {Object} imports - Objet imports pour le module
 * @returns {Promise<{instance, module}>} Promesse résolue avec instance+module
 */
async function __wbg_load(module, imports) {
  if (typeof Response === 'function' && module instanceof Response) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
      try {
        return await WebAssembly.instantiateStreaming(module, imports);
      } catch (e) {
        const validResponse = module.ok && expectedResponseType(module.type);

        if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
          console.warn(
            '`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n',
            e,
          );
        } else {
          throw e;
        }
      }
    }

    // Fallback: télécharger en ArrayBuffer, puis instancier
    const bytes = await module.arrayBuffer();
    return await WebAssembly.instantiate(bytes, imports);
  } else {
    // Déjà module ou bytes — instancier directement
    const instance = await WebAssembly.instantiate(module, imports);

    if (instance instanceof WebAssembly.Instance) {
      return { instance, module };
    } else {
      return instance;
    }
  }

  /**
   * expectedResponseType(type)
   *
   * Vérifie si une HTTP Response.type correcte pour WASM.
   * Les types "basic", "cors", "default" sont tous OK.
   *
   * @param {string} type - Response.type
   * @returns {boolean}
   */
  function expectedResponseType(type) {
    switch (type) {
      case 'basic':
      case 'cors':
      case 'default':
        return true;
    }
    return false;
  }
}

/**
 * initSync(module)
 *
 * INITIALISE SYNCHRONE du module WASM (attente bloquante).
 *
 * ⚠️ NE PAS UTILISER dans le code de chargement principal — gèle le thread.
 * Utilisé principalement en tests ou worker threads.
 *
 * Si wasm déjà initié → retour sans rien faire (singleton).
 *
 * @param {WebAssembly.Module} [module] - Module pré-compilé (optionnel)
 * @returns {Object} wasm.exports une fois initialisé
 */
function initSync(module) {
  if (wasm !== undefined) return wasm;

  if (module !== undefined) {
    if (Object.getPrototypeOf(module) === Object.prototype) {
      ({ module } = module);
    } else {
      console.warn('using deprecated parameters for `initSync()`; pass a single object instead');
    }
  }

  const imports = __wbg_get_imports();
  if (!(module instanceof WebAssembly.Module)) {
    module = new WebAssembly.Module(module);
  }
  const instance = new WebAssembly.Instance(module, imports);
  return __wbg_finalize_init(instance, module);
}

/**
 * __wbg_init(module_or_path)
 *
 * INITIALISE ASYNCHRONE du module WASM.
 *
 * Résout le module depuis plusieurs sources:
 * 1. URL string → fetch() automatiquement
 * 2. URL object → fetch()
 * 3. Request object → fetch()
 * 4. ArrayBuffer → instantier directement
 * 5. undefined (default) → utilise import.meta.url
 *
 * Si wasm déjà initié → retour immédiat (singleton).
 *
 * @param {string|URL|Request|ArrayBuffer|WebAssembly.Module} [module_or_path]
 * @returns {Promise<Object>} wasm.exports une fois chargé
 */
async function __wbg_init(module_or_path) {
  if (wasm !== undefined) return wasm;

  if (module_or_path !== undefined) {
    if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
      ({ module_or_path } = module_or_path);
    } else {
      console.warn(
        'using deprecated parameters for the initialization function; pass a single object instead',
      );
    }
  }

  // Default: Charger le fichier .wasm du même répertoire
  if (module_or_path === undefined) {
    module_or_path = new URL('luminafast_wasm_bg.wasm', import.meta.url);
  }
  const imports = __wbg_get_imports();

  // Convertir string/URL en Promise<Response>
  if (
    typeof module_or_path === 'string' ||
    (typeof Request === 'function' && module_or_path instanceof Request) ||
    (typeof URL === 'function' && module_or_path instanceof URL)
  ) {
    module_or_path = fetch(module_or_path);
  }

  const { instance, module } = await __wbg_load(await module_or_path, imports);

  return __wbg_finalize_init(instance, module);
}

/**
 * EXPORTS PUBLICS
 *
 * initSync: Pour initialisation synchrone (tests, dépendances)
 * default (__wbg_init): Pour initialisation normale asynchrone
 *
 * Utilisation typique:
 *   import init, { PixelFiltersWasm } from './luminafast_wasm.js';
 *   await init(); // Charge et initialise WASM
 *   const filters = new PixelFiltersWasm(0,0,0,0,0,0,0,0,0);
 */
export { initSync, __wbg_init as default };
