
export interface ProjectConfig {
  name: string;
  description: string;
  database: 'postgresql' | 'mongodb';
  orm: 'prisma' | 'drizzle';
  features: {
    auth?: boolean;
    validation?: boolean;
    cors?: boolean;
    swagger?: boolean;
  };
}

export interface GeneratedResponse {
  files: Record<string, string>;
  setupCommands: string[];
  dependencies: {
    main: string[];
    dev: string[];
  };
  environmentVariables: Record<string, string>;
}

const BASE_SYSTEM_PROMPT = `You are a senior backend developer. Generate a complete, working Express.js + TypeScript backend API.

CRITICAL: Respond ONLY with valid JSON in this exact format:
{
  "files": {
    "filename": "file_content"
  },
  "setupCommands": ["command1", "command2"],
  "dependencies": {
    "main": ["express", "cors"],
    "dev": ["@types/node", "typescript"]
  },
  "environmentVariables": {
    "DATABASE_URL": "example_value",
    "PORT": "3000"
  }
}

Focus on ESSENTIAL files only. Keep code concise but production-ready.`;

// 1. Express.js + PostgreSQL + Prisma
export const getExpressPostgresPrismaPrompt = (config: ProjectConfig): string => {
  return `${BASE_SYSTEM_PROMPT}

PROJECT: "${config.name}" - ${config.description}
TECH: Express.js + TypeScript + PostgreSQL + Prisma

GENERATE THESE ESSENTIAL FILES:
- package.json (dependencies only)
- src/app.ts (main server)
- src/routes/index.ts (main router)
- src/lib/db.ts (Prisma client)
- prisma/schema.prisma (database schema)
- .env.example (env vars)

API ENDPOINTS: /api/health, /api/[model]s (CRUD)
INCLUDE: Error handling, validation, CORS
${config.features.auth ? 'ADD: JWT authentication' : ''}

Generate based on: "${config.description}"`;
};

// 2. Express.js + PostgreSQL + Drizzle
export const getExpressPostgresDrizzlePrompt = (config: ProjectConfig): string => {
  return `${BASE_SYSTEM_PROMPT}

PROJECT: "${config.name}" - ${config.description}
TECH: Express.js + TypeScript + PostgreSQL + Drizzle

GENERATE THESE ESSENTIAL FILES:
- package.json (dependencies only)
- src/app.ts (main server)
- src/routes/index.ts (main router)
- src/db/schema.ts (Drizzle schema)
- src/db/connection.ts (database connection)
- .env.example (env vars)

API ENDPOINTS: /api/health, /api/[model]s (CRUD)
INCLUDE: Error handling, validation, CORS
${config.features.auth ? 'ADD: JWT authentication' : ''}

Generate based on: "${config.description}"`;
};

// 3. Express.js + MongoDB + Prisma
export const getExpressMongoPrismaPrompt = (config: ProjectConfig): string => {
  return `${BASE_SYSTEM_PROMPT}

PROJECT: "${config.name}" - ${config.description}
TECH: Express.js + TypeScript + MongoDB + Prisma

GENERATE THESE ESSENTIAL FILES:
- package.json (dependencies only)
- src/app.ts (main server)
- src/routes/index.ts (main router)
- src/lib/db.ts (Prisma client)
- prisma/schema.prisma (MongoDB schema)
- .env.example (env vars)

API ENDPOINTS: /api/health, /api/[model]s (CRUD)
INCLUDE: Error handling, validation, CORS
${config.features.auth ? 'ADD: JWT authentication' : ''}

MongoDB Prisma: Use @db.ObjectId for IDs, String @db.ObjectId for refs

Generate based on: "${config.description}"`;
};

// 4. Express.js + MongoDB + Drizzle
export const getExpressMongoDrizzlePrompt = (config: ProjectConfig): string => {
  return `${BASE_SYSTEM_PROMPT}

PROJECT: "${config.name}" - ${config.description}
TECH: Express.js + TypeScript + MongoDB + Drizzle

GENERATE THESE ESSENTIAL FILES:
- package.json (dependencies only)
- src/app.ts (main server)
- src/routes/index.ts (main router)
- src/db/schema.ts (MongoDB schema)
- src/db/connection.ts (MongoDB connection)
- .env.example (env vars)

API ENDPOINTS: /api/health, /api/[model]s (CRUD)
INCLUDE: Error handling, validation, CORS
${config.features.auth ? 'ADD: JWT authentication' : ''}

Generate based on: "${config.description}"`;
};

// Main function to get the appropriate prompt
export const getPromptForTechStack = (config: ProjectConfig): string => {
  const { database, orm } = config;

  if (database === 'postgresql' && orm === 'prisma') {
    return getExpressPostgresPrismaPrompt(config);
  }

  if (database === 'postgresql' && orm === 'drizzle') {
    return getExpressPostgresDrizzlePrompt(config);
  }

  if (database === 'mongodb' && orm === 'prisma') {
    return getExpressMongoPrismaPrompt(config);
  }

  if (database === 'mongodb' && orm === 'drizzle') {
    return getExpressMongoDrizzlePrompt(config);
  }

  throw new Error(`Unsupported tech stack combination: ${database} + ${orm}`);
};

// Example usage in your API route
// export const generateProject = async (config: ProjectConfig): Promise<GeneratedResponse> => {
//   const prompt = getPromptForTechStack(config);

//   // Your Gemini API call here
//   const response = await callGeminiAPI(prompt);

//   // Parse and return the structured response
//   return JSON.parse(response);
// };

// // Helper function for Gemini API call (implement this)
// // eslint-disable-next-line @typescript-eslint/no-unused-vars
// const callGeminiAPI = async (prompt: string): Promise<string> => {
//   // Implementation depends on your Gemini setup
//   // This would be your actual API call to Gemini
//   throw new Error('Implement Gemini API call');
// };
