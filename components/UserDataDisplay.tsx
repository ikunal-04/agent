'use client'

import { useState, useEffect } from 'react'

interface UserData {
  message: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  user: any
  userId: string
}

export function UserDataDisplay() {
  const [userData, setUserData] = useState<UserData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true)
        setError(null)
        
        const response = await fetch('/api/getdata')
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        
        const data = await response.json()
        setUserData(data)
      } catch (err) {
        console.error('Error fetching user data:', err)
        setError(err instanceof Error ? err.message : 'Failed to fetch user data')
      } finally {
        setLoading(false)
      }
    }

    fetchUserData()
  }, [])

  if (loading) {
    return (
      <div className="p-4 border rounded-lg bg-gray-50 dark:bg-gray-800">
        <h3 className="font-semibold mb-2">API User Data</h3>
        <p className="text-sm text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50 dark:bg-red-900/20">
        <h3 className="font-semibold mb-2 text-red-800 dark:text-red-200">API User Data</h3>
        <p className="text-sm text-red-700 dark:text-red-300">Error: {error}</p>
      </div>
    )
  }

  return (
    <div className="p-4 border rounded-lg bg-blue-50 dark:bg-blue-900/20 max-w-2xl">
      <h3 className="font-semibold mb-2 text-blue-800 dark:text-blue-200">API User Data</h3>
      
      <div className="space-y-3 text-sm">
        <div>
          <span className="font-medium text-blue-700 dark:text-blue-300">Message:</span>
          <span className="ml-2 text-blue-600 dark:text-blue-400">{userData?.message}</span>
        </div>
        
        <div>
          <span className="font-medium text-blue-700 dark:text-blue-300">User ID:</span>
          <span className="ml-2 text-blue-600 dark:text-blue-400">{userData?.userId}</span>
        </div>
        
        <div>
          <span className="font-medium text-blue-700 dark:text-blue-300">User Object:</span>
          <pre className="mt-2 p-3 bg-white dark:bg-gray-800 rounded border text-xs overflow-auto max-h-64">
            {JSON.stringify(userData?.user, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  )
} 