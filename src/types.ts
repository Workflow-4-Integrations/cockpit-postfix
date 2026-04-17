export type AlertVariant = 'success' | 'danger' | 'warning' | 'info';

export interface AppContext {
  runHelper: (script: string, args?: string[]) => Promise<string>;
  runCommand: (command: string[], options?: Record<string, unknown>) => Promise<string>;
  notify: (variant: AlertVariant, title: string, detail?: string) => void;
}

export interface PageProps {
  context: AppContext;
}
