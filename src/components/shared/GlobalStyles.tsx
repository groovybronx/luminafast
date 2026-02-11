export const GlobalStyles = () => (
  <style>{`
    .custom-scrollbar::-webkit-scrollbar { width: 8px; height: 8px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #09090b; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #27272a; border-radius: 4px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3f3f46; }
    .no-scrollbar::-webkit-scrollbar { display: none; }
    .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
    @keyframes progress-fast { 0% { width: 0%; } 100% { width: 100%; } }
    .animate-progress-fast { animation: progress-fast 1.2s ease-in-out infinite; }
    .img-render { transition: filter 0.15s ease-out, transform 0.2s ease-out; }
    input[type=range] { -webkit-appearance: none; background: transparent; }
    input[type=range]::-webkit-slider-thumb { -webkit-appearance: none; height: 12px; width: 4px; background: #3b82f6; cursor: pointer; border-radius: 1px; margin-top: -4px; }
    input[type=range]::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #18181b; border-radius: 2px; }
  `}</style>
);
