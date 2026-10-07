// One instance per mounted course browser; never shared across users or teachers.
export function createCoursePanelCache<T>(load: (id: string) => Promise<T>) {
  const requests = new Map<string, Promise<T>>();
  return (id: string) => {
    const existing = requests.get(id);
    if (existing) return existing;
    const request = Promise.resolve().then(() => load(id)).catch((error: unknown) => {
      requests.delete(id);
      throw error;
    });
    requests.set(id, request);
    return request;
  };
}
