import { useCallback, useState } from 'react';

interface UseDraftOptions<T> {
  validate?: (draft: T) => boolean;
}

export const useDraft = <T,>(initial: T, opts?: UseDraftOptions<T>) => {
  const [initialValues] = useState(initial);
  const [values, setValues] = useState<T>(initial);
  const isValid = opts?.validate ? opts.validate(values) : true;

  const set = useCallback(<K extends keyof T>(field: K, value: T[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
  }, []);

  const setAll = useCallback((patch: Partial<T>) => {
    setValues((current) => ({ ...current, ...patch }));
  }, []);

  const reset = useCallback(() => setValues(initialValues), [initialValues]);

  return { values, set, setAll, reset, isValid };
};
