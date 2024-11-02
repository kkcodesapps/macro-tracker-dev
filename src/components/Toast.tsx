import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useTheme } from '../ThemeContext';
import { motion, AnimatePresence } from 'framer-motion';

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
        return darkMode ? 'bg-green-600/90' : 'bg-green-500/90';
      case 'error':
        return darkMode ? 'bg-red-600/90' : 'bg-red-500/90';
      case 'info':
      default:
        return darkMode ? 'bg-blue-600/90' : 'bg-blue-500/90';
    }
  };

  return (
    <AnimatePresence>
      <motion.div 
        className="fixed top-0 left-0 right-0 flex justify-center items-start z-50 pt-4 px-4"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.2 }}
      >
        <div className={`max-w-sm w-full backdrop-blur-lg ${getToastColor()} p-4 rounded-xl shadow-lg text-white border border-white/10`}>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">{message}</p>
            <button
              onClick={onClose}
              className="ml-4 text-white/80 hover:text-white focus:outline-none transition-colors duration-200"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default Toast;