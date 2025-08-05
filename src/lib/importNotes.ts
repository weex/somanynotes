import JSZip from 'jszip';
import type { SavedNote, SavedNotesData } from '@/hooks/useSavedNotes';
import type { NostrEvent, NostrMetadata } from '@nostrify/nostrify';

export interface ImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  collections: string[];
  notes?: SavedNote[];
}

/**
 * Extracts note data from markdown content
 */
export function parseNoteFromMarkdown(markdown: string, collectionName: string): SavedNote | null {
  try {
    // Extract the Event JSON section
    const eventJsonMatch = markdown.match(/- \*\*Event JSON:\*\*\n```json\n([\s\S]*?)\n```/);
    if (!eventJsonMatch) {
      throw new Error('No Event JSON found in markdown');
    }

    const eventJson = eventJsonMatch[1];
    const event: NostrEvent = JSON.parse(eventJson);

    // Extract the Author Metadata section
    const authorMetadataMatch = markdown.match(/- \*\*Author Metadata:\*\*\n```json\n([\s\S]*?)\n```/);
    let authorMetadata: NostrMetadata | undefined;

    if (authorMetadataMatch) {
      const metadataJson = authorMetadataMatch[1];
      const parsedMetadata = JSON.parse(metadataJson);
      // Only assign if it's not an empty object
      authorMetadata = Object.keys(parsedMetadata).length > 0 ? parsedMetadata : undefined;
    }

    // Extract metadata from the markdown headers
    const authorPubkeyMatch = markdown.match(/\*\*Author Pubkey:\*\* `([^`]+)`/);
    const upvotesMatch = markdown.match(/\*\*Upvotes:\*\* (\d+)/);
    const savedMatch = markdown.match(/\*\*Saved:\*\* ([^\n]+)/);

    // Extract thoughts if they exist - handle multiple possible patterns
    let thoughts: string | undefined;

    // Try to match thoughts section between "## Your Thoughts" and "---"
    const thoughtsMatch1 = markdown.match(/## Your Thoughts\n\n([\s\S]*?)\n\n---/);
    if (thoughtsMatch1) {
      thoughts = thoughtsMatch1[1].trim();
    } else {
      // Try alternative pattern where thoughts might be at the end before metadata
      const thoughtsMatch2 = markdown.match(/## Your Thoughts\n\n([\s\S]*?)\n\n## Metadata/);
      if (thoughtsMatch2) {
        thoughts = thoughtsMatch2[1].trim();
      }
    }

    // Only keep thoughts if they're not empty
    thoughts = thoughts && thoughts.length > 0 ? thoughts : undefined;

    if (!authorPubkeyMatch) {
      throw new Error('No author pubkey found in markdown');
    }

    const authorPubkey = authorPubkeyMatch[1];
    const upvotes = upvotesMatch ? parseInt(upvotesMatch[1], 10) : 0;

    // Parse saved date - try to convert back to timestamp
    let savedAt = Date.now(); // Default to now if we can't parse
    if (savedMatch) {
      const savedDateStr = savedMatch[1];
      const parsedDate = new Date(savedDateStr);
      if (!isNaN(parsedDate.getTime())) {
        savedAt = parsedDate.getTime();
      }
    }

    const savedNote: SavedNote = {
      id: event.id,
      event,
      author: {
        pubkey: authorPubkey,
        metadata: authorMetadata,
      },
      collection: collectionName,
      upvotes,
      savedAt,
      thoughts,
    };

    return savedNote;
  } catch (error) {
    console.error('Error parsing note from markdown:', error);
    return null;
  }
}

/**
 * Imports notes from a zip file created by the export function
 */
export async function importNotesFromZip(
  file: File,
  existingData: SavedNotesData,
  options: {
    overwriteExisting?: boolean;
    mergeCollections?: boolean;
  } = {}
): Promise<ImportResult> {
  const result: ImportResult = {
    success: false,
    imported: 0,
    skipped: 0,
    errors: [],
    collections: [],
  };

  try {
    const zip = await JSZip.loadAsync(file);
    const newNotes: SavedNote[] = [];
    const newCollections = new Set<string>();

    // Process each file in the zip
    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      // Skip directories and non-markdown files
      if (zipEntry.dir || !relativePath.endsWith('.md')) {
        continue;
      }

      // Skip README and summary files
      if (relativePath.includes('README.md') ||
          relativePath.includes('SUMMARY.md') ||
          relativePath.includes('_COLLECTION_SUMMARY.md')) {
        continue;
      }

      try {
        const content = await zipEntry.async('text');

        // Extract collection name from path
        const pathParts = relativePath.split('/');
        const collectionName = pathParts.length > 1 ? pathParts[0] : 'Default';

        // Parse the note from markdown
        const note = parseNoteFromMarkdown(content, collectionName);

        if (note) {
          // Check if note already exists
          const existingNote = existingData.notes.find(n => n.id === note.id);

          if (existingNote && !options.overwriteExisting) {
            result.skipped++;
            continue;
          }

          newNotes.push(note);
          newCollections.add(collectionName);
          result.imported++;
        } else {
          result.errors.push(`Failed to parse note from ${relativePath}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : 'Unknown error';
        result.errors.push(`Error processing ${relativePath}: ${errorMsg}`);
      }
    }

    if (newNotes.length === 0) {
      result.errors.push('No valid notes found in the zip file');
      return result;
    }

    // Prepare the collections list
    result.collections = Array.from(newCollections);
    result.success = true;

    // Store the parsed notes in the result
    result.notes = newNotes;

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Failed to process zip file: ${errorMsg}`);
  }

  return result;
}

/**
 * Merges imported notes with existing data
 */
export function mergeImportedNotes(
  existingData: SavedNotesData,
  importedNotes: SavedNote[],
  options: {
    overwriteExisting?: boolean;
    mergeCollections?: boolean;
  } = {}
): SavedNotesData {
  const { overwriteExisting = false, mergeCollections = true } = options;

  // Start with existing data
  const mergedNotes = [...existingData.notes];
  const mergedCollections = new Set(existingData.collections);

  // Process each imported note
  for (const importedNote of importedNotes) {
    const existingIndex = mergedNotes.findIndex(n => n.id === importedNote.id);

    if (existingIndex >= 0) {
      if (overwriteExisting) {
        // Replace existing note
        mergedNotes[existingIndex] = importedNote;
      }
      // If not overwriting, skip this note (it's already handled in the import function)
    } else {
      // Add new note
      mergedNotes.push(importedNote);
    }

    // Add collection if merging collections
    if (mergeCollections) {
      mergedCollections.add(importedNote.collection);
    }
  }

  return {
    notes: mergedNotes,
    collections: Array.from(mergedCollections),
  };
}