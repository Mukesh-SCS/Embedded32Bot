export function stopWhenShortPage<T>(perPage = 100) {
  return (response: { data: T[] }, done: () => void): T[] => {
    const items = Array.isArray(response.data) ? response.data : [];
    if (items.length < perPage) {
      done();
    }
    return items;
  };
}

export function stopWhenShortCheckRuns(perPage = 100) {
  return (
    response: { data: unknown },
    done: () => void,
  ): { id: number; name: string; status: string; conclusion: string | null }[] => {
    const data = response.data;
    const items = Array.isArray(data)
      ? data
      : ((
          data as {
            check_runs?: { id: number; name: string; status: string; conclusion: string | null }[];
          }
        ).check_runs ?? []);
    if (items.length < perPage) {
      done();
    }
    return items;
  };
}
