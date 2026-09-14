import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  ThemedDialog,
  type DialogButton,
  type DialogIconType,
} from '@/components/ThemedDialog';

export type ShowDialogOptions = {
  title: string;
  message?: string;
  icon?: DialogIconType;
  buttons?: DialogButton[];
  onClose?: () => void;
};

type DialogContextValue = {
  showDialog: (opts: ShowDialogOptions) => void;
  hideDialog: () => void;
};

const DialogContext = createContext<DialogContextValue | null>(null);

let globalShowDialog: ((opts: ShowDialogOptions) => void) | null = null;
let globalHideDialog: (() => void) | null = null;

/**
 * Direct global helper to trigger on-theme dialogs anywhere in the app.
 */
export const dialog = {
  alert: (
    title: string,
    message?: string,
    buttons?: DialogButton[],
    icon?: DialogIconType
  ) => {
    if (globalShowDialog) {
      globalShowDialog({
        title,
        message,
        buttons: buttons ?? [{ text: 'OK' }],
        icon: icon ?? (title.toLowerCase().includes('error') ? 'alert' : 'info'),
      });
    }
  },
  show: (opts: ShowDialogOptions) => {
    if (globalShowDialog) {
      globalShowDialog(opts);
    }
  },
  dismiss: () => {
    if (globalHideDialog) {
      globalHideDialog();
    }
  },
  register: (handlers: { show: (opts: ShowDialogOptions) => void; dismiss?: () => void }) => {
    globalShowDialog = handlers.show;
    globalHideDialog = handlers.dismiss ?? null;
  },
};

export function DialogProvider({ children }: { children: ReactNode }) {
  const [currentDialog, setCurrentDialog] = useState<ShowDialogOptions | null>(null);
  const [visible, setVisible] = useState(false);

  const hideDialog = useCallback(() => {
    setVisible(false);
    const cb = currentDialog?.onClose;
    setCurrentDialog(null);
    cb?.();
  }, [currentDialog]);

  const showDialog = useCallback((opts: ShowDialogOptions) => {
    setCurrentDialog(opts);
    setVisible(true);
  }, []);

  globalShowDialog = showDialog;
  globalHideDialog = hideDialog;

  const value = useMemo(
    () => ({ showDialog, hideDialog }),
    [showDialog, hideDialog]
  );

  return (
    <DialogContext.Provider value={value}>
      {children}
      {currentDialog ? (
        <ThemedDialog
          visible={visible}
          title={currentDialog.title}
          message={currentDialog.message}
          icon={currentDialog.icon}
          buttons={currentDialog.buttons}
          onClose={hideDialog}
        />
      ) : null}
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogContextValue {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    return {
      showDialog: (opts) => dialog.show(opts),
      hideDialog: () => {},
    };
  }
  return ctx;
}
