import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Card className="w-full max-w-sm bg-card border-border">
        <CardContent className="pt-6 text-center space-y-6">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-indigo-500/15">
            <span className="text-2xl text-indigo-400">?</span>
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
            <p className="text-sm text-muted-foreground">
              The page you&apos;re looking for doesn&apos;t exist or has been moved.
            </p>
          </div>
          <Button asChild className="w-full bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 h-11">
            <a href="/">Go Home</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
