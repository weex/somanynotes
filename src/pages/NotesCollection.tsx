import React, { useState } from 'react';
import { useSeoMeta } from '@unhead/react';
import { nip19 } from 'nostr-tools';
import { Plus, Trash2, ChevronUp, ChevronDown, ChevronRight, Bookmark, BookmarkX, Repeat2, Download, FolderOpen, Edit, Folder, MessageSquare } from 'lucide-react';

import { useSavedNotes, type SavedNote } from '@/hooks/useSavedNotes';
import { useNostrEvent } from '@/hooks/useNostrEvent';
import { useAuthor } from '@/hooks/useAuthor';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import { NoteContent } from '@/components/NoteContent';
import { LoginArea } from '@/components/auth/LoginArea';
import { ImportNotes } from '@/components/ImportNotes';
import { ThoughtsEditor } from '@/components/ThoughtsEditor';
import { genUserName } from '@/lib/genUserName';
import { exportNotesToZip } from '@/lib/exportNotes';

function CollectionList({
  collections,
  selectedCategory,
  onCategoryChange,
  getNotesByCollection,
  onRenameCollection,
  onDeleteCollection,
  className
}: {
  collections: string[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  getNotesByCollection: (collection: string) => SavedNote[];
  onRenameCollection: (collection: string) => void;
  onDeleteCollection: (collection: string) => void;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Folder className="h-4 w-4" />
          Collections
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-1">
          {collections.map((collection) => {
            const noteCount = getNotesByCollection(collection).length;
            const isSelected = collection === selectedCategory;

            return (
              <div
                key={collection}
                className={`group flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => onCategoryChange(collection)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Folder className="h-3 w-3 shrink-0" />
                  <span className="text-sm truncate">{collection}</span>
                </div>

                <div className="flex items-center gap-1">
                  <Badge
                    variant={isSelected ? "secondary" : "outline"}
                    className="text-xs px-1 py-0"
                  >
                    {noteCount}
                  </Badge>

                  {collection !== 'Default' && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-5 w-5 p-0 opacity-0 group-hover:opacity-100 transition-opacity ${
                            isSelected ? 'text-primary-foreground hover:text-primary-foreground' : ''
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onRenameCollection(collection)}>
                          Rename Collection
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDeleteCollection(collection)}
                          className="text-destructive"
                        >
                          Delete Collection
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function AddNoteForm({ onCategoryChange, sortedCollections, className }: { onCategoryChange: (category: string) => void; sortedCollections: string[]; className?: string }) {
  const [neventInput, setNeventInput] = useState('');
  const [selectedCollection, setSelectedCollection] = useState('Default');
  const [newCollectionName, setNewCollectionName] = useState('');
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);

  const { addNote, createCollection, isNoteSaved, getNoteCollection } = useSavedNotes();
  const { toast } = useToast();

  // Extract event ID from nevent
  const eventId = (() => {
    try {
      // Remove "nostr:" prefix if present
      let cleanInput = neventInput.trim();
      if (cleanInput.startsWith('nostr:')) {
        cleanInput = cleanInput.substring(6);
      }

      if (cleanInput.startsWith('nevent1')) {
        const decoded = nip19.decode(cleanInput);
        if (decoded.type === 'nevent') {
          return decoded.data.id;
        }
      } else if (cleanInput.startsWith('note1')) {
        const decoded = nip19.decode(cleanInput);
        if (decoded.type === 'note') {
          return decoded.data;
        }
      }
      return undefined;
    } catch {
      return undefined;
    }
  })();

  const { data: event, isLoading: eventLoading } = useNostrEvent(eventId);
  const { data: author } = useAuthor(event?.pubkey);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!event) {
      toast({
        title: 'Error',
        description: 'Could not fetch the note. Please check the nevent ID.',
        variant: 'destructive',
      });
      return;
    }

    if (isNoteSaved(event.id)) {
      const existingCollection = getNoteCollection(event.id);
      toast({
        title: 'Note already saved',
        description: `This note is already in your "${existingCollection}" collection.`,
        variant: 'destructive',
        action: existingCollection ? (
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              onCategoryChange(existingCollection);
            }}
          >
            View Collection
          </Button>
        ) : undefined,
      });
      return;
    }

    const collection = isCreatingCollection ? newCollectionName : selectedCollection;

    if (isCreatingCollection && newCollectionName.trim()) {
      createCollection(newCollectionName.trim());
    }

    addNote(
      event,
      {
        pubkey: event.pubkey,
        metadata: author?.metadata,
      },
      collection
    );

    // Switch to the collection where the note was added
    onCategoryChange(collection);

    toast({
      title: 'Note saved!',
      description: `Added to ${collection} collection.`,
    });

    setNeventInput('');
    setNewCollectionName('');
    setIsCreatingCollection(false);
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Plus className="h-4 w-4" />
          Add Note
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label htmlFor="nevent" className="text-sm">Note ID (nevent1... or note1...)</Label>
            <Input
              id="nevent"
              value={neventInput}
              onChange={(e) => setNeventInput(e.target.value)}
              placeholder="nevent1... or note1... or nostr:nevent1..."
              className="mt-1 h-8"
            />
            {neventInput.trim().startsWith('nostr:') && (
              <div className="text-xs text-muted-foreground mt-1">
                ✓ "nostr:" prefix detected and will be removed
              </div>
            )}
          </div>

          <div>
            <Label className="text-sm">Collection</Label>
            <div className="mt-1 space-y-2">
              {!isCreatingCollection ? (
                <div className="flex gap-2">
                  <Select value={selectedCollection} onValueChange={setSelectedCollection}>
                    <SelectTrigger className="flex-1 h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortedCollections.map((collection) => (
                        <SelectItem key={collection} value={collection}>
                          {collection}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsCreatingCollection(true)}
                  >
                    New
                  </Button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <Input
                    value={newCollectionName}
                    onChange={(e) => setNewCollectionName(e.target.value)}
                    placeholder="Collection name"
                    className="flex-1 h-8"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setIsCreatingCollection(false);
                      setNewCollectionName('');
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              )}
            </div>
          </div>

          <Button type="submit" disabled={!event || eventLoading} size="sm" className="w-full">
            <Bookmark className="h-4 w-4 mr-2" />
            Save Note
          </Button>

          {eventLoading && (
            <div className="text-xs text-muted-foreground mt-3">Loading note...</div>
          )}

          {event && (
            <div className="p-2 border rounded bg-muted/50 mt-3">
              <div className="flex items-center gap-2 mb-1">
                <Avatar className="h-5 w-5">
                  <AvatarImage src={author?.metadata?.picture} />
                  <AvatarFallback className="text-xs">
                    {genUserName(event.pubkey).slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <span className="text-xs font-medium">
                  {author?.metadata?.name || genUserName(event.pubkey)}
                </span>
              </div>
              <div className="text-xs">
                <NoteContent event={event} />
              </div>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

function SavedNoteCard({ noteId }: { noteId: string }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const { data, removeNote, upvoteNote, downvoteNote, moveNote, updateNoteThoughts } = useSavedNotes();
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending: isPublishing } = useNostrPublish();
  const { toast } = useToast();

  // Get the current note data to ensure we have the latest upvote count
  const note = data.notes.find(n => n.id === noteId);

  if (!note) {
    return null; // Note was deleted
  }

  const handleDelete = () => {
    removeNote(note.id);
    toast({
      title: 'Note deleted',
      description: 'The note has been removed from your collection.',
    });
  };

  const handleUpvote = () => {
    upvoteNote(note.id);
  };

  const handleDownvote = () => {
    downvoteNote(note.id);
  };

  const handleMove = (newCollection: string) => {
    if (newCollection === note.collection) return;

    moveNote(note.id, newCollection);
    toast({
      title: 'Note moved!',
      description: `Moved to ${newCollection} collection.`,
    });
  };

  const handleBoost = () => {
    if (!user) {
      toast({
        title: 'Login required',
        description: 'You must be logged in to boost notes.',
        variant: 'destructive',
      });
      return;
    }

    // Create a kind 6 repost event
    createEvent({
      kind: 6,
      content: '',
      tags: [
        ['e', note.event.id],
        ['p', note.event.pubkey],
      ],
    });

    toast({
      title: 'Note boosted!',
      description: 'The note has been shared to your followers.',
    });
  };

  const handleThoughtsUpdate = (thoughts: string) => {
    updateNoteThoughts(note.id, thoughts);
  };

  // Create a preview of the content (first 100 characters)
  const contentPreview = note.event.content.slice(0, 100).replace(/\n/g, ' ');
  const hasMoreContent = note.event.content.length > 100;

  return (
    <Card className={`transition-all duration-200 ${isExpanded ? 'shadow-md' : 'hover:shadow-sm'}`}>
      {/* Collapsed Header - Always Visible */}
      <div
        className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {/* Expand/Collapse Icon */}
        <Button variant="ghost" size="sm" className="h-4 w-4 p-0 shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-3 w-3" />
          ) : (
            <ChevronRight className="h-3 w-3" />
          )}
        </Button>

        {/* Author Avatar */}
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarImage src={note.author.metadata?.picture} />
          <AvatarFallback className="text-xs">
            {genUserName(note.author.pubkey).slice(0, 2)}
          </AvatarFallback>
        </Avatar>

        {/* Main Content Area */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm truncate">
                {note.author.metadata?.name || genUserName(note.author.pubkey)}
              </span>
              <Badge variant="secondary" className="text-xs px-1 py-0 shrink-0">
                {note.collection}
              </Badge>
              {note.thoughts && (
                <div title="Has your thoughts">
                  <MessageSquare className="h-3 w-3 text-blue-600 shrink-0" />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs text-muted-foreground">
                {new Date(note.savedAt).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-1">
                <span className="text-xs font-medium">
                  {note.upvotes}
                </span>
                <ChevronUp className="h-3 w-3 text-muted-foreground" />
              </div>
            </div>
          </div>

          {/* Content Preview */}
          <div className="text-sm text-muted-foreground truncate">
            {contentPreview}
            {hasMoreContent && !isExpanded && '...'}
          </div>
        </div>

        {/* Action Buttons - Only show when not expanded */}
        {!isExpanded && (
          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0" title="Move to collection">
                  <FolderOpen className="h-3 w-3" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {data.collections
                  .filter(collection => collection !== note.collection)
                  .sort((a, b) => {
                    if (a === 'Default') return -1;
                    if (b === 'Default') return 1;
                    return a.localeCompare(b);
                  })
                  .map((collection) => (
                    <DropdownMenuItem
                      key={collection}
                      onClick={() => handleMove(collection)}
                    >
                      Move to {collection}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Trash2 className="h-3 w-3" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Note</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to remove this note from your collection? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        )}
      </div>

      {/* Expanded Content - Only visible when expanded */}
      {isExpanded && (
        <CardContent className="pt-0 pb-3">
          {/* Full Content */}
          <div className="mb-3 px-3">
            <NoteContent event={note.event} className="text-sm leading-relaxed" />
          </div>

          {/* Private Thoughts */}
          <div className="mb-3 px-3">
            <ThoughtsEditor
              thoughts={note.thoughts}
              onSave={handleThoughtsUpdate}
            />
          </div>

          <Separator className="mb-3" />

          {/* Action Bar */}
          <div className="flex items-center justify-between px-3">
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleUpvote}
                className="h-7 px-2"
              >
                <ChevronUp className="h-3 w-3 mr-1" />
                {note.upvotes}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownvote}
                className="h-7 px-1"
              >
                <ChevronDown className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleBoost}
                disabled={isPublishing || !user}
                className="h-7 px-2"
                title={user ? "Boost this note" : "Login to boost notes"}
              >
                <Repeat2 className="h-3 w-3 mr-1" />
                Boost
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7">
                    <FolderOpen className="h-3 w-3 mr-1" />
                    Move
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {data.collections
                    .filter(collection => collection !== note.collection)
                    .sort((a, b) => {
                      if (a === 'Default') return -1;
                      if (b === 'Default') return 1;
                      return a.localeCompare(b);
                    })
                    .map((collection) => (
                      <DropdownMenuItem
                        key={collection}
                        onClick={() => handleMove(collection)}
                      >
                        Move to {collection}
                      </DropdownMenuItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7">
                    <Trash2 className="h-3 w-3 mr-1" />
                    Delete
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Note</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to remove this note from your collection? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <div className="text-xs text-muted-foreground ml-2">
                Kind {note.event.kind}
              </div>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

export default function NotesCollection() {
  const { data, clearAllNotes, getNotesByCollection, deleteCollection, renameCollection } = useSavedNotes();
  const { toast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState('Default');
  const [renameDialogOpen, setRenameDialogOpen] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');

  // Memoize the current collection's notes to ensure reactivity
  const currentCollectionNotes = React.useMemo(() => {
    return getNotesByCollection(selectedCategory);
  }, [getNotesByCollection, selectedCategory]);

  // Memoize the sorted collections to ensure dropdown updates
  const sortedCollections = React.useMemo(() => {
    return [...data.collections].sort((a, b) => {
      // Keep "Default" at the top, then sort alphabetically
      if (a === 'Default') return -1;
      if (b === 'Default') return 1;
      return a.localeCompare(b);
    });
  }, [data.collections]);

  // Ensure selected category is valid when collections change
  React.useEffect(() => {
    if (!data.collections.includes(selectedCategory)) {
      setSelectedCategory(data.collections[0] || 'Default');
    }
  }, [data.collections, selectedCategory]);



  useSeoMeta({
    title: 'Note Organizer',
    description: 'Save, categorize, and rank your favorite Nostr notes. Curate the best content available on Nostr.',
  });

  const handleClearAll = () => {
    clearAllNotes();
    setSelectedCategory('Default');
    toast({
      title: 'All notes cleared',
      description: 'Your collection has been reset.',
    });
  };

  const handleDeleteCollection = (collectionName: string) => {
    deleteCollection(collectionName);
    // If we're deleting the currently selected category, switch to Default
    if (selectedCategory === collectionName) {
      setSelectedCategory('Default');
    }
    toast({
      title: 'Collection deleted',
      description: `${collectionName} collection has been deleted. Notes moved to Default.`,
    });
  };

  const handleRenameCollection = () => {
    const trimmedName = newCollectionName.trim();

    if (!trimmedName) {
      toast({
        title: 'Invalid name',
        description: 'Collection name cannot be empty.',
        variant: 'destructive',
      });
      return;
    }

    if (data.collections.includes(trimmedName)) {
      toast({
        title: 'Name already exists',
        description: 'A collection with this name already exists.',
        variant: 'destructive',
      });
      return;
    }

    const oldName = selectedCategory;
    renameCollection(oldName, trimmedName);
    setSelectedCategory(trimmedName);
    setRenameDialogOpen(false);
    setNewCollectionName('');
    toast({
      title: 'Collection renamed',
      description: `"${oldName}" has been renamed to "${trimmedName}".`,
    });
  };

  const openRenameDialog = (collection?: string) => {
    const collectionToRename = collection || selectedCategory;
    setSelectedCategory(collectionToRename);
    setNewCollectionName(collectionToRename);
    setRenameDialogOpen(true);
  };



  const handleExport = async () => {
    try {
      // Group notes by collection
      const notesByCollection: Record<string, typeof data.notes> = {};

      // Initialize all collections
      data.collections.forEach(collection => {
        notesByCollection[collection] = [];
      });

      // Group notes by their collection
      data.notes.forEach(note => {
        if (notesByCollection[note.collection]) {
          notesByCollection[note.collection].push(note);
        }
      });

      await exportNotesToZip(notesByCollection);

      toast({
        title: 'Export successful!',
        description: 'Your notes have been downloaded as a zip file.',
      });
    } catch (error) {
      console.error('Export failed:', error);
      toast({
        title: 'Export failed',
        description: 'There was an error creating the export file.',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="container mx-auto px-4 py-4 max-w-6xl">
      <div className="mb-4">
        <h1 className="text-2xl font-bold mb-1">Nostr Note Organizer</h1>
        <p className="text-sm text-muted-foreground">
          Save, categorize, and rank your favorite Nostr notes. Curate the best content available on Nostr.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <CollectionList
            collections={sortedCollections}
            selectedCategory={selectedCategory}
            onCategoryChange={setSelectedCategory}
            getNotesByCollection={getNotesByCollection}
            onRenameCollection={openRenameDialog}
            onDeleteCollection={handleDeleteCollection}
          />

          <AddNoteForm onCategoryChange={setSelectedCategory} sortedCollections={sortedCollections} className="mt-4" />

          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              <ImportNotes />
              {data.notes.length > 0 && (
                <Button onClick={handleExport} variant="outline" size="sm" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Export as ZIP
                </Button>
              )}
              {data.notes.length > 0 && (
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm" className="w-full">
                      <BookmarkX className="h-4 w-4 mr-2" />
                      Clear All Notes
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Clear All Notes</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete all saved notes? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearAll}>Clear All</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardContent>
          </Card>

          <Card className="mt-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Account</CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">
                  Login to boost notes and share them with your followers
                </p>
                <LoginArea className="w-full" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-3">
          {data.notes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 px-6 text-center">
                <div className="max-w-sm mx-auto space-y-3">
                  <Bookmark className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="font-medium mb-1 text-sm">No notes saved yet</h3>
                    <p className="text-xs text-muted-foreground">
                      Paste a nevent or note ID to start building your collection
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="w-full">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Folder className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold">{selectedCategory}</h2>
                  <Badge variant="secondary" className="text-sm">
                    {currentCollectionNotes.length} notes
                  </Badge>
                </div>
              </div>

              <div className="space-y-2">
                {currentCollectionNotes.map((note) => (
                  <SavedNoteCard key={note.id} noteId={note.id} />
                ))}
                {currentCollectionNotes.length === 0 && (
                  <Card className="border-dashed">
                    <CardContent className="py-4 text-center">
                      <p className="text-sm text-muted-foreground">
                        No notes in this collection yet
                      </p>
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rename Collection Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Collection</DialogTitle>
            <DialogDescription>
              Enter a new name for the "{selectedCategory}" collection.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="rename-input" className="text-sm font-medium">
              Collection Name
            </Label>
            <Input
              id="rename-input"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Enter collection name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameCollection();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRenameDialogOpen(false);
                setNewCollectionName('');
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleRenameCollection}>
              Rename Collection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}