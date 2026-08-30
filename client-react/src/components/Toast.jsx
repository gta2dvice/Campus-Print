export default function Toast({ toast }) {
  const { message = '', type = 'success', show = false } = toast || {};
  return (
    <div className={`toast ${type}${show ? ' show' : ''}`} id="toast">
      <span className="toast-icon" id="toastIcon">{type === 'error' ? '✕' : '✓'}</span>
      <span id="toastMsg">{message}</span>
    </div>
  );
}
