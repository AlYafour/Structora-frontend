import { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * Unified InfoTip — portal-based tooltip that never gets clipped.
 *
 * @param {string}  text   - tooltip content
 * @param {string}  [title]  - optional bold title
 * @param {boolean} [inline] - true (default) = small 18px icon, false = 22px
 */
export default function InfoTip({ text, title, inline = true }) {
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const ref = useRef(null);

  const reposition = useCallback(() => {
    if (!ref.current) return;
    const r = ref.current.getBoundingClientRect();
    setPos({ top: r.bottom + 6, left: r.left + r.width / 2 });
  }, []);

  useEffect(() => {
    if (show) reposition();
  }, [show, reposition]);

  return (
    <>
      <span
        ref={ref}
        className={`infotip${inline ? '' : ' infotip--md'}`}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
      >
        <svg width={inline ? 14 : 16} height={inline ? 14 : 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
      </span>
      {show && ReactDOM.createPortal(
        <div className="infotip__popup" style={{ top: pos.top, left: pos.left }}>
          {title && <div className="infotip__popup-title">{title}</div>}
          <div className="infotip__popup-text">{text}</div>
        </div>,
        document.body
      )}
    </>
  );
}
