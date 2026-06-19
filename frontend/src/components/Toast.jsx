import { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((toast) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { ...toast, id }]);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const confirm = useCallback((message, title = 'Confirmação') => {
    return new Promise((resolve) => {
      const id = addToast({
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          removeToast(id);
          resolve(true);
        },
        onCancel: () => {
          removeToast(id);
          resolve(false);
        },
      });
    });
  }, [addToast, removeToast]);

  const alert = useCallback((message, title = 'Notificação') => {
    return new Promise((resolve) => {
      const id = addToast({
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          removeToast(id);
          resolve(true);
        },
      });
    });
  }, [addToast, removeToast]);

  const success = useCallback((message, title = 'Sucesso') => {
    const id = addToast({
      type: 'success',
      title,
      message,
    });
    setTimeout(() => removeToast(id), 4000);
  }, [addToast, removeToast]);

  const error = useCallback((message, title = 'Erro') => {
    const id = addToast({
      type: 'error',
      title,
      message,
    });
    setTimeout(() => removeToast(id), 5000);
  }, [addToast, removeToast]);

  const info = useCallback((message, title = 'Informação') => {
    const id = addToast({
      type: 'info',
      title,
      message,
    });
    setTimeout(() => removeToast(id), 3000);
  }, [addToast, removeToast]);

  return (
    <ToastContext.Provider value={{ addToast, removeToast, confirm, alert, success, error, info }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
};

const ToastContainer = ({ toasts, removeToast }) => {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} removeToast={removeToast} />
      ))}
    </div>
  );
};

const ToastItem = ({ toast, removeToast }) => {
  const getIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-error" />;
      case 'info':
        return <Info className="w-5 h-5 text-primary" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'confirm':
        return <AlertTriangle className="w-5 h-5 text-primary" />;
      default:
        return <Info className="w-5 h-5 text-primary" />;
    }
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'error':
        return 'border-error/30 bg-error-container';
      case 'info':
        return 'border-primary/30 bg-primary-container';
      case 'warning':
        return 'border-yellow-200 bg-yellow-50';
      case 'confirm':
        return 'border-primary/30 bg-surface-container shadow-lg';
      default:
        return 'border-outline-variant/30 bg-surface-container';
    }
  };

  if (toast.type === 'confirm') {
    return (
      <div className="pointer-events-auto animate-in slide-in-from-right-4 duration-300">
        <div className={`rounded-xl border p-5 shadow-lg max-w-md ${getStyles()}`}>
          <div className="flex items-start gap-3 mb-3">
            <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
            <div className="flex-1">
              <h4 className="font-semibold text-on-surface text-sm mb-1">{toast.title}</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => toast.onCancel?.()}
              className="flex-shrink-0 p-1 hover:bg-surface-container-high rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>
          <div className="flex gap-2 justify-end mt-4">
            <button
              onClick={toast.onCancel}
              className="px-4 py-2 rounded-lg border border-outline-variant/40 text-on-surface text-sm font-medium hover:bg-surface-container-high transition-all duration-200"
            >
              Cancelar
            </button>
            <button
              onClick={toast.onConfirm}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-all duration-200 shadow-sm"
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (toast.type === 'alert') {
    return (
      <div className="pointer-events-auto animate-in slide-in-from-right-4 duration-300">
        <div className={`rounded-xl border p-4 shadow-lg max-w-md ${getStyles()}`}>
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
            <div className="flex-1">
              <h4 className="font-semibold text-on-surface text-sm mb-1">{toast.title}</h4>
              <p className="text-sm text-on-surface-variant leading-relaxed">{toast.message}</p>
            </div>
            <button
              onClick={() => {
                toast.onConfirm?.();
                removeToast(toast.id);
              }}
              className="flex-shrink-0 p-1 hover:bg-surface-container-high rounded-full transition-colors"
            >
              <X className="w-4 h-4 text-on-surface-variant" />
            </button>
          </div>
          <div className="flex justify-end mt-4">
            <button
              onClick={() => {
                toast.onConfirm?.();
                removeToast(toast.id);
              }}
              className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-all duration-200 shadow-sm"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="pointer-events-auto animate-in slide-in-from-right-4 duration-300">
      <div className={`rounded-xl border p-4 shadow-lg max-w-md ${getStyles()}`}>
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 mt-0.5">{getIcon()}</div>
          <div className="flex-1">
            <h4 className="font-semibold text-on-surface text-sm mb-1">{toast.title}</h4>
            <p className="text-sm text-on-surface-variant leading-relaxed">{toast.message}</p>
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="flex-shrink-0 p-1 hover:bg-surface-container-high rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-on-surface-variant" />
          </button>
        </div>
      </div>
    </div>
  );
};
