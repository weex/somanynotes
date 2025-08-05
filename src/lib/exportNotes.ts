import JSZip from 'jszip';
import type { SavedNote } from '@/hooks/useSavedNotes';
import { genUserName } from './genUserName';

/**
 * Converts a Nostr note to markdown format
 */
export function noteToMarkdown(note: SavedNote): { markdown: string; filename: string } {
  const authorName = note.author.metadata?.name || genUserName(note.author.pubkey);
  const savedDate = new Date(note.savedAt).toLocaleDateString();
  const eventDate = new Date(note.event.created_at * 1000).toLocaleDateString();

  // Create a safe filename from the first 50 characters of content
  const contentPreview = note.event.content.slice(0, 50).replace(/[^\w\s-]/g, '').trim();
  const filename = contentPreview || `note-${note.event.id.slice(0, 8)}`;

  const markdown = `# Note by ${authorName}

**Author:** ${authorName}
**Author Pubkey:** \`${note.author.pubkey}\`
**Event ID:** \`${note.event.id}\`
**Kind:** ${note.event.kind}
**Created:** ${eventDate}
**Saved:** ${savedDate}
**Upvotes:** ${note.upvotes}
**Collection:** ${note.collection}

---

## Content

${note.event.content}

---
${note.thoughts && note.thoughts.trim() ? `
## Your Thoughts

${note.thoughts}

---
` : ''}
## Metadata

- **Event JSON:**
\`\`\`json
${JSON.stringify(note.event, null, 2)}
\`\`\`

- **Author Metadata:**
\`\`\`json
${JSON.stringify(note.author.metadata || {}, null, 2)}
\`\`\`
`;

  return { markdown, filename };
}

/**
 * Creates a sanitized folder name
 */
function sanitizeFolderName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * Creates a sanitized filename
 */
function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*]/g, '_').replace(/\s+/g, '_').trim();
}

/**
 * Exports all notes as a zip file with markdown files organized by collection
 */
export async function exportNotesToZip(notesByCollection: Record<string, SavedNote[]>): Promise<void> {
  const zip = new JSZip();

  // Add a README file
  const readme = `# So Many Notes Export

This export contains your saved Nostr notes organized by collection.

## Structure

Each collection is stored in its own folder:
- \`Default/\` - Notes in the Default collection
- \`[Collection Name]/\` - Notes in custom collections

## File Format

Each note is saved as a Markdown (.md) file containing:
- Note metadata (author, dates, upvotes, etc.)
- Original content
- Full event JSON for reference
- Author metadata

## Import

These files can be:
- Read in any markdown editor
- Imported into note-taking apps
- Used as backup/archive
- Shared with others

Generated on: ${new Date().toLocaleString()}
`;

  zip.file('README.md', readme);

  // Create a summary file
  const totalNotes = Object.values(notesByCollection).reduce((sum, notes) => sum + notes.length, 0);
  const collections = Object.keys(notesByCollection).sort();

  const summary = `# Export Summary

**Total Notes:** ${totalNotes}
**Collections:** ${collections.length}
**Export Date:** ${new Date().toLocaleString()}

## Collections

${collections.map(collection => {
  const notes = notesByCollection[collection];
  return `- **${collection}:** ${notes.length} notes`;
}).join('\n')}

## Top Authors

${(() => {
  const authors = Object.values(notesByCollection)
    .flat()
    .reduce((acc: Record<string, number>, note) => {
      const authorName = note.author.metadata?.name || genUserName(note.author.pubkey);
      acc[authorName] = (acc[authorName] || 0) + 1;
      return acc;
    }, {});

  return Object.entries(authors)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10)
    .map(([name, count]) => `- **${name}:** ${count} notes`)
    .join('\n');
})()}
`;

  zip.file('SUMMARY.md', summary);

  // Process each collection
  for (const [collectionName, notes] of Object.entries(notesByCollection)) {
    if (notes.length === 0) continue;

    const folderName = sanitizeFolderName(collectionName);
    const folder = zip.folder(folderName);

    if (!folder) continue;

    // Sort notes by upvotes (descending) then by saved date (newest first)
    const sortedNotes = [...notes].sort((a, b) => {
      if (b.upvotes !== a.upvotes) {
        return b.upvotes - a.upvotes;
      }
      return b.savedAt - a.savedAt;
    });

    // Add each note as a markdown file
    sortedNotes.forEach((note, index) => {
      const { markdown, filename } = noteToMarkdown(note);
      const safeFilename = sanitizeFileName(filename);
      const paddedIndex = String(index + 1).padStart(3, '0');
      const fullFilename = `${paddedIndex}_${safeFilename}.md`;

      folder.file(fullFilename, markdown);
    });

    // Add a collection summary
    const collectionSummary = `# ${collectionName} Collection

**Total Notes:** ${notes.length}
**Created:** Various dates
**Last Updated:** ${new Date().toLocaleString()}

## Notes in this Collection

${sortedNotes.map((note, index) => {
  const authorName = note.author.metadata?.name || genUserName(note.author.pubkey);
  const contentPreview = note.event.content.slice(0, 100).replace(/\n/g, ' ') + (note.event.content.length > 100 ? '...' : '');
  const paddedIndex = String(index + 1).padStart(3, '0');

  return `${paddedIndex}. **${authorName}** (${note.upvotes} upvotes)
     ${contentPreview}`;
}).join('\n\n')}
`;

    folder.file('_COLLECTION_SUMMARY.md', collectionSummary);
  }

  // Generate and download the zip file
  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);

  const link = document.createElement('a');
  link.href = url;
  link.download = `somanynotes.com-export-${new Date().toISOString().split('T')[0]}.zip`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  // Clean up the URL
  URL.revokeObjectURL(url);
}
