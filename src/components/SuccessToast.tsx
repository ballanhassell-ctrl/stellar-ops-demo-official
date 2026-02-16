import { useEffect, useState } from 'react';
import { CheckCircle, X } from 'lucide-react';

interface SuccessToastProps {
  message: string;
  isVisible: boolean;
  onClose: () => void;
  duration?: number;
  isDayMode?: boolean;
}

export default function SuccessToast({
  message,
  isVisible,
  onClose,
  duration = 3000,
  isDayMode = true,
}: SuccessToastProps) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (isVisible) {
      // Trigger enter animation
      requestAnimationFrame(() => setShow(true));
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onClose, 200); // Wait for exit animation
      }, duration);
      return () => clearTimeout(timer);
    } else {
      setShow(false);
    }
  }, [isVisible, duration, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed top-6 right-6 z-[100]" role="status" aria-live="polite">
      <div
        className={`flex items-center gap-3 px-5 py-3 rounded-lg shadow-lg border transition-all duration-200 ${
          show ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
        } ${
          isDayMode
            ? 'bg-white border-green-200 text-gray-800'
            : 'bg-gray-800 border-green-700 text-gray-100'
        }`}
      >
        <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={() => {
            setShow(false);
            setTimeout(onClose, 200);
          }}
          className={`p-0.5 rounded transition-colors flex-shrink-0 ${
            isDayMode
              ? 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-700'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
