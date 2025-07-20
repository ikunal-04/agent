import { GoogleGenAI } from '@google/genai';
import { ProjectConfig, GeneratedResponse, getPromptForTechStack } from './gemini-prompts';

const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

const modelConfig = {
    temperature: 0.1, // Lower temperature for more consistent code generation
    topK: 1,
    topP: 0.1,
    maxOutputTokens: 20000, // Adjust based on your needs
};

const groundingTool = {
    googleSearch: {},
    codeExecution: {}
};

export class GeminiCodeGenerator {
    private client;

    constructor() {
        this.client = genAI;
    }

    async generateBackendProject(config: ProjectConfig): Promise<GeneratedResponse> {
        try {
            console.log(`🤖 Generating ${config.database} + ${config.orm} project...`);

            const prompt = getPromptForTechStack(config);

            console.log('📝 Sending prompt to Gemini...');

            const result = await this.client.models.generateContentStream({
                model: 'gemini-2.5-flash',
                contents: [{ parts: [{ text: prompt }] }],
                config: {
                    tools: [groundingTool],
                    ...modelConfig,
                },
            });

            let text = '';
            for await (const chunk of result) {
                if (chunk.candidates?.[0]?.content?.parts?.[0]?.text) {
                    text += chunk.candidates[0].content.parts[0].text;
                }
            }

            console.log('✅ Received response from Gemini');

            // Parse the JSON response
            let parsedResponse: GeneratedResponse;

            try {
                
                const cleanedText = this.cleanJsonResponse(text);
                parsedResponse = JSON.parse(cleanedText);
            } catch (parseError) {
                console.error('❌ Failed to parse Gemini response:', parseError);
                console.log('Raw response:', text);
                throw new Error('Failed to parse AI response. Please try again.');
            }

            // Validate the response structure
            this.validateResponse(parsedResponse);

            // Post-process the response for better code quality
            parsedResponse = this.postProcessResponse(parsedResponse, config);

            console.log(`✅ Successfully generated project with ${Object.keys(parsedResponse.files).length} files`);

            return parsedResponse;

        } catch (error) {
            console.error('❌ Error generating project:', error);
            throw new Error(`Failed to generate project: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
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

    private validateResponse(response: GeneratedResponse): void {
        if (!response || typeof response !== 'object') {
            throw new Error('Invalid response format: not an object');
        }

        if (!response.files || typeof response.files !== 'object') {
            throw new Error('Invalid response format: missing files object');
        }

        if (!response.setupCommands || !Array.isArray(response.setupCommands)) {
            throw new Error('Invalid response format: missing setupCommands array');
        }

        if (!response.dependencies || typeof response.dependencies !== 'object') {
            throw new Error('Invalid response format: missing dependencies object');
        }

        if (!response.environmentVariables || typeof response.environmentVariables !== 'object') {
            throw new Error('Invalid response format: missing environmentVariables object');
        }

        // Validate essential files are present
        const requiredFiles = ['package.json', 'src/app.ts'];
        const missingFiles = requiredFiles.filter(file => !(file in response.files));

        if (missingFiles.length > 0) {
            throw new Error(`Missing required files: ${missingFiles.join(', ')}`);
        }
    }

    private postProcessResponse(response: GeneratedResponse, config: ProjectConfig): GeneratedResponse {
        // Add any missing standard files
        response.files = this.ensureStandardFiles(response.files, config);

        // Ensure proper file structure
        response.files = this.normalizeFilePaths(response.files);

        // Add health check endpoint if missing
        response.files = this.ensureHealthCheck(response.files);

        return response;
    }

    private ensureStandardFiles(files: Record<string, string>, config: ProjectConfig): Record<string, string> {
        // Ensure .gitignore exists
        if (!files['.gitignore']) {
            files['.gitignore'] = this.getDefaultGitignore();
        }

        // Ensure tsconfig.json exists
        if (!files['tsconfig.json']) {
            files['tsconfig.json'] = this.getDefaultTsConfig();
        }

        // Ensure .env.example exists
        if (!files['.env.example']) {
            files['.env.example'] = this.getDefaultEnvExample(config);
        }

        return files;
    }

    private normalizeFilePaths(files: Record<string, string>): Record<string, string> {
        const normalized: Record<string, string> = {};

        for (const [path, content] of Object.entries(files)) {
            // Normalize path separators
            const normalizedPath = path.replace(/\\/g, '/');
            normalized[normalizedPath] = content;
        }

        return normalized;
    }

    private ensureHealthCheck(files: Record<string, string>): Record<string, string> {
        // Check if health endpoint exists in app.ts or routes
        const appContent = files['src/app.ts'] || '';

        if (!appContent.includes('/health') && !appContent.includes('/api/health')) {
            // Add health check endpoint
            const healthCheck = `
// Health check
app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    message: 'API is running successfully!',
    timestamp: new Date().toISOString(),
    status: 'healthy'
  });
});`;

            // Insert before error handling middleware
            if (appContent.includes('app.use(errorHandler)')) {
                files['src/app.ts'] = appContent.replace(
                    'app.use(errorHandler)',
                    `${healthCheck}\n\napp.use(errorHandler)`
                );
            } else {
                // Add at the end before app.listen
                files['src/app.ts'] = appContent.replace(
                    'app.listen(',
                    `${healthCheck}\n\napp.listen(`
                );
            }
        }

        return files;
    }

    private getDefaultGitignore(): string {
        return `
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Runtime data
pids
*.pid
*.seed
*.pid.lock

# Coverage directory used by tools like istanbul
coverage/

# nyc test coverage
.nyc_output

# Environment variables
.env
.env.local
.env.production

# Build output
dist/
build/

# Database
*.sqlite
*.db

# Logs
logs
*.log

# macOS
.DS_Store

# Windows
Thumbs.db

# IDE
.vscode/
.idea/
*.swp
*.swo

# Prisma
prisma/migrations/dev.db*

# Drizzle
drizzle/
`.trim();
    }

    private getDefaultTsConfig(): string {
        return JSON.stringify({
            compilerOptions: {
                target: "ES2020",
                module: "commonjs",
                lib: ["ES2020"],
                outDir: "./dist",
                rootDir: "./src",
                strict: true,
                esModuleInterop: true,
                skipLibCheck: true,
                forceConsistentCasingInFileNames: true,
                resolveJsonModule: true,
                declaration: true,
                declarationMap: true,
                sourceMap: true
            },
            include: ["src/**/*"],
            exclude: ["node_modules", "dist"]
        }, null, 2);
    }

    private getDefaultEnvExample(config: ProjectConfig): string {
        const base = `
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Secret (generate a secure random string)
JWT_SECRET=your-super-secure-jwt-secret-key-here
`;

        if (config.database === 'postgresql') {
            return base + `
# PostgreSQL Database
DATABASE_URL="postgresql://username:password@localhost:5432/database_name"
`;
        } else {
            return base + `
# MongoDB Database
DATABASE_URL="mongodb://localhost:27017/database_name"
`;
        }
    }
}

export const geminiGenerator = new GeminiCodeGenerator();

export const generateBackendProject = async (config: ProjectConfig): Promise<GeneratedResponse> => {
    return await geminiGenerator.generateBackendProject(config);
};
