import { Metadata } from "next";

const DESCRIPTION = 'Generate complete backend APIs instantly with AI. Choose Express.js, PostgreSQL, MongoDB, Prisma, or Drizzle. Get production-ready code, database schemas, and setup scripts in minutes.';

const BASE_URL = "https://innpae.com/";


export const siteConfig: Metadata = {
    title: {
        default: 'Innpae - AI Backend Generator | From Idea to API in Minutes',
        template: '%s | Innpae - AI Backend Generator'
    },
    description: DESCRIPTION,
    icons: {
        icon: "/favicon.ico",
    },
    applicationName: "Innpae",
    openGraph: {
        type: 'website',
        locale: 'en_US',
        url: 'https://innpae.com',
        siteName: 'Innpae',
        title: 'Innpae - AI Backend Generator | From Idea to API in Minutes',
        description: 'Generate complete backend APIs instantly with AI. Choose Express.js, PostgreSQL, MongoDB, Prisma, or Drizzle. Get production-ready TypeScript code, database schemas, and setup scripts in minutes.',
        images: [
            {
                url: '/og.jpg',
                width: 1200,
                height: 630,
                alt: 'Innpae - AI Backend Generator Dashboard',
                type: 'image/jpg',
            },
            {
                url: '/og.jpg',
                width: 1200,
                height: 1200,
                alt: 'Innpae Logo - AI Backend Generator',
                type: 'image/jpg',
            }
        ],
    },
    authors: [{ name: 'Kunal Garg' }],
    creator: 'Kunal Garg',
    publisher: 'Kunal Garg',
    category: 'Developer Tools',
    classification: 'Technology',
    twitter: {
        card: 'summary_large_image',
        site: '@macdev_0',
        creator: '@macdev_0',
        title: 'Innpae - AI Backend Generator | From Idea to API in Minutes',
        description: 'Generate complete backend APIs instantly with AI. Express.js, PostgreSQL, MongoDB, Prisma, Drizzle support. Production-ready code in minutes.',
        images: ['/og.jpg'],
    },
    keywords: [
        'AI backend generator',
        'API generator',
        'Express.js generator',
        'Prisma generator',
        'Drizzle ORM generator',
        'PostgreSQL API',
        'MongoDB API',
        'TypeScript backend',
        'REST API generator',
        'Node.js API builder',
        'database schema generator',
        'backend code generator',
        'AI code generator',
        'full-stack development',
        'rapid prototyping',
        'API development tool',
        'backend as a service',
        'microservices generator',
        'serverless backend',
        'developer tools'
    ],

    robots: {
        index: true,
        follow: true,
        googleBot: {
            index: true,
            follow: true,
            'max-video-preview': -1,
            'max-image-preview': 'large',
            'max-snippet': -1,
        },
    },

    alternates: {
        canonical: 'https://innpae.com',
        languages: {
            'en-US': 'https://innpae.com',
            'en': 'https://innpae.com/en',
        }
    },

    referrer: 'origin-when-cross-origin',
    colorScheme: 'light dark',
    metadataBase: new URL(BASE_URL),
};