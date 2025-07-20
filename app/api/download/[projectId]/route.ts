// app/api/download/[projectId]/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import JSZip from 'jszip';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectId: string }> }
) {
  try {
    const { projectId } = await params; 

    console.log(`📦 Download requested for project: ${projectId}`);

    // Get authenticated user
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get project with all related data
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

    // Get the latest API request (assuming the most recent one)
    const apiRequest = project.apiRequests[0];
    
    if (!apiRequest || apiRequest.status !== 'COMPLETED') {
      return NextResponse.json(
        { error: 'Project generation not completed' },
        { status: 400 }
      );
    }

    console.log(`📁 Creating ZIP with generated files...`);

    // Create ZIP file
    const zip = new JSZip();
    
    // Parse the generated files from the database
    let generatedFiles: Record<string, string> = {};
    
    if (apiRequest.generatedApis.length > 0) {
      try {
        // Try to parse the code from the first generated API
        const codeData = JSON.parse(apiRequest.generatedApis[0].code);
        if (typeof codeData === 'object') {
          generatedFiles = codeData;
        }
      } catch (error) {
        console.warn('Could not parse generated files from database');
      }
    }

    Object.entries(generatedFiles).forEach(([filepath, content]) => {
      try {
        if (content === null || content === undefined) {
          console.warn(`Skipping file ${filepath} - content is null or undefined`);
          return;
        }
        
        const stringContent = typeof content === 'string' 
          ? content 
          : JSON.stringify(content, null, 2);
        
        zip.file(filepath, stringContent);
      } catch (error) {
        console.error(`Error adding file ${filepath} to ZIP:`, error);
      }
    });

    // Add a setup script for easy project initialization
    const setupScript = generateSetupScript(project, apiRequest);
    zip.file('setup.sh', setupScript);
    zip.file('setup.bat', setupScript.replace(/\n/g, '\r\n')); // Windows version

    // Add project info file
    const projectInfo = {
      name: project.name,
      description: project.description,
      techStack: {
        framework: 'Express.js',
        database: apiRequest.databaseType?.toLowerCase(),
        orm: apiRequest.ormType?.toLowerCase(),
      },
      generatedAt: project.createdAt,
      setupCommands: apiRequest.setupCommands.map(cmd => ({
        command: cmd.command,
        description: cmd.description,
        category: cmd.category,
      })),
    };
    
    zip.file('project-info.json', JSON.stringify(projectInfo, null, 2));

    // Generate ZIP buffer
    const zipBuffer = await zip.generateAsync({ 
      type: 'nodebuffer',
      compression: 'DEFLATE',
      compressionOptions: { level: 9 }
    });

    console.log(`✅ ZIP created successfully (${zipBuffer.length} bytes)`);

    // Return the ZIP file
    return new NextResponse(zipBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${project.name}-backend.zip"`,
        'Content-Length': zipBuffer.length.toString(),
      },
    });

  } catch (error) {
    console.error('❌ Error in download API:', error);
    
    return NextResponse.json(
      {
        error: 'Failed to download project',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

// Generate setup script based on tech stack
function generateSetupScript(project: { name: string }, apiRequest: { databaseType?: string | null; ormType?: string | null; setupCommands: Array<{ command: string; description: string }> }): string {
  const { name } = project;
  const { databaseType, ormType, setupCommands } = apiRequest;
  
  let script = `#!/bin/bash
# Setup script for ${name}
# Generated on ${new Date().toISOString()}

echo "🚀 Setting up ${name} (${databaseType?.toLowerCase()} + ${ormType?.toLowerCase()})..."
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install npm first."
    exit 1
fi

echo "📋 Node.js version: $(node --version)"
echo "📋 npm version: $(npm --version)"
echo ""

# Install dependencies
echo "📦 Installing dependencies..."
npm install

echo ""
echo "⚙️ Setting up environment variables..."

# Create .env file from template
if [ ! -f .env ]; then
    cp .env.example .env
    echo "✅ Created .env file from template"
    echo "⚠️  Please update the .env file with your actual values"
else
    echo "⚠️  .env file already exists, skipping creation"
fi

echo ""
`;

  // Add setup commands from database
  setupCommands.forEach((cmd: { command: string; description: string }) => {
    script += `echo "🔧 Running: ${cmd.description}"\n`;
    script += `${cmd.command}\n`;
    script += `echo ""\n`;
  });

  script += `
echo "✅ Setup completed successfully!"
echo ""
echo "🎉 Your ${name} backend is ready!"
echo "📖 Check the README.md file for API documentation"
echo "🚀 Run 'npm run dev' to start the development server"
`;

  return script;
}