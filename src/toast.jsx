import { createContext, useCallback, useContext, useState } from 'react'

// Lightweight in-app toast notifications. Any component can call
// useToast().notify('message', 'success'|'info') to pop a transient banner.

const ToastContext = createContext(null)
let counter = 0

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const dismiss = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id))
  }, [])

  const notify = useCallback((message, kind = 'info') => {
    const id = ++counter
    setToasts((list) => [...list, { id, message, kind }])
    setTimeout(() => dismiss(id), 5000)
  }, [dismiss])

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div className="toast-stack" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast toast-${t.kind}`} onClick={() => dismiss(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  return useContext(ToastContext) || { notify: () => {} }
}
