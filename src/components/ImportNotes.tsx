import React, { useState, useRef } from 'react';
import { Upload, AlertCircle, CheckCircle, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

import { useSavedNotes } from '@/hooks/useSavedNotes';
import { useToast } from '@/hooks/useToast';
import type { ImportResult } from '@/lib/importNotes';

interface ImportNotesProps {
  className?: string;
}

export function ImportNotes({ className }: ImportNotesProps) {
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [mergeCollections, setMergeCollections] = useState(true);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const { importNotes } = useSavedNotes();
  const { toast } = useToast();

  const handleFileSelect = (file: File) => {
    if (!file.name.endsWith('.zip')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select a ZIP file exported from Nostr Note Organizer.',
        variant: 'destructive',
      });
      return;
    }

    handleImport(file);
  };

  const handleImport = async (file: File) => {
    setIsImporting(true);
    setImportResult(null);

    try {
      const result = await importNotes(file, {
        overwriteExisting,
        mergeCollections,
      });

      setImportResult(result);

      if (result.success) {
        toast({
          title: 'Import successful!',
          description: `Imported ${result.imported} notes${result.skipped > 0 ? `, skipped ${result.skipped}` : ''}.`,
        });
      } else {
        toast({
          title: 'Import failed',
          description: 'There were errors importing your notes. Check the details below.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setImportResult({
        success: false,
        imported: 0,
        skipped: 0,
        errors: [errorMsg],
        collections: [],
      });

      toast({
        title: 'Import failed',
        description: errorMsg,
        variant: 'destructive',
      });
    } finally {
      setIsImporting(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();

    const files = Array.from(e.dataTransfer.files);
    const zipFile = files.find(file => file.name.endsWith('.zip'));

    if (zipFile) {
      handleFileSelect(zipFile);
    } else {
      toast({
        title: 'Invalid file type',
        description: 'Please drop a ZIP file exported from Nostr Note Organizer.',
        variant: 'destructive',
      });
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const resetImport = () => {
    setImportResult(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className={className}>
      {!importResult ? (
        <>
          {/* Main Import Button */}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <Upload className="h-4 w-4 mr-2" />
            {isImporting ? 'Importing...' : 'Import from ZIP'}
          </Button>

          {/* Advanced Options Toggle */}
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs"
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            {showAdvanced ? 'Hide Options' : 'Import Options'}
          </Button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-2 p-2 border rounded-md bg-muted/20">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="overwrite"
                  checked={overwriteExisting}
                  onCheckedChange={(checked) => setOverwriteExisting(checked === true)}
                />
                <Label htmlFor="overwrite" className="text-xs">
                  Overwrite existing notes
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="merge"
                  checked={mergeCollections}
                  onCheckedChange={(checked) => setMergeCollections(checked === true)}
                />
                <Label htmlFor="merge" className="text-xs">
                  Merge collections
                </Label>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {/* Import Progress */}
          {isImporting && (
            <div className="space-y-1">
              <Label className="text-xs">Importing notes...</Label>
              <Progress value={undefined} className="w-full h-2" />
            </div>
          )}
        </>
      ) : (
        /* Import Results */
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {importResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className="text-sm font-medium">
                {importResult.success ? 'Import Complete' : 'Import Failed'}
              </span>
            </div>
            <Button variant="ghost" size="sm" onClick={resetImport} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>

          {/* Import Statistics */}
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center p-2 bg-green-50 dark:bg-green-950 rounded">
              <div className="text-lg font-bold text-green-600 dark:text-green-400">
                {importResult.imported}
              </div>
              <div className="text-xs text-green-600 dark:text-green-400">
                Imported
              </div>
            </div>

            <div className="text-center p-2 bg-yellow-50 dark:bg-yellow-950 rounded">
              <div className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                {importResult.skipped}
              </div>
              <div className="text-xs text-yellow-600 dark:text-yellow-400">
                Skipped
              </div>
            </div>
          </div>

          {/* Collections */}
          {importResult.collections.length > 0 && (
            <div>
              <Label className="text-xs font-medium mb-1 block">
                Collections Imported
              </Label>
              <div className="flex flex-wrap gap-1">
                {importResult.collections.map((collection) => (
                  <Badge key={collection} variant="secondary" className="text-xs">
                    {collection}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Errors */}
          {importResult.errors.length > 0 && (
            <div>
              <Label className="text-xs font-medium mb-1 block text-red-600">
                Errors ({importResult.errors.length})
              </Label>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {importResult.errors.slice(0, 3).map((error, index) => (
                  <div key={index} className="text-xs text-red-600 bg-red-50 dark:bg-red-950 p-1 rounded">
                    {error}
                  </div>
                ))}
                {importResult.errors.length > 3 && (
                  <div className="text-xs text-muted-foreground">
                    +{importResult.errors.length - 3} more errors
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}