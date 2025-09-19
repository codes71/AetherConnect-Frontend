"use client";

import Link from 'next/link';
import Image from 'next/image';
import {
  MessageSquare,
  ShieldCheck,
  Bot,
  Server,
  UploadCloud,
  ArrowRight,
  Network,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Logo } from '@/components/logo';
import { CheckIcon } from '@/components/ui/icons';
import { useAuth } from '@/context/auth-context';

export default function LandingPage() {
  const { isAuthenticated, user, isLoading } = useAuth();

  const features = [
    {
      icon: <Network className="h-8 w-8 text-primary" />,
      title: 'Microservices Architecture',
      description: 'Built with a scalable and resilient microservices architecture using Docker and Kubernetes.',
    },
    {
      icon: <MessageSquare className="h-8 w-8 text-primary" />,
      title: 'Real-Time Messaging',
      description: 'Engage in performant 1:1 and group chats with WebSockets and gRPC-based communication.',
    },
    {
      icon: <Bot className="h-8 w-8 text-primary" />,
      title: 'AI-Powered Moderation',
      description: 'Ensure a safe community with automated content moderation powered by Hugging Face transformers.',
    },
    {
      icon: <ShieldCheck className="h-8 w-8 text-primary" />,
      title: 'Enterprise Security',
      description: 'Secure your data with JWT/OAuth2 authentication, end-to-end encryption, and RBAC.',
    },
    {
      icon: <UploadCloud className="h-8 w-8 text-primary" />,
      title: 'Secure File Sharing',
      description: 'Securely share documents, images, and other files, backed by a robust, S3-compatible storage solution.',
    },
    {
      icon: <Server className="h-8 w-8 text-primary" />,
      title: 'Advanced Observability',
      description: 'Full-stack monitoring with Prometheus, Grafana, and Jaeger for enterprise-grade system insights.',
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
          {isLoading ? (
            <div className="h-10 w-36 animate-pulse rounded-md bg-muted" />
          ) : isAuthenticated ? (
            <>
              <span className="hidden text-sm font-medium sm:block">Welcome, {user?.username}!</span>
              <Button asChild>
                <Link href="/chat">
                  Go to Chat <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" asChild>
                <Link href="/login">Log In</Link>
              </Button>
              <Button asChild>
                <Link href="/signup">
                  Sign Up <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main className="flex-1">
        <section className="container mx-auto flex flex-col items-center px-4 py-20 text-center md:py-32">
          <h1 className="text-4xl font-extrabold tracking-tight md:text-6xl">
            Enterprise-Grade Chat, Built on Microservices
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-muted-foreground">
            AetherConnect is a real-time chat application built with a microservices architecture to demonstrate advanced system design, scalability, and fault tolerance.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {isAuthenticated ? (
              <Button size="lg" asChild>
                <Link href="/chat">Open AetherConnect</Link>
              </Button>
            ) : (
              <Button size="lg" asChild>
                <Link href="/signup">Get Started</Link>
              </Button>
            )}
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </section>

        <section id="features" className="bg-secondary py-20 md:py-32">
          <div className="container mx-auto px-4">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold md:text-4xl">
                Advanced System Design Showcase
              </h2>
              <p className="mt-4 text-muted-foreground">
                Explore the production-ready features that make AetherConnect a powerful, scalable, and secure platform.
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
                    <h2 className="text-3xl font-bold md:text-4xl">Powered by a Modern Stack</h2>
                    <p className="mt-4 text-muted-foreground">
                        Leveraging NestJS for scalable backend services, gRPC for efficient communication, and Kafka for event-driven architecture, AetherConnect is built for performance.
                    </p>
                    <ul className="mt-6 space-y-4 text-muted-foreground">
                        <li className="flex items-center gap-2">
                            <CheckIcon className="h-5 w-5 text-primary" />
                            <span>Scalable, decoupled, and resilient services</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckIcon className="h-5 w-5 text-primary" />
                            <span>High-performance with Redis caching and DB indexing</span>
                        </li>
                        <li className="flex items-center gap-2">
                            <CheckIcon className="h-5 w-5 text-primary" />
                            <span>Real-time client-server communication with Socket.io</span>
                        </li>
                    </ul>
                    
                </div>
                <Image
                    src="https://picsum.photos/seed/aetherconnect/600/400"
                    alt="System architecture"
                    width={600}
                    height={400}
                    className="rounded-lg shadow-lg"
                    data-ai-hint="system architecture"
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


