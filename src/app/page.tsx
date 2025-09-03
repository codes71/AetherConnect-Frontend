import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare,
  Users,
  Bot,
  Settings,
  UploadCloud,
  ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';

export default function LandingPage() {
  const features = [
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: 'Direct Messaging',
      description: 'Engage in private, real-time conversations with end-to-end security.',
    },
    {
      icon: <Users className="h-8 w-8 text-primary" />,
      title: 'Group Chats',
      description: 'Collaborate and socialize in customizable group chats with roles and permissions.',
    },
    {
      icon: <Bot className="h-8 w-8 text-primary" />,
      title: 'AI Smart Replies',
      description: 'Save time with context-aware reply suggestions powered by cutting-edge AI.',
    },
    {
      icon: <UploadCloud className="h-8 w-8 text-primary" />,
      title: 'File Sharing',
      description: 'Securely share documents, images, and other files with your contacts.',
    },
    {
      icon: <Settings className="h-8 w-8 text-primary" />,
      title: 'Customizable',
      description: 'Personalize your experience with themes, notification settings, and more.',
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="container mx-auto flex h-20 items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2">
          <Logo />
          <span className="text-xl font-bold">Aether Connect</span>
        </Link>
        <nav className="flex items-center gap-4">
          <Button variant="ghost" asChild>
            <Link href="/login">Log In</Link>
          </Button>
          <Button asChild>
            <Link href="/signup">
              Sign Up <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="container mx-auto flex flex-col items-center px-4 py-20 text-center md:py-32">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            The Future of Seamless Communication
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            Aether Connect provides a secure, fast, and intelligent platform for all your messaging needs, from one-on-one chats to large group collaborations.
          </p>
          <div className="mt-8 flex gap-4">
            <Button size="lg" asChild>
              <Link href="/signup">Get Started for Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </section>

        <section id="features" className="bg-secondary py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold md:text-4xl">
                Everything You Need to Connect
              </h2>
              <p className="mt-4 text-muted-foreground">
                Discover the powerful features that make Aether Connect the ultimate messaging app.
              </p>
            </div>
            <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <Card key={feature.title} className="flex flex-col items-center text-center">
                  <CardHeader>
                    {feature.icon}
                    <CardTitle className="mt-4">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{feature.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="container mx-auto px-4 py-20 md:py-32">
            <div className="grid items-center gap-12 md:grid-cols-2">
                <div>
                    <h2 className="text-3xl font-bold md:text-4xl">Powered by AI</h2>
                    <p className="mt-4 text-muted-foreground">
                        Our intelligent system analyzes conversation context to provide you with relevant, one-tap replies. Spend less time typing and more time connecting.
                    </p>
                    <ul className="mt-6 space-y-4 text-muted-foreground">
                        <li className="flex items-center gap-2">
                            <CheckIcon className="h-5 w-5 text-primary" />
                            <span>Context-aware suggestions</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckIcon className="h-5 w-5 text-primary" />
                            <span>Reduces repetitive typing</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckIcon className="h-5 w-5 text-primary" />
                            <span>Adapts to your conversation style</span>
                        </li>
                    </ul>
                </div>
                <Image
                    src="https://picsum.photos/600/400"
                    alt="AI in action"
                    width={600}
                    height={400}
                    className="rounded-lg shadow-lg"
                    data-ai-hint="ai abstract"
                />
            </div>
        </section>
      </main>

      <footer className="bg-secondary">
        <div className="container mx-auto flex flex-col items-center justify-between gap-4 px-4 py-8 md:flex-row">
          <div className="flex items-center gap-2">
            <Logo />
            <span className="font-bold">Aether Connect</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Aether Connect. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
