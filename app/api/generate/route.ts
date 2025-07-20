import { NextRequest, NextResponse } from 'next/server';
import { generateBackendProject } from '@/lib/gemini';
import { ProjectConfig } from '@/lib/gemini-prompts';
import { prisma } from '@/lib/prisma';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting project generation...');
    
    // Get authenticated user
    const { userId } = await auth();
    const user = await currentUser();
    
    if (!userId || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    
    // Validate required fields
    const { name, description, database, orm, features = {} } = body;
    
    if (!name || !description || !database || !orm) {
      return NextResponse.json(
        { error: 'Missing required fields: name, description, database, orm' },
        { status: 400 }
      );
    }

    // Validate tech stack options
    if (!['postgresql', 'mongodb'].includes(database)) {
      return NextResponse.json(
        { error: 'Database must be either "postgresql" or "mongodb"' },
        { status: 400 }
      );
    }

    if (!['prisma', 'drizzle'].includes(orm)) {
      return NextResponse.json(
        { error: 'ORM must be either "prisma" or "drizzle"' },
        { status: 400 }
      );
    }

    const config: ProjectConfig = {
      name: name.trim(),
      description: description.trim(),
      database,
      orm,
      features: {
        auth: features.auth || false,
        validation: features.validation || true,
        cors: features.cors || true,
        swagger: features.swagger || false,
      }
    };

    console.log('📋 Project config:', {
      name: config.name,
      tech: `${config.database} + ${config.orm}`,
      features: Object.keys(config.features).filter(k => config.features[k as keyof typeof config.features])
    });

    // Ensure user exists in our database
    let dbUser = await prisma.user.findUnique({
      where: { clerkId: userId }
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          clerkId: userId,
          email: user.emailAddresses[0]?.emailAddress || '',
          firstName: user.firstName || null,
          lastName: user.lastName || null,
          avatarUrl: user.imageUrl || null,
        }
      });
    }

    // Create project
    const project = await prisma.project.create({
      data: {
        name: config.name,
        description: config.description,
        userId: dbUser.id,
      }
    });

    console.log(`🆔 Created project: ${project.id}`);

    // Create API request with PENDING status
    const apiRequest = await prisma.apiRequest.create({
      data: {
        projectId: project.id,
        userId: dbUser.id,
        prompt: config.description,
        status: 'PENDING',
        databaseType: database.toUpperCase() as 'POSTGRESQL' | 'MONGODB',
        ormType: orm.toUpperCase() as 'PRISMA' | 'DRIZZLE',
        frameworkType: 'EXPRESS',
        languageType: 'TYPESCRIPT',
      }
    });

    console.log(`🆔 Created API request: ${apiRequest.id}`);

    // Update status to PROCESSING
    await prisma.apiRequest.update({
      where: { id: apiRequest.id },
      data: { status: 'PROCESSING' }
    });

    try {
      // Generate the backend project using Gemini
      const generatedProject = await generateBackendProject(config);
      
      console.log(`✅ Project generated successfully with ${Object.keys(generatedProject.files).length} files`);

      // Create database schema record
      await prisma.databaseSchema.create({
        data: {
          apiRequestId: apiRequest.id,
          schema: JSON.stringify(generatedProject.files['prisma/schema.prisma'] || generatedProject.files['src/db/schema.ts'] || ''),
          migrations: JSON.stringify(generatedProject.files['prisma/migrations'] || ''),
        }
      });

      // Create generated APIs
      const apiEndpoints = [
        { name: 'Health Check', endpoint: '/api/health', method: 'GET', description: 'Health check endpoint' },
        { name: 'User Management', endpoint: '/api/users', method: 'GET', description: 'User management endpoints' },
        { name: 'User Create', endpoint: '/api/users', method: 'POST', description: 'Create user endpoint' },
        { name: 'User Update', endpoint: '/api/users/:id', method: 'PUT', description: 'Update user endpoint' },
        { name: 'User Delete', endpoint: '/api/users/:id', method: 'DELETE', description: 'Delete user endpoint' },
      ];

      for (const endpoint of apiEndpoints) {
        await prisma.generatedApi.create({
          data: {
            apiRequestId: apiRequest.id,
            name: endpoint.name,
            description: endpoint.description,
            endpoint: endpoint.endpoint,
            method: endpoint.method as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'OPTIONS' | 'HEAD',
            code: JSON.stringify(generatedProject.files) || '',
          }
        });
      }

      // Create setup commands
      const setupCommands = [
        { order: 1, command: 'npm install', description: 'Install dependencies', category: 'INSTALL' },
        { order: 2, command: 'npm install -D typescript @types/node', description: 'Install TypeScript dependencies', category: 'INSTALL' },
        { order: 3, command: 'cp .env.example .env', description: 'Create environment file', category: 'SETUP' },
        { order: 4, command: 'npx prisma generate', description: 'Generate Prisma client', category: 'CONFIGURE' },
        { order: 5, command: 'npx prisma db push', description: 'Push database schema', category: 'MIGRATE' },
        { order: 6, command: 'npm run dev', description: 'Start development server', category: 'START' },
      ];

      for (const cmd of setupCommands) {
        await prisma.setupCommand.create({
          data: {
            apiRequestId: apiRequest.id,
            order: cmd.order,
            command: cmd.command,
            description: cmd.description,
            category: cmd.category as 'SETUP' | 'INSTALL' | 'CONFIGURE' | 'MIGRATE' | 'START' | 'TEST' | 'DEPLOY',
          }
        });
      }

      // Update status to COMPLETED
      await prisma.apiRequest.update({
        where: { id: apiRequest.id },
        data: { status: 'COMPLETED' }
      });

      // Return success response
      return NextResponse.json({
        success: true,
        projectId: project.id,
        apiRequestId: apiRequest.id,
        message: `Successfully generated ${config.database} + ${config.orm} backend project`,
        stats: {
          filesGenerated: Object.keys(generatedProject.files).length,
          setupCommands: setupCommands.length,
          dependencies: generatedProject.dependencies.main.length + generatedProject.dependencies.dev.length,
        },
        files: generatedProject.files,
        setupCommands: generatedProject.setupCommands,
        dependencies: generatedProject.dependencies,
        environmentVariables: generatedProject.environmentVariables,
      });

    } catch (error) {
      // Update status to FAILED
      await prisma.apiRequest.update({
        where: { id: apiRequest.id },
        data: { status: 'FAILED' }
      });
      
      throw error;
    }

  } catch (error) {
    console.error('❌ Error in generate API:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to generate project',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve a specific project
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

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

    return NextResponse.json({
      success: true,
      project,
    });

  } catch (error) {
    console.error('❌ Error retrieving project:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to retrieve project',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// DELETE endpoint to delete a project
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing projectId parameter' },
        { status: 400 }
      );
    }

    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const project = await prisma.project.findFirst({
      where: {
        id: projectId,
        user: { clerkId: userId }
      }
    });

    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    // Delete project (cascade will handle related records)
    await prisma.project.delete({
      where: { id: projectId }
    });

    return NextResponse.json({
      success: true,
      message: 'Project deleted successfully',
    });

  } catch (error) {
    console.error('❌ Error deleting project:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to delete project',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}