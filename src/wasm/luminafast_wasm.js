/* @ts-self-types="./luminafast_wasm.d.ts" */

/**
 * Wrapper WASM pour PixelFilters
 */
export class PixelFiltersWasm {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        PixelFiltersWasmFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_pixelfilterswasm_free(ptr, 0);
    }
    /**
     * @returns {number}
     */
    get clarity() {
        const ret = wasm.__wbg_get_pixelfilterswasm_clarity(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get color_temp() {
        const ret = wasm.__wbg_get_pixelfilterswasm_color_temp(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get contrast() {
        const ret = wasm.__wbg_get_pixelfilterswasm_contrast(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get exposure() {
        const ret = wasm.__wbg_get_pixelfilterswasm_exposure(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get highlights() {
        const ret = wasm.__wbg_get_pixelfilterswasm_highlights(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get saturation() {
        const ret = wasm.__wbg_get_pixelfilterswasm_saturation(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get shadows() {
        const ret = wasm.__wbg_get_pixelfilterswasm_shadows(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get tint() {
        const ret = wasm.__wbg_get_pixelfilterswasm_tint(this.__wbg_ptr);
        return ret;
    }
    /**
     * @returns {number}
     */
    get vibrance() {
        const ret = wasm.__wbg_get_pixelfilterswasm_vibrance(this.__wbg_ptr);
        return ret;
    }
    /**
     * Applique tous les filtres pixel
     * @param {Uint8Array} pixels
     * @param {number} width
     * @param {number} height
     * @returns {Uint8Array}
     */
    apply_filters(pixels, width, height) {
        try {
            const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
            const ptr0 = passArray8ToWasm0(pixels, wasm.__wbindgen_export);
            const len0 = WASM_VECTOR_LEN;
            wasm.pixelfilterswasm_apply_filters(retptr, this.__wbg_ptr, ptr0, len0, width, height);
            var r0 = getDataViewMemory0().getInt32(retptr + 4 * 0, true);
            var r1 = getDataViewMemory0().getInt32(retptr + 4 * 1, true);
            var r2 = getDataViewMemory0().getInt32(retptr + 4 * 2, true);
            var r3 = getDataViewMemory0().getInt32(retptr + 4 * 3, true);
            if (r3) {
                throw takeObject(r2);
            }
            var v2 = getArrayU8FromWasm0(r0, r1).slice();
            wasm.__wbindgen_export2(r0, r1 * 1, 1);
            return v2;
        } finally {
            wasm.__wbindgen_add_to_stack_pointer(16);
        }
    }
    /**
     * @param {number} exposure
     * @param {number} contrast
     * @param {number} saturation
     * @param {number} highlights
     * @param {number} shadows
     * @param {number} clarity
     * @param {number} vibrance
     * @param {number} color_temp
     * @param {number} tint
     */
    constructor(exposure, contrast, saturation, highlights, shadows, clarity, vibrance, color_temp, tint) {
        const ret = wasm.pixelfilterswasm_new(exposure, contrast, saturation, highlights, shadows, clarity, vibrance, color_temp, tint);
        this.__wbg_ptr = ret >>> 0;
        PixelFiltersWasmFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
    /**
     * @param {number} arg0
     */
    set clarity(arg0) {
        wasm.__wbg_set_pixelfilterswasm_clarity(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set color_temp(arg0) {
        wasm.__wbg_set_pixelfilterswasm_color_temp(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set contrast(arg0) {
        wasm.__wbg_set_pixelfilterswasm_contrast(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set exposure(arg0) {
        wasm.__wbg_set_pixelfilterswasm_exposure(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set highlights(arg0) {
        wasm.__wbg_set_pixelfilterswasm_highlights(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set saturation(arg0) {
        wasm.__wbg_set_pixelfilterswasm_saturation(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set shadows(arg0) {
        wasm.__wbg_set_pixelfilterswasm_shadows(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set tint(arg0) {
        wasm.__wbg_set_pixelfilterswasm_tint(this.__wbg_ptr, arg0);
    }
    /**
     * @param {number} arg0
     */
    set vibrance(arg0) {
        wasm.__wbg_set_pixelfilterswasm_vibrance(this.__wbg_ptr, arg0);
    }
}
if (Symbol.dispose) PixelFiltersWasm.prototype[Symbol.dispose] = PixelFiltersWasm.prototype.free;

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_throw_39bc967c0e5a9b58: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbindgen_cast_0000000000000001: function(arg0, arg1) {
            // Cast intrinsic for `Ref(String) -> Externref`.
            const ret = getStringFromWasm0(arg0, arg1);
            return addHeapObject(ret);
        },
    };
    return {
        __proto__: null,
        "./luminafast_wasm_bg.js": import0,
    };
}

const PixelFiltersWasmFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_pixelfilterswasm_free(ptr >>> 0, 1));

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function dropObject(idx) {
    if (idx < 1028) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function getObject(idx) { return heap[idx]; }

let heap = new Array(1024).fill(undefined);
heap.push(undefined, null, true, false);

let heap_next = heap.length;

function passArray8ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 1, 1) >>> 0;
    getUint8ArrayMemory0().set(arg, ptr / 1);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('luminafast_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
