import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { projectId } = await params;
    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user: { clerkId: userId }
      },
      include: {
        apiRequests: {
          include: {
            generatedFiles: true,
            generatedApis: true,
            databaseSchema: true,
            setupCommands: {
              orderBy: { order: 'asc' }
            },
            dependencies: true,
            environmentVariables: true
          },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    const latestApiRequest = project.apiRequests[0];
    
    if (!latestApiRequest) {
      return NextResponse.json(
        { error: 'No API request found for this project' },
        { status: 404 }
      );
    }

    // Transform the data to match the frontend interface
    const files: Record<string, string> = {};
    latestApiRequest.generatedFiles.forEach(file => {
      files[file.filename] = file.content;
    });

    const setupCommands: string[] = latestApiRequest.setupCommands.map(cmd => cmd.command);
    
    const dependencies = {
      main: latestApiRequest.dependencies
        .filter(dep => dep.type === 'MAIN')
        .map(dep => `${dep.name}@${dep.version}`),
      dev: latestApiRequest.dependencies
        .filter(dep => dep.type === 'DEV')
        .map(dep => `${dep.name}@${dep.version}`)
    };

    const environmentVariables: Record<string, string> = {};
    latestApiRequest.environmentVariables.forEach(env => {
      environmentVariables[env.key] = env.value;
    });

    return NextResponse.json({
      projectId: project.id,
      apiRequestId: latestApiRequest.id,
      message: `Project generated with ${latestApiRequest.databaseType} + ${latestApiRequest.ormType}`,
      stats: {
        filesGenerated: latestApiRequest.generatedFiles.length,
        setupCommands: latestApiRequest.setupCommands.length,
        dependencies: latestApiRequest.dependencies.length,
      },
      files,
      setupCommands,
      dependencies,
      environmentVariables,
    });

  } catch (error) {
    console.error('❌ Error fetching project details:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch project details',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
} 