import { useState, useCallback } from "react";
import type { AnalysisJob } from "@workspace/api-client-react";

export type SavedFinding = NonNullable<AnalysisJob["findings"]>[number] & {
  repoUrl: string;
  savedAt: string;
};

const STORAGE_KEY = "sah_saved_findings";

function loadSaved(): SavedFinding[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SavedFinding[]) : [];
  } catch {
    return [];
  }
}

export function useSavedFindings() {
  const [saved, setSaved] = useState<SavedFinding[]>(loadSaved);

  const isSaved = useCallback(
    (id: string) => saved.some((f) => f.id === id),
    [saved]
  );

  const toggleSave = useCallback(
    (
      finding: NonNullable<AnalysisJob["findings"]>[number],
      repoUrl: string
    ) => {
      setSaved((prev) => {
        const exists = prev.some((f) => f.id === finding.id);
        const next = exists
          ? prev.filter((f) => f.id !== finding.id)
          : [
              ...prev,
              {
                ...finding,
                repoUrl,
                savedAt: new Date().toISOString(),
              },
            ];
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
        return next;
      });
    },
    []
  );

  const removeSaved = useCallback((id: string) => {
    setSaved((prev) => {
      const next = prev.filter((f) => f.id !== id);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSaved([]);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return { saved, isSaved, toggleSave, removeSaved, clearAll };
}
