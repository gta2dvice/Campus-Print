export default function Toast({ toast }) {
  if (!toast) return null;
  const { message, type, show } = toast;
  return (
    <div
      className={`fixed bottom-6 right-6 z-[1000] flex items-center gap-3 rounded-xl border bg-white px-5 py-3.5 text-sm font-medium text-gray-900 shadow-[0_10px_25px_rgba(0,0,0,0.08),0_4px_8px_rgba(0,0,0,0.04)] transition-all duration-350 ${
        show ? 'translate-y-0 opacity-100' : 'translate-y-[100px] opacity-0'
      } ${type === 'error' ? 'border-l-[3px] border-l-red-500 border-y-gray-200 border-r-gray-200' : 'border-l-[3px] border-l-emerald-500 border-y-gray-200 border-r-gray-200'}`}
    >
      <span className="text-[1.1rem]">{type === 'error' ? '✕' : '✓'}</span>
      <span>{message}</span>
    </div>
  );
}
