import React, { useState } from 'react';
import { MessageSquare, Copy, Check, Edit3, X } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/useToast';

interface ThoughtsEditorProps {
  thoughts?: string;
  onSave: (thoughts: string) => void;
  className?: string;
}

export function ThoughtsEditor({ thoughts = '', onSave, className }: ThoughtsEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(thoughts);
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleSave = () => {
    onSave(editValue);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditValue(thoughts);
    setIsEditing(false);
  };

  const handleCopy = async () => {
    if (!thoughts.trim()) return;

    try {
      await navigator.clipboard.writeText(thoughts);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: 'Copied to clipboard',
        description: 'Your thoughts have been copied to the clipboard.',
      });
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Could not copy to clipboard. Please try again.',
        variant: 'destructive',
      });
    }
  };

  const hasThoughts = thoughts.trim().length > 0;

  if (!isEditing && !hasThoughts) {
    return (
      <div className={className}>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setIsEditing(true)}
          className="h-8 text-muted-foreground hover:text-foreground"
        >
          <MessageSquare className="h-3 w-3 mr-2" />
          Add your thoughts
        </Button>
      </div>
    );
  }

  if (isEditing) {
    return (
      <div className={`space-y-2 ${className}`}>
        <div className="flex items-center gap-2 mb-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Your thoughts</span>
        </div>
        <Textarea
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          placeholder="Write your thoughts about this note..."
          className="min-h-[80px] text-sm"
          autoFocus
        />
        <div className="flex items-center gap-2">
          <Button size="sm" onClick={handleSave}>
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={handleCancel}>
            <X className="h-3 w-3 mr-1" />
            Cancel
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">Your thoughts</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0"
            title="Copy thoughts to clipboard"
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-600" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsEditing(true)}
            className="h-6 w-6 p-0"
            title="Edit thoughts"
          >
            <Edit3 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="text-sm text-foreground bg-muted/30 rounded-md p-3 whitespace-pre-wrap">
        {thoughts}
      </div>
    </div>
  );
}