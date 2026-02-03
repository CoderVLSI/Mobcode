export type PreviewRequest =
  | { type: 'html'; path: string; name?: string }
  | { type: 'react'; path: string; name?: string }
  | { type: 'component'; componentId: string };

type PreviewListener = (request: PreviewRequest) => void;

const listeners = new Set<PreviewListener>();

export const previewBus = {
  subscribe(listener: PreviewListener) {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  emit(request: PreviewRequest) {
    listeners.forEach((listener) => listener(request));
  },
};
