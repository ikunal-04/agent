import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';

export async function GET() {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const projects = await prisma.project.findMany({
      where: {
        user: { clerkId: userId }
      },
      include: {
        apiRequests: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            status: true,
            createdAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    const transformedProjects = projects.map(project => ({
      id: project.id,
      name: project.name,
      description: project.description,
      createdAt: project.createdAt.toISOString(),
      status: project.apiRequests[0]?.status || 'PENDING'
    }));

    return NextResponse.json({
      projects: transformedProjects
    });

  } catch (error) {
    console.error('❌ Error fetching projects:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to fetch projects',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
