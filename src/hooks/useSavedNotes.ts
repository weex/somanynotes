import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { importNotesFromZip, mergeImportedNotes, type ImportResult } from '@/lib/importNotes';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

export interface SavedNote {
  id: string;
  event: NostrEvent;
  author: {
    pubkey: string;
    metadata?: NostrMetadata;
  };
  collection: string;
  upvotes: number;
  savedAt: number;
  thoughts?: string;
}

export interface SavedNotesData {
  notes: SavedNote[];
  collections: string[];
}

const defaultData: SavedNotesData = {
  notes: [],
  collections: ['Default'],
};

export function useSavedNotes() {
  const [data, setData] = useLocalStorage<SavedNotesData>('saved-notes', defaultData);

  const addNote = (
    event: NostrEvent,
    author: SavedNote['author'],
    collection: string = 'Default'
  ) => {
    const newNote: SavedNote = {
      id: event.id,
      event,
      author,
      collection,
      upvotes: 0,
      savedAt: Date.now(),
    };

    setData(prev => ({
      notes: [newNote, ...prev.notes.filter(n => n.id !== event.id)],
      collections: prev.collections.includes(collection)
        ? prev.collections
        : [...prev.collections, collection],
    }));
  };

  const removeNote = (noteId: string) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.filter(n => n.id !== noteId),
    }));
  };

  const upvoteNote = (noteId: string) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? { ...note, upvotes: note.upvotes + 1 }
          : note
      ),
    }));
  };

  const downvoteNote = (noteId: string) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? { ...note, upvotes: Math.max(0, note.upvotes - 1) }
          : note
      ),
    }));
  };

  const moveNote = (noteId: string, newCollection: string) => {
    setData(prev => ({
      notes: prev.notes.map(note =>
        note.id === noteId
          ? { ...note, collection: newCollection }
          : note
      ),
      collections: prev.collections.includes(newCollection)
        ? prev.collections
        : [...prev.collections, newCollection],
    }));
  };

  const createCollection = (name: string) => {
    if (!data.collections.includes(name)) {
      setData(prev => ({
        ...prev,
        collections: [...prev.collections, name],
      }));
    }
  };

  const renameCollection = (oldName: string, newName: string) => {
    if (oldName === 'Default') return; // Don't allow renaming default collection
    if (data.collections.includes(newName)) return; // Don't allow duplicate names
    if (newName.trim() === '') return; // Don't allow empty names

    setData(prev => ({
      notes: prev.notes.map(note =>
        note.collection === oldName
          ? { ...note, collection: newName }
          : note
      ),
      collections: prev.collections.map(c => c === oldName ? newName : c),
    }));
  };

  const deleteCollection = (name: string) => {
    if (name === 'Default') return; // Don't allow deleting default collection

    setData(prev => ({
      notes: prev.notes.map(note =>
        note.collection === name
          ? { ...note, collection: 'Default' }
          : note
      ),
      collections: prev.collections.filter(c => c !== name),
    }));
  };

  const clearAllNotes = () => {
    setData(defaultData);
  };

  const getNotesByCollection = useCallback((collection: string) => {
    return data.notes
      .filter(note => note.collection === collection)
      .sort((a, b) => b.upvotes - a.upvotes || b.savedAt - a.savedAt);
  }, [data.notes]);

  const isNoteSaved = useCallback((noteId: string) => {
    return data.notes.some(note => note.id === noteId);
  }, [data.notes]);

  const getNoteCollection = useCallback((noteId: string): string | null => {
    const note = data.notes.find(note => note.id === noteId);
    return note ? note.collection : null;
  }, [data.notes]);

  const updateNoteThoughts = (noteId: string, thoughts: string) => {
    setData(prev => ({
      ...prev,
      notes: prev.notes.map(note =>
        note.id === noteId
          ? { ...note, thoughts: thoughts.trim() || undefined }
          : note
      ),
    }));
  };

  const importNotes = async (
    file: File,
    options: {
      overwriteExisting?: boolean;
      mergeCollections?: boolean;
    } = {}
  ): Promise<ImportResult> => {
    const result = await importNotesFromZip(file, data, options);

    if (result.success && result.notes) {
      const mergedData = mergeImportedNotes(data, result.notes, options);
      setData(mergedData);
    }

    return result;
  };

  return {
    data,
    addNote,
    removeNote,
    upvoteNote,
    downvoteNote,
    moveNote,
    createCollection,
    renameCollection,
    deleteCollection,
    clearAllNotes,
    getNotesByCollection,
    isNoteSaved,
    getNoteCollection,
    updateNoteThoughts,
    importNotes,
  };
}