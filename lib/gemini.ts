import { GoogleGenAI } from '@google/genai';
import { ProjectConfig, GeneratedResponse } from './gemini-prompts';

const groundingTool = {
    googleSearch: {},
    codeExecution: {}
};
export class GeminiCodeGenerator {
    private client;

    constructor() {
        this.client = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY!});
    }

    async generateBackendProject(config: ProjectConfig): Promise<GeneratedResponse> {
        try {
            console.log(`🤖 Generating project with Gemini: ${config.name}`);

            const prompt = await this.getPromptForTechStack(config);
            
            const result = await this.client.models.generateContent({
                model: 'gemini-2.5-pro',
                contents: prompt,
                config: {
                    tools: [groundingTool]
                },
            });
            
            const text = result.text || '';
            console.log(`📝 Raw Gemini response length: ${text.length} characters`);

            // Try to parse the JSON response
            let parsedResponse: GeneratedResponse;

            try {
                const cleanedText = this.cleanJsonResponse(text);
                parsedResponse = JSON.parse(cleanedText);
            } catch (parseError) {
                console.error('❌ Failed to parse Gemini response:', parseError);
                console.log('Raw response:', text);
                
                // FALLBACK: Create a working project from partial response or defaults
                console.log('🔄 Using fallback mechanism to create working project...');
                parsedResponse = this.createFallbackProject(config, text);
            }

            // Validate and enhance the response
            parsedResponse = this.validateAndEnhanceResponse(parsedResponse, config);

            console.log(`✅ Successfully generated project with ${Object.keys(parsedResponse.files).length} files`);

            return parsedResponse;

        } catch (error) {
            console.error('❌ Error generating project:', error);
            
            // FINAL FALLBACK: Create a basic working project
            console.log('🆘 Creating emergency fallback project...');
            return this.createEmergencyFallbackProject(config);
        }
    }

    private createFallbackProject(config: ProjectConfig, partialResponse: string): GeneratedResponse {
        // Try to extract any useful information from the partial response
        const extractedData = this.extractPartialData(partialResponse);
        
        return {
            files: {
                ...extractedData.files,
                ...this.getEssentialFiles(config)
            },
            setupCommands: (extractedData.setupCommands?.length || 0) > 0 
                ? extractedData.setupCommands! 
                : this.getDefaultSetupCommands(config),
            dependencies: (extractedData.dependencies?.main.length || 0) > 0 
                ? extractedData.dependencies! 
                : this.getDefaultDependencies(config),
            environmentVariables: {
                ...extractedData.environmentVariables,
                ...this.getDefaultEnvironmentVariables(config)
            }
        };
    }

    private createEmergencyFallbackProject(config: ProjectConfig): GeneratedResponse {
        console.log('🚨 Creating emergency fallback project for:', config.name);
        
        return {
            files: this.getEssentialFiles(config),
            setupCommands: this.getDefaultSetupCommands(config),
            dependencies: this.getDefaultDependencies(config),
            environmentVariables: this.getDefaultEnvironmentVariables(config)
        };
    }

    private extractPartialData(text: string): Partial<GeneratedResponse> {
        const extracted: Partial<GeneratedResponse> = {
            files: {},
            setupCommands: [],
            dependencies: { main: [], dev: [] },
            environmentVariables: {}
        };

        try {
            // Try to find JSON-like structures in the text
            const jsonMatches = text.match(/\{[^{}]*"[^"]*"[^{}]*\}/g);
            if (jsonMatches) {
                for (const match of jsonMatches) {
                    try {
                        const parsed = JSON.parse(match);
                        if (parsed.files) {
                            // Ensure all file content is strings
                            for (const [filename, content] of Object.entries(parsed.files)) {
                                extracted.files![filename] = typeof content === 'string' 
                                    ? content 
                                    : JSON.stringify(content, null, 2);
                            }
                        }
                        if (parsed.setupCommands) extracted.setupCommands!.push(...parsed.setupCommands);
                        if (parsed.dependencies) {
                            if (parsed.dependencies.main) extracted.dependencies!.main.push(...parsed.dependencies.main);
                            if (parsed.dependencies.dev) extracted.dependencies!.dev.push(...parsed.dependencies.dev);
                        }
                        if (parsed.environmentVariables) Object.assign(extracted.environmentVariables!, parsed.environmentVariables);
                    } catch (e) {
                        // Continue with next match
                    }
                }
            }
        } catch (e) {
            console.log('Could not extract partial data from response');
        }

        return extracted;
    }

    private getEssentialFiles(config: ProjectConfig): Record<string, string> {
        const { database, orm } = config;
        
        const files: Record<string, string> = {
            'package.json': this.getPackageJson(config),
            'src/app.ts': this.getMainAppFile(config),
            'src/routes/index.ts': this.getRoutesFile(config),
            '.env.example': this.getDefaultEnvExample(config),
            '.gitignore': this.getDefaultGitignore(),
            'tsconfig.json': this.getDefaultTsConfig(),
            'README.md': this.getDefaultReadme(config)
        };

        // Add database-specific files
        if (orm === 'prisma') {
            files['prisma/schema.prisma'] = this.getPrismaSchema(config);
            files['src/lib/db.ts'] = this.getPrismaClient(config);
        } else if (orm === 'drizzle') {
            files['src/db/schema.ts'] = this.getDrizzleSchema(config);
            files['src/db/connection.ts'] = this.getDrizzleConnection(config);
        }

        return files;
    }

    private getPackageJson(config: ProjectConfig): string {
        const { database, orm } = config;
        
        const mainDeps = ['express', 'cors', 'helmet', 'morgan', 'zod'];
        const devDeps = ['@types/node', '@types/express', '@types/cors', 'typescript', 'ts-node', 'nodemon'];

        if (orm === 'prisma') {
            mainDeps.push('@prisma/client');
            devDeps.push('prisma');
        } else if (orm === 'drizzle') {
            if (database === 'postgresql') {
                mainDeps.push('drizzle-orm', 'pg');
                devDeps.push('@types/pg', 'drizzle-kit');
            } else {
                mainDeps.push('drizzle-orm', 'mongodb');
                devDeps.push('@types/mongodb');
            }
        }

        return JSON.stringify({
            name: config.name.toLowerCase().replace(/\s+/g, '-'),
            version: '1.0.0',
            description: config.description,
            main: 'dist/app.js',
            scripts: {
                dev: 'nodemon src/app.ts',
                build: 'tsc',
                start: 'node dist/app.js'
            },
            dependencies: Object.fromEntries(mainDeps.map(dep => [dep, 'latest'])),
            devDependencies: Object.fromEntries(devDeps.map(dep => [dep, 'latest']))
        }, null, 2);
    }

    private getMainAppFile(config: ProjectConfig): string {
        return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { ${config.orm === 'prisma' ? 'prisma' : 'db'} } from './${config.orm === 'prisma' ? 'lib/db' : 'db/connection'}';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(helmet());
app.use(morgan('combined'));
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api', require('./routes/index'));

// Error handling
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(\`🚀 Server running on port \${PORT}\`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully');
  ${config.orm === 'prisma' ? 'await prisma.$disconnect();' : ''}
  process.exit(0);
});`;
    }

    private getRoutesFile(config: ProjectConfig): string {
        return `import express from 'express';
import { z } from 'zod';

const router = express.Router();

// Example CRUD endpoints for User model
const userSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
});

// GET /api/users
router.get('/users', async (req, res) => {
  try {
    // TODO: Implement with your ORM
    res.json({ message: 'Get all users', data: [] });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// GET /api/users/:id
router.get('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Implement with your ORM
    res.json({ message: 'Get user by ID', id, data: null });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/users
router.post('/users', async (req, res) => {
  try {
    const validatedData = userSchema.parse(req.body);
    // TODO: Implement with your ORM
    res.status(201).json({ message: 'User created', data: validatedData });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to create user' });
    }
  }
});

// PUT /api/users/:id
router.put('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const validatedData = userSchema.parse(req.body);
    // TODO: Implement with your ORM
    res.json({ message: 'User updated', id, data: validatedData });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
    } else {
      res.status(500).json({ error: 'Failed to update user' });
    }
  }
});

// DELETE /api/users/:id
router.delete('/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Implement with your ORM
    res.json({ message: 'User deleted', id });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;`;
    }

    private getPrismaSchema(config: ProjectConfig): string {
        const provider = config.database === 'postgresql' ? 'postgresql' : 'mongodb';
        const idType = config.database === 'postgresql' ? 'Int @id @default(autoincrement())' : 'String @id @default(auto()) @map("_id") @db.ObjectId';
        
        return `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

model User {
  id        ${idType}
  email     String   @unique
  name      String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Post {
  id        ${idType}
  title     String
  content   String
  published Boolean  @default(false)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}`;
    }

    private getPrismaClient(config: ProjectConfig): string {
        return `import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export { prisma };`;
    }

    private getDrizzleSchema(config: ProjectConfig): string {
        if (config.database === 'postgresql') {
            return `import { pgTable, serial, text, timestamp, boolean } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const posts = pgTable('posts', {
  id: serial('id').primaryKey(),
  title: text('title').notNull(),
  content: text('content').notNull(),
  published: boolean('published').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});`;
        } else {
            return `import { ObjectId } from 'mongodb';

export const users = {
  _id: ObjectId,
  email: String,
  name: String,
  createdAt: Date,
  updatedAt: Date,
};

export const posts = {
  _id: ObjectId,
  title: String,
  content: String,
  published: Boolean,
  createdAt: Date,
  updatedAt: Date,
};`;
        }
    }

    private getDrizzleConnection(config: ProjectConfig): string {
        if (config.database === 'postgresql') {
            return `import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export const db = drizzle(pool);`;
        } else {
            return `import { MongoClient } from 'mongodb';
import { drizzle } from 'drizzle-orm/mongodb';

const client = new MongoClient(process.env.DATABASE_URL!);
const db = drizzle(client.db('${config.name.toLowerCase().replace(/\s+/g, '_')}'));`;
        }
    }

    private getDefaultSetupCommands(config: ProjectConfig): string[] {
        const commands = [
            'npm install',
            'cp .env.example .env'
        ];

        if (config.orm === 'prisma') {
            commands.push('npx prisma generate');
            commands.push('npx prisma db push');
        }

        commands.push('npm run dev');
        return commands;
    }

    private getDefaultDependencies(config: ProjectConfig): { main: string[]; dev: string[] } {
        const main = ['express', 'cors', 'helmet', 'morgan', 'zod'];
        const dev = ['@types/node', '@types/express', '@types/cors', 'typescript', 'ts-node', 'nodemon'];

        if (config.orm === 'prisma') {
            main.push('@prisma/client');
            dev.push('prisma');
        } else if (config.orm === 'drizzle') {
            if (config.database === 'postgresql') {
                main.push('drizzle-orm', 'pg');
                dev.push('@types/pg', 'drizzle-kit');
            } else {
                main.push('drizzle-orm', 'mongodb');
                dev.push('@types/mongodb');
            }
        }

        return { main, dev };
    }

    private getDefaultEnvironmentVariables(config: ProjectConfig): Record<string, string> {
        const envVars: Record<string, string> = {
            PORT: '3000',
            NODE_ENV: 'development'
        };

        if (config.database === 'postgresql') {
            envVars.DATABASE_URL = 'postgresql://username:password@localhost:5432/database_name';
        } else {
            envVars.DATABASE_URL = 'mongodb://localhost:27017/database_name';
        }

        return envVars;
    }

    private getDefaultReadme(config: ProjectConfig): string {
        return `# ${config.name}

${config.description}

## Tech Stack
- Express.js with TypeScript
- ${config.database === 'postgresql' ? 'PostgreSQL' : 'MongoDB'} database
- ${config.orm === 'prisma' ? 'Prisma' : 'Drizzle'} ORM

## Setup
1. Install dependencies: \`npm install\`
2. Copy environment file: \`cp .env.example .env\`
3. Update database URL in \`.env\`
4. ${config.orm === 'prisma' ? 'Generate Prisma client: `npx prisma generate`' : ''}
5. Start development server: \`npm run dev\`

## API Endpoints
- GET /api/health - Health check
- Additional endpoints based on your models

## Environment Variables
- PORT - Server port (default: 3000)
- DATABASE_URL - Database connection string
- NODE_ENV - Environment (development/production)`;
    }

    private validateAndEnhanceResponse(response: GeneratedResponse, config: ProjectConfig): GeneratedResponse {
        // Ensure all required fields exist
        if (!response.files) response.files = {};
        if (!response.setupCommands) response.setupCommands = [];
        if (!response.dependencies) response.dependencies = { main: [], dev: [] };
        if (!response.environmentVariables) response.environmentVariables = {};

        // Add missing essential files
        const essentialFiles = this.getEssentialFiles(config);
        response.files = { ...essentialFiles, ...response.files };

        // Ensure basic setup commands
        if (response.setupCommands.length === 0) {
            response.setupCommands = this.getDefaultSetupCommands(config);
        }

        // Ensure basic dependencies
        if (response.dependencies.main.length === 0 && response.dependencies.dev.length === 0) {
            response.dependencies = this.getDefaultDependencies(config);
        }

        // Ensure environment variables
        if (Object.keys(response.environmentVariables).length === 0) {
            response.environmentVariables = this.getDefaultEnvironmentVariables(config);
        }

        return response;
    }

    private cleanJsonResponse(text: string): string {
        // Remove markdown code blocks if present
        let cleaned = text.replace(/```json\n/g, '').replace(/```\n/g, '').replace(/```/g, '');

        // Remove any text before the first {
        const firstBrace = cleaned.indexOf('{');
        if (firstBrace > 0) {
            cleaned = cleaned.substring(firstBrace);
        }

        // Remove any text after the last }
        const lastBrace = cleaned.lastIndexOf('}');
        if (lastBrace < cleaned.length - 1) {
            cleaned = cleaned.substring(0, lastBrace + 1);
        }

        return cleaned.trim();
    }

    private async getPromptForTechStack(config: ProjectConfig): Promise<string> {
        const { getPromptForTechStack } = await import('./gemini-prompts');
        return getPromptForTechStack(config);
    }

    private getDefaultGitignore(): string {
        return `node_modules/
dist/
.env
.env.local
.env.production
*.log
.DS_Store
.vscode/
.idea/`;
    }

    private getDefaultTsConfig(): string {
        return `{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}`;
    }

    private getDefaultEnvExample(config: ProjectConfig): string {
        const envVars = this.getDefaultEnvironmentVariables(config);
        return Object.entries(envVars)
            .map(([key, value]) => `${key}=${value}`)
            .join('\n');
    }
}

export const generateBackendProject = async (config: ProjectConfig): Promise<GeneratedResponse> => {
    const generator = new GeminiCodeGenerator();
    return await generator.generateBackendProject(config);
};
