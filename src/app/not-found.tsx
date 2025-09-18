import Link from 'next/link';

export default function NotFound() {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen bg-background text-foreground">
          <h1 className="text-6xl font-bold text-primary">404</h1>
          <p className="text-xl mt-4">Page Not Found</p>
          <p className="text-muted-foreground mt-2">The page you are looking for does not exist.</p>
          <Link href="/" className="mt-6 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
            Go to Home
          </Link>
        </div>
      </body>
    </html>
  );
}
