import { useUser } from '@clerk/nextjs'
import { useEffect, useState } from 'react'

interface DatabaseUser {
  id: string
  clerkId: string
  email: string
  firstName: string
  lastName: string
  avatarUrl: string
}

export function useUserSync() {
  const { user, isLoaded } = useUser()
  const [dbUser, setDbUser] = useState<DatabaseUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isLoaded) return

    const syncUser = async () => {
      if (!user) {
        setDbUser(null)
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)
        
        console.log('Syncing user:', user.id)
        
        const response = await fetch('/api/user/sync', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            clerkId: user.id,
            email: user.emailAddresses[0]?.emailAddress,
            name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'User',
            image: user.imageUrl,
          }),
        })

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}))
          throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
        }

        const userData = await response.json()
        console.log('User synced successfully:', userData)
        setDbUser(userData)
        setError(null)
      } catch (err) {
        console.error('Error syncing user:', err)
        setError(err instanceof Error ? err.message : 'Failed to sync user data')
      } finally {
        setLoading(false)
      }
    }

    syncUser()
  }, [user, isLoaded])

  return { dbUser, loading, error, refetch: () => window.location.reload() }
}