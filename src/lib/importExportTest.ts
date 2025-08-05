import type { SavedNote } from '@/hooks/useSavedNotes';
import type { NostrEvent } from '@nostrify/nostrify';
import { noteToMarkdown } from './exportNotes';
import { parseNoteFromMarkdown } from './importNotes';

// Test function to verify import/export roundtrip works correctly
export function testImportExportRoundtrip(): boolean {
  // Create a test note with thoughts
  const testEvent: NostrEvent = {
    id: 'test123',
    pubkey: 'testpubkey123',
    created_at: Math.floor(Date.now() / 1000),
    kind: 1,
    tags: [],
    content: 'This is a test note content with\nmultiple lines\nand special characters: !@#$%^&*()',
    sig: 'testsig'
  };

  const testNote: SavedNote = {
    id: testEvent.id,
    event: testEvent,
    author: {
      pubkey: testEvent.pubkey,
      metadata: {
        name: 'Test User',
        about: 'A test user',
        picture: 'https://example.com/avatar.jpg'
      }
    },
    collection: 'Test Collection',
    upvotes: 5,
    savedAt: Date.now(),
    thoughts: 'These are my private thoughts about this note.\n\nThey span multiple lines and contain special characters: !@#$%^&*()\n\nAnd even some "quotes" and \'apostrophes\'.'
  };

  try {
    // Export to markdown
    const { markdown } = noteToMarkdown(testNote);
    console.log('Exported markdown:', markdown);

    // Import back from markdown
    const importedNote = parseNoteFromMarkdown(markdown, testNote.collection);
    
    if (!importedNote) {
      console.error('Failed to parse note from markdown');
      return false;
    }

    // Verify all fields match
    const fieldsToCheck = [
      'id',
      'collection',
      'upvotes',
      'thoughts'
    ] as const;

    for (const field of fieldsToCheck) {
      if (testNote[field] !== importedNote[field]) {
        console.error(`Field ${field} mismatch:`, {
          original: testNote[field],
          imported: importedNote[field]
        });
        return false;
      }
    }

    // Verify event content
    if (testNote.event.content !== importedNote.event.content) {
      console.error('Event content mismatch:', {
        original: testNote.event.content,
        imported: importedNote.event.content
      });
      return false;
    }

    // Verify author metadata
    if (testNote.author.metadata?.name !== importedNote.author.metadata?.name) {
      console.error('Author name mismatch:', {
        original: testNote.author.metadata?.name,
        imported: importedNote.author.metadata?.name
      });
      return false;
    }

    console.log('✅ Import/Export roundtrip test passed!');
    return true;

  } catch (error) {
    console.error('Import/Export test failed:', error);
    return false;
  }
}

// Test function for notes without thoughts
export function testImportExportWithoutThoughts(): boolean {
  const testEvent: NostrEvent = {
    id: 'test456',
    pubkey: 'testpubkey456',
    created_at: Math.floor(Date.now() / 1000),
    kind: 1,
    tags: [],
    content: 'This note has no thoughts',
    sig: 'testsig2'
  };

  const testNote: SavedNote = {
    id: testEvent.id,
    event: testEvent,
    author: {
      pubkey: testEvent.pubkey,
      metadata: {
        name: 'Test User 2'
      }
    },
    collection: 'Default',
    upvotes: 0,
    savedAt: Date.now()
    // No thoughts field
  };

  try {
    const { markdown } = noteToMarkdown(testNote);
    const importedNote = parseNoteFromMarkdown(markdown, testNote.collection);
    
    if (!importedNote) {
      console.error('Failed to parse note without thoughts');
      return false;
    }

    // Verify thoughts is undefined
    if (importedNote.thoughts !== undefined) {
      console.error('Expected thoughts to be undefined, got:', importedNote.thoughts);
      return false;
    }

    // Verify markdown doesn't contain thoughts section
    if (markdown.includes('## Your Thoughts')) {
      console.error('Markdown should not contain thoughts section for note without thoughts');
      return false;
    }

    console.log('✅ Import/Export test without thoughts passed!');
    return true;

  } catch (error) {
    console.error('Import/Export test without thoughts failed:', error);
    return false;
  }
}