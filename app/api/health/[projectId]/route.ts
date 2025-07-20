/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// Store running processes
const runningProjects = new Map<string, any>();

export async function POST(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    
    console.log(`🏥 Health check requested for project: ${projectId}`);

    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get project from database
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user: { clerkId: userId }
      },
      include: {
        apiRequests: {
          include: {
            generatedApis: true,
            databaseSchema: true,
            setupCommands: {
              orderBy: { order: 'asc' }
            }
          }
        }
      }
    });
    
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Get the latest API request
    const apiRequest = project.apiRequests[0];
    
    if (!apiRequest || apiRequest.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Project generation not completed' },
        { status: 400 }
      );
    }

    // Parse generated files from database
    let generatedFiles: Record<string, string> = {};
    
    if (apiRequest.generatedApis.length > 0) {
      try {
        const codeData = JSON.parse(apiRequest.generatedApis[0].code);
        if (typeof codeData === 'object') {
          generatedFiles = codeData;
        }
      } catch (error) {
        console.warn('Could not parse generated files from database');
        return NextResponse.json(
          { error: 'Failed to parse generated project files' },
          { status: 500 }
        );
      }
    }

    // Create temporary directory for the project
    const tempDir = path.join(process.cwd(), 'temp-projects', projectId);
    
    try {
      // Clean up any existing temp directory
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Directory might not exist, ignore
      }
      
      await fs.mkdir(tempDir, { recursive: true });
      
      console.log(`📁 Created temp directory: ${tempDir}`);

      // Write all project files to temp directory
      await Promise.all(
        Object.entries(generatedFiles).map(async ([filepath, content]) => {
          const fullPath = path.join(tempDir, filepath);
          const dir = path.dirname(fullPath);
          
          // Create directory if it doesn't exist
          await fs.mkdir(dir, { recursive: true });
          
          // Write file content
          await fs.writeFile(fullPath, content as string, 'utf8');
        })
      );

      console.log(`✍️ Written ${Object.keys(generatedFiles).length} files to temp directory`);

      // Create package.json if it doesn't exist or update it
      const packageJsonPath = path.join(tempDir, 'package.json');
      let packageJson: any;
      
      try {
        const packageContent = await fs.readFile(packageJsonPath, 'utf8');
        packageJson = JSON.parse(packageContent);
      } catch (e) {
        // Create basic package.json if it doesn't exist
        packageJson = {
          name: project.name.toLowerCase().replace(/\s+/g, '-'),
          version: '1.0.0',
          description: project.description || '',
          main: 'dist/app.js',
          scripts: {},
          dependencies: {},
          devDependencies: {}
        };
      }

      // Add necessary scripts
      packageJson.scripts = {
        ...packageJson.scripts,
        "build": "tsc",
        "dev": "ts-node src/app.ts",
        "start": "node dist/app.js",
        "test": "echo \"No tests specified\" && exit 0"
      };

      // Write updated package.json
      await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2));

      console.log('📦 Updated package.json with scripts');

      // Install dependencies
      console.log('📦 Installing dependencies...');
      const installResult = await runCommand('npm', ['install'], tempDir);
      
      if (!installResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to install dependencies',
          details: installResult.error,
          step: 'npm install'
        }, { status: 500 });
      }

      // Run setup commands from database
      for (const setupCmd of apiRequest.setupCommands) {
        console.log(`🔧 Running setup command: ${setupCmd.command}`);
        
        const [cmd, ...args] = setupCmd.command.split(' ');
        const setupResult = await runCommand(cmd, args, tempDir);
        
        if (!setupResult.success) {
          console.warn(`⚠️ Setup command failed: ${setupCmd.command}`);
          // Continue anyway, some setup commands might not be critical
        }
      }

      // Build the project
      console.log('🏗️ Building project...');
      const buildResult = await runCommand('npm', ['run', 'build'], tempDir);
      
      if (!buildResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to build project',
          details: buildResult.error,
          step: 'npm run build'
        }, { status: 500 });
      }

      // Start the server on a random port
      const port = Math.floor(Math.random() * (9999 - 3001) + 3001);
      console.log(`🚀 Starting server on port ${port}...`);

      const serverResult = await startServer(tempDir, port, projectId);
      
      if (!serverResult.success) {
        return NextResponse.json({
          success: false,
          error: 'Failed to start server',
          details: serverResult.error,
          step: 'server start'
        }, { status: 500 });
      }

      // Test health endpoint
      console.log(`🏥 Testing health endpoint...`);
      const healthResult = await testHealthEndpoint(`http://localhost:${port}/api/health`);

      // Store running project info
      runningProjects.set(projectId, {
        port,
        process: serverResult.process,
        tempDir,
        startedAt: new Date().toISOString(),
      });

      // Clean up temp directory after a delay (optional)
      setTimeout(async () => {
        try {
          const runningProject = runningProjects.get(projectId);
          if (runningProject?.process) {
            runningProject.process.kill();
          }
          await fs.rm(tempDir, { recursive: true, force: true });
          runningProjects.delete(projectId);
          console.log(`🧹 Cleaned up temp directory for project: ${projectId}`);
        } catch (e) {
          console.warn(`⚠️ Failed to cleanup temp directory: ${e}`);
        }
      }, 300000); // 5 minutes

      return NextResponse.json({
        success: true,
        message: 'Project is running successfully!',
        healthCheck: healthResult,
        serverInfo: {
          port,
          healthUrl: `http://localhost:${port}/api/health`,
          startedAt: new Date().toISOString(),
        },
        buildLog: buildResult.output,
      });

    } catch (error) {
      // Clean up temp directory on error
      try {
        await fs.rm(tempDir, { recursive: true, force: true });
      } catch (e) {
        // Ignore cleanup errors
      }
      
      throw error;
    }

  } catch (error) {
    console.error('❌ Error in health check:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Health check failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}

// GET endpoint to check if a project is currently running
export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { projectId } = params;
    
    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const runningProject = runningProjects.get(projectId);

    if (!runningProject) {
      return NextResponse.json({
        running: false,
        message: 'Project is not currently running'
      });
    }

    // Test if the server is still responsive
    const healthResult = await testHealthEndpoint(`http://localhost:${runningProject.port}/api/health`);

    return NextResponse.json({
      running: true,
      serverInfo: {
        port: runningProject.port,
        healthUrl: `http://localhost:${runningProject.port}/api/health`,
        startedAt: runningProject.startedAt,
      },
      healthCheck: healthResult,
    });

  } catch (error) {
    console.error('❌ Error checking project status:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Failed to check project status',
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    }, { status: 500 });
  }
}

