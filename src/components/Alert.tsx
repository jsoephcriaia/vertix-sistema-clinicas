'use client';

import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { X, AlertTriangle, CheckCircle, Info, AlertCircle, Loader2 } from 'lucide-react';

type AlertType = 'success' | 'error' | 'warning' | 'info' | 'confirm' | 'loading';

interface AlertOptions {
  title?: string;
  message: string;
  type?: AlertType;
  confirmText?: string;
  cancelText?: string;
  onConfirm?: () => void | Promise<void>;
  onCancel?: () => void;
}

interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
}

interface AlertContextType {
  showAlert: (options: AlertOptions) => void;
  showConfirm: (message: string, onConfirm: () => void | Promise<void>, title?: string) => void;
  showSuccess: (message: string, title?: string) => void;
  showError: (message: string, title?: string) => void;
  showWarning: (message: string, title?: string) => void;
  showLoading: (message: string, title?: string) => void;
  hideAlert: () => void;
  showToast: (message: string, type?: 'success' | 'error' | 'warning' | 'info') => void;
}

const AlertContext = createContext<AlertContextType | null>(null);

export function useAlert() {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error('useAlert deve ser usado dentro de AlertProvider');
  }
  return context;
}

export function AlertProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<AlertOptions | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showAlert = (opts: AlertOptions) => {
    setOptions(opts);
    setIsOpen(true);
    setIsLoading(false);
  };

  const showConfirm = (message: string, onConfirm: () => void | Promise<void>, title?: string) => {
    showAlert({
      type: 'confirm',
      title: title || 'Confirmar',
      message,
      confirmText: 'Confirmar',
      cancelText: 'Cancelar',
      onConfirm
    });
  };

  const showSuccess = (message: string, title?: string) => {
    showAlert({ type: 'success', title: title || 'Sucesso', message });
  };

  const showError = (message: string, title?: string) => {
    showAlert({ type: 'error', title: title || 'Erro', message });
  };

  const showWarning = (message: string, title?: string) => {
    showAlert({ type: 'warning', title: title || 'Atenção', message });
  };

  const showLoading = (message: string, title?: string) => {
    showAlert({ type: 'loading', title: title || 'Aguarde', message });
  };

  const hideAlert = () => {
    setIsOpen(false);
    setOptions(null);
    setIsLoading(false);
  };

  const showToast = (message: string, type: 'success' | 'error' | 'warning' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);

    // Auto-remove after 3 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const handleConfirm = async () => {
    if (options?.onConfirm) {
      setIsLoading(true);
      try {
        await options.onConfirm();
      } catch (error) {
        console.error('Erro na confirmação:', error);
      }
      setIsLoading(false);
    }
    hideAlert();
  };

  const handleCancel = () => {
    if (options?.onCancel) {
      options.onCancel();
    }
    hideAlert();
  };

  const getIcon = () => {
    switch (options?.type) {
      case 'success':
        return <CheckCircle size={48} className="text-emerald-500" />;
      case 'error':
        return <AlertCircle size={48} className="text-red-500" />;
      case 'warning':
        return <AlertTriangle size={48} className="text-amber-500" />;
      case 'confirm':
        return <AlertTriangle size={48} className="text-amber-500" />;
      case 'loading':
        return <Loader2 size={48} className="text-emerald-500 animate-spin" />;
      default:
        return <Info size={48} className="text-blue-500" />;
    }
  };

  const getButtonColor = () => {
    switch (options?.type) {
      case 'error':
        return 'bg-red-500 hover:bg-red-600';
      case 'warning':
      case 'confirm':
        return 'bg-amber-500 hover:bg-amber-600';
      default:
        return 'bg-emerald-500 hover:bg-emerald-600';
    }
  };

  const getToastIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <CheckCircle size={20} className="text-emerald-500 flex-shrink-0" />;
      case 'error':
        return <AlertCircle size={20} className="text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />;
      default:
        return <Info size={20} className="text-blue-500 flex-shrink-0" />;
    }
  };

  const getToastBorder = (type: string) => {
    switch (type) {
      case 'success':
        return 'border-l-emerald-500';
      case 'error':
        return 'border-l-red-500';
      case 'warning':
        return 'border-l-amber-500';
      default:
        return 'border-l-blue-500';
    }
  };

  return (
    <AlertContext.Provider value={{ showAlert, showConfirm, showSuccess, showError, showWarning, showLoading, hideAlert, showToast }}>
      {children}

      {/* Toast Notifications */}
      <div className="fixed top-4 right-4 z-[200] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`bg-[var(--theme-card)] border border-[var(--theme-card-border)] border-l-4 ${getToastBorder(toast.type)} rounded-lg shadow-lg p-4 flex items-center gap-3 min-w-[280px] max-w-[400px] animate-in slide-in-from-right duration-300`}
          >
            {getToastIcon(toast.type)}
            <p className="text-white text-sm flex-1">{toast.message}</p>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-[var(--theme-text-muted)] hover:text-white transition-colors"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {isOpen && options && (
        <>
          {/* Overlay */}
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100]"
            onClick={options.type !== 'loading' && options.type !== 'confirm' ? hideAlert : undefined}
          />

          {/* Modal */}
          <div className="fixed inset-0 flex items-center justify-center z-[101] p-4">
            <div
              className="bg-[var(--theme-card)] rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header com ícone */}
              <div className="pt-8 pb-4 flex justify-center">
                {getIcon()}
              </div>

              {/* Conteúdo */}
              <div className="px-6 pb-6 text-center">
                {options.title && (
                  <h3 className="text-xl font-semibold text-white mb-2">
                    {options.title}
                  </h3>
                )}
                <p className="text-[var(--theme-text-secondary)]">
                  {options.message}
                </p>
              </div>

              {/* Botões */}
              {options.type !== 'loading' && (
                <div className="px-6 pb-6 flex gap-3">
                  {(options.type === 'confirm' || options.cancelText) && (
                    <button
                      onClick={handleCancel}
                      disabled={isLoading}
                      className="flex-1 px-4 py-3 bg-[var(--theme-bg-tertiary)] hover:bg-[var(--theme-card-border)] text-white rounded-xl transition-colors font-medium disabled:opacity-50"
                    >
                      {options.cancelText || 'Cancelar'}
                    </button>
                  )}
                  <button
                    onClick={options.type === 'confirm' ? handleConfirm : hideAlert}
                    disabled={isLoading}
                    className={`flex-1 px-4 py-3 text-white rounded-xl transition-colors font-medium flex items-center justify-center gap-2 disabled:opacity-50 ${getButtonColor()}`}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className="animate-spin" />
                        Aguarde...
                      </>
                    ) : (
                      options.confirmText || 'OK'
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </AlertContext.Provider>
  );
}
