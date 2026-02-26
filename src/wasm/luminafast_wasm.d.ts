/* tslint:disable */

/**
 * Wrapper WASM pour PixelFilters
 */
export class PixelFiltersWasm {
  free(): void;
  [Symbol.dispose](): void;
  /**
   * Applique tous les filtres pixel
   */
  apply_filters(pixels: Uint8Array, width: number, height: number): Uint8Array;
  constructor(
    exposure: number,
    contrast: number,
    saturation: number,
    highlights: number,
    shadows: number,
    clarity: number,
    vibrance: number,
    color_temp: number,
    tint: number,
  );
  clarity: number;
  color_temp: number;
  contrast: number;
  exposure: number;
  highlights: number;
  saturation: number;
  shadows: number;
  tint: number;
  vibrance: number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_get_pixelfilterswasm_clarity: (a: number) => number;
  readonly __wbg_get_pixelfilterswasm_color_temp: (a: number) => number;
  readonly __wbg_get_pixelfilterswasm_contrast: (a: number) => number;
  readonly __wbg_get_pixelfilterswasm_exposure: (a: number) => number;
  readonly __wbg_get_pixelfilterswasm_highlights: (a: number) => number;
  readonly __wbg_get_pixelfilterswasm_saturation: (a: number) => number;
  readonly __wbg_get_pixelfilterswasm_shadows: (a: number) => number;
  readonly __wbg_get_pixelfilterswasm_tint: (a: number) => number;
  readonly __wbg_get_pixelfilterswasm_vibrance: (a: number) => number;
  readonly __wbg_pixelfilterswasm_free: (a: number, b: number) => void;
  readonly __wbg_set_pixelfilterswasm_clarity: (a: number, b: number) => void;
  readonly __wbg_set_pixelfilterswasm_color_temp: (a: number, b: number) => void;
  readonly __wbg_set_pixelfilterswasm_contrast: (a: number, b: number) => void;
  readonly __wbg_set_pixelfilterswasm_exposure: (a: number, b: number) => void;
  readonly __wbg_set_pixelfilterswasm_highlights: (a: number, b: number) => void;
  readonly __wbg_set_pixelfilterswasm_saturation: (a: number, b: number) => void;
  readonly __wbg_set_pixelfilterswasm_shadows: (a: number, b: number) => void;
  readonly __wbg_set_pixelfilterswasm_tint: (a: number, b: number) => void;
  readonly __wbg_set_pixelfilterswasm_vibrance: (a: number, b: number) => void;
  readonly pixelfilterswasm_apply_filters: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
  ) => void;
  readonly pixelfilterswasm_new: (
    a: number,
    b: number,
    c: number,
    d: number,
    e: number,
    f: number,
    g: number,
    h: number,
    i: number,
  ) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_export: (a: number, b: number) => number;
  readonly __wbindgen_export2: (a: number, b: number, c: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init(
  module_or_path?:
    | { module_or_path: InitInput | Promise<InitInput> }
    | InitInput
    | Promise<InitInput>,
): Promise<InitOutput>;
