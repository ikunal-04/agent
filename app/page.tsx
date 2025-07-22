"use client";

import { useState, useEffect } from "react";
import { useAuth, SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUserSync } from "@/hooks/use-user-sync";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link";
import { toast } from "sonner";

interface GeneratedProject {
  projectId: string;
  apiRequestId: string;
  message: string;
  stats: {
    filesGenerated: number;
    setupCommands: number;
    dependencies: number;
  };
  files: Record<string, string>;
  setupCommands: string[];
  dependencies: {
    main: string[];
    dev: string[];
  };
  environmentVariables: Record<string, string>;
}

export default function Home() {
  const { isSignedIn, isLoaded } = useAuth();
  const { dbUser } = useUserSync()
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    database: "postgresql",
    orm: "prisma",
  });

  const [isLoading, setIsLoading] = useState(false);
  const [generatedProject, setGeneratedProject] = useState<GeneratedProject | null>(null);
  const [downloadingProject, setDownloadingProject] = useState<string | null>(null);
  const [hasExistingProject, setHasExistingProject] = useState(false);

  // Check if user has existing project
  useEffect(() => {
    if (isSignedIn && dbUser) {
      checkExistingProject();
    }
  }, [isSignedIn, dbUser]);

  const checkExistingProject = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setHasExistingProject(data.projects && data.projects.length > 0);
      }
    } catch (error) {
      console.error('Error checking existing project:', error);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isSignedIn) {
      router.push('/sign-in');
      return;
    }

    if (!formData.name.trim() || !formData.description.trim()) {
      toast("Please fill in all required fields");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          description: formData.description,
          database: formData.database,
          orm: formData.orm,
          features: {
            auth: true,
            validation: true,
            cors: true,
            swagger: false,
          }
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setGeneratedProject(result);
        toast("Project generated successfully!");
      } else {
        if (result.error === 'Project limit reached') {
          toast(`You can only create one project per account. Please visit your projects page to view your existing project.`);
          // Optionally redirect to projects page
          router.push('/projects');
        } else {
          toast(`Error: ${result.error || 'Failed to generate project'}`);
        }
      }
    } catch (error) {
      console.error('Error generating project:', error);
      toast('Failed to generate project. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async (projectId: string) => {
    setDownloadingProject(projectId);

    try {
      const response = await fetch(`/api/download/${projectId}`);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Download failed');
      }

      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '')
        : `${projectId}-backend.zip`;

      const blob = await response.blob();

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;

      document.body.appendChild(link);
      link.click();

      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast('Download started successfully!');
    } catch (error) {
      console.error('Download error:', error);
      toast(`Download failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setDownloadingProject(null);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-pink-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0" >
        <Image
          src="/new-bg.jpg"
          alt="Background"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <header className="relative z-10 flex justify-between items-center p-6 text-white">
        <Link href="/">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded flex items-center justify-center">
            <Image src={'/agent.png'} alt="Agent" width={100} height={100}/>
            </div>
            <span className="font-semibold text-lg">Innpae</span>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {dbUser && (
            <>
              <Link href="/projects">
                <Button
                  variant="outline"
                  size="sm"
                  className="bg-gray-800/50 hover:bg-gray-700/50 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  My Projects
                </Button>
              </Link>

              <DropdownMenu>
                <DropdownMenuTrigger>
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-pink-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm font-semibold">{dbUser?.firstName?.charAt(0) || ''}</span>
                    </div>
                    <span className="text-sm">{dbUser?.firstName} {dbUser?.lastName || ''}</span>
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-gray-800 border border-gray-700 rounded-lg p-2">
                  <DropdownMenuLabel className="text-white font-medium">Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="hover:bg-gray-700">
                    <SignOutButton />
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          )}
          {!dbUser && (
            <Button onClick={() => router.push('/sign-in')} variant="outline" size="sm" className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-4 rounded-md transition-colors disabled:opacity-50">
              Sign In
            </Button>
          )}
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-120px)] px-6">
        <div className="text-center max-w-4xl mx-auto">
          <div className="mb-6">
            <div className="w-24 h-24 rounded-lg flex items-center justify-center mx-auto">
            <Image src={'/agent.png'} alt="Agent" width={100} height={100}/>
            </div>
          </div>

          <h1 className="text-4xl font-bold text-white mb-4 italic" style={{ fontFamily: 'var(--font-playfair)' }}>
            Generate Backend APIs with AI
          </h1>

          <p className="text-xl text-white/90 mb-6 max-w-2xl mx-auto" style={{ fontFamily: 'var(--font-playfair)' }}>
            Create production-ready backend APIs with Express.js, TypeScript, and your preferred database. No coding required.
          </p>

          {hasExistingProject && (
            <div className="mb-6 p-4 bg-yellow-500/20 border border-yellow-500/50 rounded-lg">
              <div className="flex items-center gap-2 text-yellow-300">
                <span className="text-lg">⚠️</span>
                <span className="font-medium">You already have a project!</span>
              </div>
              <p className="text-yellow-200/80 text-sm mt-1">
                You can only create one project per account. Visit your projects page to view or download your existing project.
              </p>
              <Link href="/projects" className="inline-block mt-2 text-yellow-300 hover:text-yellow-200 underline text-sm">
                View My Projects →
              </Link>
            </div>
          )}

          <form onSubmit={handleSubmit} className="w-full max-w-4xl mx-auto">
            <div className="relative">
              {/* Main Input Bar */}
              <div className="bg-gray-800/90 backdrop-blur-sm rounded-full border border-gray-700/50 p-4 flex items-center gap-4">              
                {/* Project Name Input */}
                <div className="flex-1">
                  <input
                    type="text"
                    placeholder="Project name..."
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full bg-transparent text-white placeholder:text-gray-400 text-sm border-none outline-none"
                    required
                  />
                </div>


              </div>

              {/* Description Input */}
              <div className="mt-4 bg-gray-800/90 backdrop-blur-sm rounded-2xl border border-gray-700/50 p-4">
                <textarea
                  placeholder="Describe your backend API idea... (e.g., Create a REST API for a blog with user authentication, post management, and comments...)"
                  value={formData.description}
                  onKeyDown={handleKeyDown}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  className="w-full bg-transparent text-white placeholder:text-gray-400 text-sm border-none outline-none resize-none min-h-[80px]"
                  required
                />
                
                {/* Bottom Controls */}
                <div className="flex justify-between items-center mt-3">
                  {/* Left Side - Database and ORM Selectors */}
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-sm">DB:</span>
                      <Select value={formData.database} onValueChange={(value) => handleInputChange('database', value)}>
                        <SelectTrigger className="bg-transparent border-none text-white text-sm p-1 h-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="postgresql">PostgreSQL</SelectItem>
                          <SelectItem value="mongodb">MongoDB</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-white/60 text-sm">ORM:</span>
                      <Select value={formData.orm} onValueChange={(value) => handleInputChange('orm', value)}>
                        <SelectTrigger className="bg-transparent border-none text-white text-sm p-1 h-auto">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600">
                          <SelectItem value="prisma">Prisma</SelectItem>
                          <SelectItem value="drizzle">Drizzle</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Right Side - Generate Button */}
                  <Button
                    type="submit"
                    disabled={isLoading || hasExistingProject}
                    className="bg-pink-500 hover:bg-pink-600 text-white font-medium py-2 px-6 rounded-full transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Generating...
                      </>
                    ) : hasExistingProject ? (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Project Limit Reached
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                        </svg>
                        Generate Project
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </main>

      <footer className="relative z-10 flex justify-center items-center text-white/70">
        <p className="text-sm">
          Created by{' '}
          <a 
            href="https://twitter.com/macdev_0" 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-pink-400 hover:text-pink-300 transition-colors underline"
          >
            @macdev_0
          </a>
        </p>
      </footer>

      {generatedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Generated Project</h2>
              <div className="flex gap-2">
                <Button
                  onClick={() => setGeneratedProject(null)}
                  variant="outline"
                  className="bg-gray-700/50 hover:bg-gray-600/50 text-white"
                >
                  Close
                </Button>
                <Link href="/projects">
                  <Button
                    onClick={() => setGeneratedProject(null)}
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                  >
                    View All Projects
                  </Button>
                </Link>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-white font-semibold mb-2">Project Details</h3>
                <p className="text-gray-300">ID: {generatedProject.projectId}</p>
                <p className="text-gray-300">Files Generated: {generatedProject.stats?.filesGenerated}</p>
              </div>

              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-white font-semibold mb-2">Setup Commands</h3>
                <div className="space-y-2">
                  {generatedProject.setupCommands?.map((cmd: string, index: number) => (
                    <div key={index} className="bg-gray-700 p-2 rounded">
                      <code className="text-green-400">{cmd}</code>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-white font-semibold mb-2">Generated Files</h3>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(generatedProject.files || {}).map((filename) => (
                    <div key={filename} className="bg-gray-700 p-2 rounded text-sm">
                      <span className="text-blue-400">{filename}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-white font-semibold mb-2">Download Project</h3>
                <Button
                  onClick={() => handleDownload(generatedProject.projectId)}
                  disabled={downloadingProject === generatedProject.projectId}
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                >
                  {downloadingProject === generatedProject.projectId ? 'Downloading...' : 'Download Project'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