// Helper function to run commands
async function runCommand(command: string, args: string[], cwd: string): Promise<{success: boolean, output?: string, error?: string}> {
  return new Promise((resolve) => {
    const process = spawn(command, args, {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let error = '';

    process.stdout?.on('data', (data) => {
      output += data.toString();
    });

    process.stderr?.on('data', (data) => {
      error += data.toString();
    });

    process.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({ success: false, error: error || `Command failed with code ${code}` });
      }
    });

    process.on('error', (err) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// Helper function to start the server
async function startServer(cwd: string, port: number, projectId: string): Promise<{success: boolean, process?: any, error?: string}> {
  return new Promise((resolve) => {
    // Set PORT environment variable
    const env = { ...process.env, PORT: port.toString() };
    
    const serverProcess = spawn('npm', ['start'], {
      cwd,
      env,
      stdio: ['pipe', 'pipe', 'pipe'],
      shell: true
    });

    let output = '';
    let error = '';

    serverProcess.stdout?.on('data', (data: Buffer) => {
      output += data.toString();
      // Check if server started successfully
      if (output.includes('Server running') || output.includes('Listening on port') || output.includes('started')) {
        resolve({ success: true, process: serverProcess });
      }
    });

    serverProcess.stderr?.on('data', (data: Buffer) => {
      error += data.toString();
    });

    // Timeout after 30 seconds
    setTimeout(() => {
      if (!serverProcess.killed) {
        serverProcess.kill();
      }
      resolve({ success: false, error: 'Server startup timeout' });
    }, 30000);

    serverProcess.on('close', (code: number | null) => {
      if (code !== 0) {
        resolve({ success: false, error: `Server process exited with code ${code}: ${error}` });
      }
    });

    serverProcess.on('error', (err: Error) => {
      resolve({ success: false, error: err.message });
    });
  });
}

// Helper function to test health endpoint
async function testHealthEndpoint(url: string): Promise<{success: boolean, response?: any, error?: string}> {
  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return { success: true, response: data };
    } else {
      return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
    }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}