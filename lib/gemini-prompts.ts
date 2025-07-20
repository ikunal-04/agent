
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

const BASE_SYSTEM_PROMPT = `You are a senior full-stack developer with expertise in building production-ready backend APIs. 
  
  CRITICAL INSTRUCTIONS:
  1. Generate a complete, working backend project structure
  2. All code must be production-ready with proper error handling
  3. Include TypeScript throughout the entire project
  4. Use modern ES6+ syntax and best practices
  5. Include comprehensive setup instructions
  6. Respond ONLY with valid JSON in the specified format
  
  Response Format:
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
  }`;

// 1. Express.js + PostgreSQL + Prisma
export const getExpressPostgresPrismaPrompt = (config: ProjectConfig): string => {
  return `${BASE_SYSTEM_PROMPT}
  
  PROJECT SPECIFICATION:
  - Framework: Express.js with TypeScript
  - Database: PostgreSQL
  - ORM: Prisma
  - Project: "${config.name}" - ${config.description}
  
  SPECIFIC REQUIREMENTS:
  1. Create a complete Express.js server with TypeScript
  2. Set up Prisma with PostgreSQL database
  3. Generate database models based on the project description
  4. Create RESTful API endpoints with full CRUD operations
  5. Include proper middleware (cors, helmet, morgan)
  6. Add input validation using Zod
  7. Implement proper error handling middleware
  8. Include database connection and Prisma client setup
  ${config.features.auth ? '9. Add JWT authentication middleware' : ''}
  ${config.features.swagger ? '10. Include Swagger/OpenAPI documentation' : ''}
  
  REQUIRED FILES TO GENERATE:
  - package.json (with all necessary dependencies)
  - src/app.ts (main Express server)
  - src/routes/index.ts (main router)
  - src/routes/[entity].ts (CRUD routes for each model)
  - src/middleware/auth.ts (if auth enabled)
  - src/middleware/errorHandler.ts
  - src/middleware/validation.ts
  - src/lib/db.ts (Prisma client setup)
  - src/types/index.ts
  - prisma/schema.prisma (complete database schema)
  - .env.example (environment variables template)
  - .gitignore
  - README.md (setup and API documentation)
  - tsconfig.json
  
  PRISMA SPECIFIC:
  - Use PostgreSQL provider
  - Include proper relationships between models
  - Add created_at and updated_at fields
  - Use proper field types (String, Int, DateTime, Boolean)
  - Include @@map for table names if needed
  
  API STRUCTURE:
  - GET /api/health (health check)
  - RESTful endpoints for each model:
    - GET /api/[model]s (list all)
    - GET /api/[model]s/:id (get one)
    - POST /api/[model]s (create)
    - PUT /api/[model]s/:id (update)
    - DELETE /api/[model]s/:id (delete)
  
  Generate based on: "${config.description}"`;
};

// 2. Express.js + PostgreSQL + Drizzle
export const getExpressPostgresDrizzlePrompt = (config: ProjectConfig): string => {
  return `${BASE_SYSTEM_PROMPT}
  
  PROJECT SPECIFICATION:
  - Framework: Express.js with TypeScript
  - Database: PostgreSQL
  - ORM: Drizzle ORM
  - Project: "${config.name}" - ${config.description}
  
  SPECIFIC REQUIREMENTS:
  1. Create a complete Express.js server with TypeScript
  2. Set up Drizzle ORM with PostgreSQL database
  3. Generate database schemas using Drizzle syntax
  4. Create RESTful API endpoints with full CRUD operations
  5. Include proper middleware (cors, helmet, morgan)
  6. Add input validation using Zod
  7. Implement proper error handling middleware
  8. Include database connection and Drizzle client setup
  ${config.features.auth ? '9. Add JWT authentication middleware' : ''}
  ${config.features.swagger ? '10. Include Swagger/OpenAPI documentation' : ''}
  
  REQUIRED FILES TO GENERATE:
  - package.json (with Drizzle ORM dependencies)
  - src/app.ts (main Express server)
  - src/routes/index.ts (main router)
  - src/routes/[entity].ts (CRUD routes for each model)
  - src/middleware/auth.ts (if auth enabled)
  - src/middleware/errorHandler.ts
  - src/middleware/validation.ts
  - src/db/schema.ts (Drizzle schema definitions)
  - src/db/connection.ts (database connection)
  - src/db/migrate.ts (migration runner)
  - src/types/index.ts
  - drizzle.config.ts (Drizzle configuration)
  - .env.example (environment variables template)
  - .gitignore
  - README.md (setup and API documentation)
  - tsconfig.json
  
  DRIZZLE SPECIFIC:
  - Use pgTable for table definitions
  - Import proper column types (serial, text, timestamp, boolean, integer)
  - Define relationships using relations()
  - Use proper indexing where needed
  - Include timestamps (createdAt, updatedAt)
  - Use camelCase for field names
  
  EXAMPLE DRIZZLE SYNTAX:
  \`\`\`typescript
  import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';
  
  export const users = pgTable('users', {
    id: serial('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow(),
  });
  \`\`\`
  
  API STRUCTURE:
  - GET /api/health (health check)
  - RESTful endpoints for each model with Drizzle queries
  
  Generate based on: "${config.description}"`;
};

