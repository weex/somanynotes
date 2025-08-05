import { describe, it, expect } from 'vitest';
import type { SavedNote } from '@/hooks/useSavedNotes';
import type { NostrEvent } from '@nostrify/nostrify';
import { noteToMarkdown } from './exportNotes';
import { parseNoteFromMarkdown } from './importNotes';

describe('Import/Export Functionality', () => {
  const createTestEvent = (id: string, content: string): NostrEvent => ({
    id,
    pubkey: 'testpubkey123',
    created_at: Math.floor(Date.now() / 1000),
    kind: 1,
    tags: [],
    content,
    sig: 'testsig'
  });

  const createTestNote = (event: NostrEvent, thoughts?: string): SavedNote => ({
    id: event.id,
    event,
    author: {
      pubkey: event.pubkey,
      metadata: {
        name: 'Test User',
        about: 'A test user',
        picture: 'https://example.com/avatar.jpg'
      }
    },
    collection: 'Test Collection',
    upvotes: 5,
    savedAt: Date.now(),
    thoughts
  });

  it('should export and import note with thoughts correctly', () => {
    const testEvent = createTestEvent('test123', 'This is a test note with\nmultiple lines');
    const thoughts = 'These are my private thoughts.\n\nMultiple paragraphs with special chars: !@#$%^&*()';
    const testNote = createTestNote(testEvent, thoughts);

    // Export to markdown
    const { markdown } = noteToMarkdown(testNote);

    // Verify markdown contains thoughts section
    expect(markdown).toContain('## Your Thoughts');
    expect(markdown).toContain(thoughts);

    // Import back from markdown
    const importedNote = parseNoteFromMarkdown(markdown, testNote.collection);

    expect(importedNote).toBeTruthy();
    expect(importedNote!.thoughts).toBe(thoughts);
    expect(importedNote!.id).toBe(testNote.id);
    expect(importedNote!.collection).toBe(testNote.collection);
    expect(importedNote!.upvotes).toBe(testNote.upvotes);
    expect(importedNote!.event.content).toBe(testNote.event.content);
    expect(importedNote!.author.metadata?.name).toBe(testNote.author.metadata?.name);
  });

  it('should export and import note without thoughts correctly', () => {
    const testEvent = createTestEvent('test456', 'This note has no thoughts');
    const testNote = createTestNote(testEvent); // No thoughts

    // Export to markdown
    const { markdown } = noteToMarkdown(testNote);

    // Verify markdown does not contain thoughts section
    expect(markdown).not.toContain('## Your Thoughts');

    // Import back from markdown
    const importedNote = parseNoteFromMarkdown(markdown, testNote.collection);

    expect(importedNote).toBeTruthy();
    expect(importedNote!.thoughts).toBeUndefined();
    expect(importedNote!.id).toBe(testNote.id);
    expect(importedNote!.event.content).toBe(testNote.event.content);
  });

  it('should handle thoughts with special characters and formatting', () => {
    const testEvent = createTestEvent('test789', 'Test content');
    const specialThoughts = `Thoughts with:
- Bullet points
- **Bold text**
- \`code snippets\`
- "Quotes" and 'apostrophes'
- Special chars: !@#$%^&*()
- Unicode: 🚀 ✨ 💡

Multiple paragraphs with empty lines.

Final paragraph.`;
    
    const testNote = createTestNote(testEvent, specialThoughts);

    // Export and import
    const { markdown } = noteToMarkdown(testNote);
    const importedNote = parseNoteFromMarkdown(markdown, testNote.collection);

    expect(importedNote).toBeTruthy();
    expect(importedNote!.thoughts).toBe(specialThoughts);
  });

  it('should handle empty thoughts correctly', () => {
    const testEvent = createTestEvent('test000', 'Test content');
    const testNote = createTestNote(testEvent, '   '); // Only whitespace

    // Export to markdown
    const { markdown } = noteToMarkdown(testNote);

    // Should not contain thoughts section for whitespace-only thoughts
    expect(markdown).not.toContain('## Your Thoughts');

    // Import back
    const importedNote = parseNoteFromMarkdown(markdown, testNote.collection);

    expect(importedNote).toBeTruthy();
    expect(importedNote!.thoughts).toBeUndefined();
  });

  it('should preserve line breaks and formatting in thoughts', () => {
    const testEvent = createTestEvent('test111', 'Test content');
    const thoughtsWithFormatting = `Line 1

Line 3 (with empty line above)

    Indented line
Normal line
\tTab indented line`;
    
    const testNote = createTestNote(testEvent, thoughtsWithFormatting);

    // Export and import
    const { markdown } = noteToMarkdown(testNote);
    const importedNote = parseNoteFromMarkdown(markdown, testNote.collection);

    expect(importedNote).toBeTruthy();
    expect(importedNote!.thoughts).toBe(thoughtsWithFormatting);
  });
});