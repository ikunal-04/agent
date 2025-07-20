import { Webhook } from 'svix'
import { headers } from 'next/headers'
import { WebhookEvent } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function POST(req: Request) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = (await headerPayload).get("svix-id")
  const svix_timestamp = (await headerPayload).get("svix-timestamp")
  const svix_signature = (await headerPayload).get("svix-signature")

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let evt: WebhookEvent

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400
    })
  }

  // Handle the webhook
  const eventType = evt.type

  try {
    switch (eventType) {
      case 'user.created':
        await handleUserCreated(evt)
        break
      case 'user.updated':
        await handleUserUpdated(evt)
        break
      default:
        console.log(`Unhandled event type: ${eventType}`)
    }
  } catch (error) {
    console.error('Error processing webhook:', error)
    return new Response('Error processing webhook', { status: 500 })
  }

  return new Response('', { status: 200 })
}

async function handleUserCreated(evt: WebhookEvent) {
  if (evt.type !== 'user.created') return

  const { id, email_addresses, first_name, last_name, image_url } = evt.data

  // Get primary email
  const primaryEmail = email_addresses.find(email => email.id === evt.data.primary_email_address_id)
  
  if (!primaryEmail) {
    throw new Error('No primary email found')
  }

  // Upsert user in database (create if doesn't exist, update if exists)
  await prisma.user.upsert({
    where: { clerkId: id },
    update: {
      email: primaryEmail.email_address,
      firstName: first_name || null,
      lastName: last_name || null,
      avatarUrl: image_url || null,
    },
    create: {
      clerkId: id,
      email: primaryEmail.email_address,
      firstName: first_name || null,
      lastName: last_name || null,
      avatarUrl: image_url || null,
    }
  })

  console.log(`User created/updated: ${primaryEmail.email_address}`)
}

async function handleUserUpdated(evt: WebhookEvent) {
  if (evt.type !== 'user.updated') return

  const { id, email_addresses, first_name, last_name, image_url } = evt.data

  // Get primary email
  const primaryEmail = email_addresses.find(email => email.id === evt.data.primary_email_address_id)
  
  if (!primaryEmail) {
    throw new Error('No primary email found')
  }

  // Upsert user in database (create if doesn't exist, update if exists)
  await prisma.user.upsert({
    where: { clerkId: id },
    update: {
      email: primaryEmail.email_address,
      firstName: first_name || null,
      lastName: last_name || null,
      avatarUrl: image_url || null,
    },
    create: {
      clerkId: id,
      email: primaryEmail.email_address,
      firstName: first_name || null,
      lastName: last_name || null,
      avatarUrl: image_url || null,
    }
  })

  console.log(`User updated: ${primaryEmail.email_address}`)
}
