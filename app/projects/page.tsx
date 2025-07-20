"use client";

import { useState, useEffect } from "react";
import { useAuth, SignOutButton } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useUserSync } from "@/hooks/use-user-sync";
import { Button } from "@/components/ui/button";
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

interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

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

export default function ProjectsPage() {
  const { isSignedIn, isLoaded } = useAuth();
  const { dbUser } = useUserSync()
  const router = useRouter();

  const [projects, setProjects] = useState<Project[]>([]);
  const [downloadingProject, setDownloadingProject] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState<GeneratedProject | null>(null);

  useEffect(() => {
    if (isSignedIn && dbUser) {
      fetchProjects();
    }
  }, [isSignedIn, dbUser]);

  const fetchProjects = async () => {
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
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

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('Content-Disposition');
      const filename = contentDisposition 
        ? contentDisposition.split('filename=')[1]?.replace(/"/g, '') 
        : `${projectId}-backend.zip`;

      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      
      // Trigger download
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
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

  const handleViewProject = async (project: Project) => {
    try {
      // Fetch project details from the API
      const response = await fetch(`/api/projects/${project.id}/details`);
      if (response.ok) {
        const data = await response.json();
        setSelectedProject(data);
      } else {
        // If no detailed data available, create a basic project object
        setSelectedProject({
          projectId: project.id,
          apiRequestId: '',
          message: 'Project details loaded',
          stats: {
            filesGenerated: 0,
            setupCommands: 0,
            dependencies: 0,
          },
          files: {},
          setupCommands: [],
          dependencies: {
            main: [],
            dev: [],
          },
          environmentVariables: {},
        });
      }
    } catch (error) {
      console.error('Error fetching project details:', error);
      // Show basic project info if API fails
      setSelectedProject({
        projectId: project.id,
        apiRequestId: '',
        message: 'Project details loaded',
        stats: {
          filesGenerated: 0,
          setupCommands: 0,
          dependencies: 0,
        },
        files: {},
        setupCommands: [],
        dependencies: {
          main: [],
          dev: [],
        },
        environmentVariables: {},
      });
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

  if (!isSignedIn) {
    router.push('/sign-in');
    return null;
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 z-0">
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
              <Link href="/">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="bg-gray-800/50 hover:bg-gray-700/50 text-white font-medium py-2 px-4 rounded-md transition-colors"
                >
                  Create New Project
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
        <div className="w-full max-w-6xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-4xl font-bold text-white">My Projects</h1>
            <Link href="/">
              <Button 
                variant="outline" 
                className="bg-gray-800/50 hover:bg-gray-700/50 text-white"
              >
                Create New Project
              </Button>
            </Link>
          </div>
          
          {projects.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-24 h-24 bg-gray-800/50 rounded-lg flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">📁</span>
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No projects yet</h3>
              <p className="text-gray-300 mb-6">Create your first project to get started!</p>
              <Link href="/">
                <Button 
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                >
                  Create Project
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map((project) => (
                <div key={project.id} className="bg-gray-800/80 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50">
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-white">{project.name}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${project.status === 'COMPLETED' ? 'bg-green-500/20 text-green-400' :
                        project.status === 'PENDING' ? 'bg-yellow-500/20 text-yellow-400' :
                          'bg-red-500/20 text-red-400'
                      }`}>
                      {project.status}
                    </span>
                  </div>
                  <p className="text-gray-300 text-sm mb-4 line-clamp-2">{project.description}</p>
                  <p className="text-gray-400 text-xs mb-4">
                    Created: {new Date(project.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => handleViewProject(project)}
                      variant="outline" 
                      size="sm"
                      className="flex-1 bg-gray-700/50 hover:bg-gray-600/50 text-white"
                    >
                      View
                    </Button>
                    {project.status === 'COMPLETED' && (
                      <Button 
                        onClick={() => handleDownload(project.id)}
                        disabled={downloadingProject === project.id}
                        size="sm"
                        className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
                      >
                        {downloadingProject === project.id ? 'Downloading...' : 'Download'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      {selectedProject && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-6 z-50">
          <div className="bg-gray-900 rounded-lg p-6 max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-white">Project Details</h2>
              <div className="flex gap-2">
                <Button 
                  onClick={() => setSelectedProject(null)}
                  variant="outline"
                  className="bg-gray-700/50 hover:bg-gray-600/50 text-white"
                >
                  Close
                </Button>
                <Button 
                  onClick={() => handleDownload(selectedProject.projectId)}
                  disabled={downloadingProject === selectedProject.projectId}
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                >
                  {downloadingProject === selectedProject.projectId ? 'Downloading...' : 'Download Project'}
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-800 p-4 rounded">
                <h3 className="text-white font-semibold mb-2">Project Details</h3>
                <p className="text-gray-300">ID: {selectedProject.projectId}</p>
                <p className="text-gray-300">Files Generated: {selectedProject.stats?.filesGenerated}</p>
                <p className="text-gray-300">Setup Commands: {selectedProject.stats?.setupCommands}</p>
                <p className="text-gray-300">Dependencies: {selectedProject.stats?.dependencies}</p>
              </div>

              {selectedProject.setupCommands && selectedProject.setupCommands.length > 0 && (
                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-white font-semibold mb-2">Setup Commands</h3>
                  <div className="space-y-2">
                    {selectedProject.setupCommands.map((cmd: string, index: number) => (
                      <div key={index} className="bg-gray-700 p-2 rounded">
                        <code className="text-green-400">{cmd}</code>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProject.files && Object.keys(selectedProject.files).length > 0 && (
                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-white font-semibold mb-2">Generated Files</h3>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.keys(selectedProject.files).map((filename) => (
                      <div key={filename} className="bg-gray-700 p-2 rounded text-sm">
                        <span className="text-blue-400">{filename}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {selectedProject.dependencies && (selectedProject.dependencies.main.length > 0 || selectedProject.dependencies.dev.length > 0) && (
                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-white font-semibold mb-2">Dependencies</h3>
                  {selectedProject.dependencies.main.length > 0 && (
                    <div className="mb-3">
                      <h4 className="text-white/80 text-sm font-medium mb-2">Main Dependencies:</h4>
                      <div className="space-y-1">
                        {selectedProject.dependencies.main.map((dep: string, index: number) => (
                          <div key={index} className="bg-gray-700 p-2 rounded text-sm">
                            <code className="text-yellow-400">{dep}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedProject.dependencies.dev.length > 0 && (
                    <div>
                      <h4 className="text-white/80 text-sm font-medium mb-2">Dev Dependencies:</h4>
                      <div className="space-y-1">
                        {selectedProject.dependencies.dev.map((dep: string, index: number) => (
                          <div key={index} className="bg-gray-700 p-2 rounded text-sm">
                            <code className="text-cyan-400">{dep}</code>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {selectedProject.environmentVariables && Object.keys(selectedProject.environmentVariables).length > 0 && (
                <div className="bg-gray-800 p-4 rounded">
                  <h3 className="text-white font-semibold mb-2">Environment Variables</h3>
                  <div className="space-y-2">
                    {Object.entries(selectedProject.environmentVariables).map(([key, value]) => (
                      <div key={key} className="bg-gray-700 p-2 rounded text-sm">
                        <span className="text-purple-400">{key}</span>
                        <span className="text-gray-400"> = </span>
                        <span className="text-green-400">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 