// 3. Express.js + MongoDB + Prisma
export const getExpressMongoPrismaPrompt = (config: ProjectConfig): string => {
  return `${BASE_SYSTEM_PROMPT}
  
  PROJECT SPECIFICATION:
  - Framework: Express.js with TypeScript
  - Database: MongoDB
  - ORM: Prisma
  - Project: "${config.name}" - ${config.description}
  
  SPECIFIC REQUIREMENTS:
  1. Create a complete Express.js server with TypeScript
  2. Set up Prisma with MongoDB database
  3. Generate database models using Prisma schema for MongoDB
  4. Create RESTful API endpoints with full CRUD operations
  5. Include proper middleware (cors, helmet, morgan)
  6. Add input validation using Zod
  7. Implement proper error handling middleware
  8. Include database connection and Prisma client setup
  ${config.features.auth ? '9. Add JWT authentication middleware' : ''}
  ${config.features.swagger ? '10. Include Swagger/OpenAPI documentation' : ''}
  
  REQUIRED FILES TO GENERATE:
  - package.json (with Prisma MongoDB dependencies)
  - src/app.ts (main Express server)
  - src/routes/index.ts (main router)
  - src/routes/[entity].ts (CRUD routes for each model)
  - src/middleware/auth.ts (if auth enabled)
  - src/middleware/errorHandler.ts
  - src/middleware/validation.ts
  - src/lib/db.ts (Prisma client setup)
  - src/types/index.ts
  - prisma/schema.prisma (MongoDB schema)
  - .env.example (environment variables template)
  - .gitignore
  - README.md (setup and API documentation)
  - tsconfig.json
  
  PRISMA MONGODB SPECIFIC:
  - Use "mongodb" provider
  - Use @id @default(auto()) @map("_id") @db.ObjectId for IDs
  - Use String @db.ObjectId for references
  - Include proper relationships with @relation
  - Use @map for field mapping if needed
  - Include createdAt and updatedAt fields
  
  EXAMPLE PRISMA MONGODB SYNTAX:
  \`\`\`prisma
  model User {
    id        String   @id @default(auto()) @map("_id") @db.ObjectId
    email     String   @unique
    name      String
    posts     Post[]
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  
  model Post {
    id       String @id @default(auto()) @map("_id") @db.ObjectId
    title    String
    content  String
    userId   String @db.ObjectId
    user     User   @relation(fields: [userId], references: [id])
    createdAt DateTime @default(now())
    updatedAt DateTime @updatedAt
  }
  \`\`\`
  
  API STRUCTURE:
  - GET /api/health (health check)
  - RESTful endpoints for each model with Prisma MongoDB queries
  
  Generate based on: "${config.description}"`;
};

// 4. Express.js + MongoDB + Drizzle
export const getExpressMongoDrizzlePrompt = (config: ProjectConfig): string => {
  return `${BASE_SYSTEM_PROMPT}
  
  PROJECT SPECIFICATION:
  - Framework: Express.js with TypeScript
  - Database: MongoDB
  - ORM: Drizzle ORM (MongoDB)
  - Project: "${config.name}" - ${config.description}
  
  SPECIFIC REQUIREMENTS:
  1. Create a complete Express.js server with TypeScript
  2. Set up Drizzle ORM with MongoDB database
  3. Generate database schemas using Drizzle MongoDB syntax
  4. Create RESTful API endpoints with full CRUD operations
  5. Include proper middleware (cors, helmet, morgan)
  6. Add input validation using Zod
  7. Implement proper error handling middleware
  8. Include database connection and Drizzle MongoDB client setup
  ${config.features.auth ? '9. Add JWT authentication middleware' : ''}
  ${config.features.swagger ? '10. Include Swagger/OpenAPI documentation' : ''}
  
  REQUIRED FILES TO GENERATE:
  - package.json (with Drizzle MongoDB dependencies)
  - src/app.ts (main Express server)
  - src/routes/index.ts (main router)
  - src/routes/[entity].ts (CRUD routes for each model)
  - src/middleware/auth.ts (if auth enabled)
  - src/middleware/errorHandler.ts
  - src/middleware/validation.ts
  - src/db/schema.ts (Drizzle MongoDB schema)
  - src/db/connection.ts (MongoDB connection)
  - src/types/index.ts
  - .env.example (environment variables template)
  - .gitignore
  - README.md (setup and API documentation)
  - tsconfig.json
  
  DRIZZLE MONGODB SPECIFIC:
  - Use MongoDB connection with drizzle-orm/mongodb
  - Define collections using proper MongoDB field types
  - Use ObjectId for document IDs
  - Include relationships and references
  - Use camelCase for field names
  - Include timestamps (createdAt, updatedAt)
  
  EXAMPLE DRIZZLE MONGODB SYNTAX:
  \`\`\`typescript
  import { MongoClient } from 'mongodb';
  import { drizzle } from 'drizzle-orm/mongodb';
  import { ObjectId } from 'mongodb';
  
  const client = new MongoClient(process.env.DATABASE_URL!);
  const db = drizzle(client.db('database-name'));
  
  // Schema definition
  export const users = {
    _id: ObjectId,
    name: String,
    email: String,
    createdAt: Date,
    updatedAt: Date,
  };
  \`\`\`
  
  API STRUCTURE:
  - GET /api/health (health check)
  - RESTful endpoints for each model with MongoDB queries
  
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
