// Déclaration de module pour l'import '@wasm/luminafast_wasm'
declare module '@wasm/luminafast_wasm' {
  /**
   * Le module WASM généré par wasm-pack expose une fonction d'initialisation par défaut
   * et des classes/fonctions exportées. Les types précis sont gérés via
   * l'interface WasmExports dans wasmRenderingService.ts.
   */
  const init: () => Promise<void>;
  export default init;
  export const PixelFiltersWasm: unknown;
}
