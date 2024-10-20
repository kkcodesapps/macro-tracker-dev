import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../ThemeContext';

interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}

const Toast: React.FC<ToastProps> = ({ message, type, onClose }) => {
  const { darkMode } = useTheme();

  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const getToastColor = () => {
    switch (type) {
      case 'success':
        return darkMode ? 'bg-green-600' : 'bg-green-100 text-green-800';
      case 'error':
        return darkMode ? 'bg-red-600' : 'bg-red-100 text-red-800';
      case 'info':
      default:
        return darkMode ? 'bg-blue-600' : 'bg-blue-100 text-blue-800';
    }
  };

  return (
    <div className="fixed top-0 left-0 right-0 flex justify-center items-start z-50 pt-4">
      <div className={`max-w-sm w-full mx-4 p-4 rounded-md shadow-lg ${getToastColor()} transition-all duration-300 ease-in-out`}>
        <div className="flex items-center justify-between">
          <p className={`text-sm ${darkMode ? 'text-white' : ''}`}>{message}</p>
          <button
            onClick={onClose}
            className={`ml-4 text-sm ${darkMode ? 'text-white' : 'text-gray-600'} hover:text-gray-800 focus:outline-none`}
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default Toast;