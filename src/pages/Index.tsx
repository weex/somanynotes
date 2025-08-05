import { useSeoMeta } from '@unhead/react';
import { Link } from 'react-router-dom';
import { Bookmark, ArrowRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const Index = () => {
  useSeoMeta({
    title: 'Nostr Note Organizer',
    description: 'Save, categorize, and rank your favorite Nostr notes. Curate the best content available on Nostr.',
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="flex justify-center mb-6">
            <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
              <Bookmark className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            Nostr Note Organizer
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 max-w-2xl mx-auto">
            Save, categorize, and rank your favorite Nostr notes. Curate the best content available on Nostr.
          </p>
          <Link to="/notes">
            <Button size="lg" className="text-lg px-8 py-3">
              Start Collecting
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bookmark className="h-5 w-5 text-blue-600" />
                Save Notes
              </CardTitle>
              <CardDescription>
                Paste any nevent or note ID to save Nostr notes to your personal collection
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Support for nevent1 and note1 IDs</li>
                <li>• Automatic author info fetching</li>
                <li>• Rich content preview</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-5 w-5 bg-green-600 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">#</span>
                </div>
                Categorize
              </CardTitle>
              <CardDescription>
                Organize notes into custom collections for better organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Create custom collections</li>
                <li>• Rename and organize collections</li>
                <li>• Move notes between collections</li>
                <li>• Delete collections safely</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className="h-5 w-5 bg-purple-600 rounded-sm flex items-center justify-center">
                  <span className="text-white text-xs font-bold">↑</span>
                </div>
                Rank
              </CardTitle>
              <CardDescription>
                Upvote your favorite notes to create personal rankings
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Upvote and downvote notes</li>
                <li>• Automatic sorting by score</li>
                <li>• Track save timestamps</li>
              </ul>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <p className="text-sm text-muted-foreground mb-4">
            Vibed with{' '}
            <a
              href="https://soapbox.pub/mkstack"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              MKStack
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Index;
