'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  listMarks,
  createMark,
  updateMark,
  deleteMark,
  listNotes,
  createNote,
  updateNote,
  deleteNote,
  listThoughts,
  createThought,
  updateThought,
  deleteThought,
} from '@/lib/reader/storage-client';
import type { Mark, Note, Thought, Anchor } from '@/lib/reader/types';
import type { MarkColor } from '@/lib/reader/prefs';

export interface UseAnnotationsResult {
  marks: Mark[];
  notes: Note[];
  thoughts: Thought[];
  loading: boolean;
  reload: () => void;
  addMark: (anchor: Anchor, color: MarkColor) => Promise<Mark>;
  changeMarkColor: (id: string, color: MarkColor) => Promise<void>;
  removeMark: (id: string) => Promise<void>;
  addNote: (anchor: Anchor, text: string) => Promise<Note>;
  editNote: (id: string, text: string) => Promise<void>;
  removeNote: (id: string) => Promise<void>;
  addThought: (anchor: Anchor, text: string) => Promise<Thought>;
  editThought: (id: string, text: string) => Promise<void>;
  removeThought: (id: string) => Promise<void>;
}

export function useAnnotations(articleId: string | null): UseAnnotationsResult {
  const [marks, setMarks] = useState<Mark[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(() => {
    if (!articleId) {
      setMarks([]);
      setNotes([]);
      setThoughts([]);
      return;
    }
    setLoading(true);
    Promise.all([
      listMarks(articleId),
      listNotes(articleId),
      listThoughts(articleId),
    ])
      .then(([m, n, t]) => {
        setMarks(m);
        setNotes(n);
        setThoughts(t);
      })
      .finally(() => setLoading(false));
  }, [articleId]);

  useEffect(reload, [reload]);

  const addMark = useCallback(
    async (anchor: Anchor, color: MarkColor) => {
      if (!articleId) throw new Error('no article');
      const m = await createMark({ articleId, anchor, color });
      setMarks((arr) => [...arr, m]);
      return m;
    },
    [articleId],
  );

  const changeMarkColor = useCallback(
    async (id: string, color: MarkColor) => {
      const m = await updateMark(id, { color });
      setMarks((arr) => arr.map((x) => (x.id === id ? m : x)));
    },
    [],
  );

  const removeMark = useCallback(async (id: string) => {
    await deleteMark(id);
    setMarks((arr) => arr.filter((x) => x.id !== id));
  }, []);

  const addNote = useCallback(
    async (anchor: Anchor, text: string) => {
      if (!articleId) throw new Error('no article');
      const n = await createNote({ articleId, anchor, text });
      setNotes((arr) => [...arr, n]);
      return n;
    },
    [articleId],
  );

  const editNote = useCallback(async (id: string, text: string) => {
    const n = await updateNote(id, text);
    setNotes((arr) => arr.map((x) => (x.id === id ? n : x)));
  }, []);

  const removeNote = useCallback(async (id: string) => {
    await deleteNote(id);
    setNotes((arr) => arr.filter((x) => x.id !== id));
  }, []);

  const addThought = useCallback(
    async (anchor: Anchor, text: string) => {
      if (!articleId) throw new Error('no article');
      const t = await createThought({ articleId, anchor, text });
      setThoughts((arr) => [...arr, t]);
      return t;
    },
    [articleId],
  );

  const editThought = useCallback(async (id: string, text: string) => {
    const t = await updateThought(id, text);
    setThoughts((arr) => arr.map((x) => (x.id === id ? t : x)));
  }, []);

  const removeThought = useCallback(async (id: string) => {
    await deleteThought(id);
    setThoughts((arr) => arr.filter((x) => x.id !== id));
  }, []);

  return {
    marks,
    notes,
    thoughts,
    loading,
    reload,
    addMark,
    changeMarkColor,
    removeMark,
    addNote,
    editNote,
    removeNote,
    addThought,
    editThought,
    removeThought,
  };
}
