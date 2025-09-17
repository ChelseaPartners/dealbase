'use client'

import { useState, useEffect } from 'react'

export default function TestPage() {
  const [result, setResult] = useState<string>('Loading...')

  useEffect(() => {
    const testFetch = async () => {
      try {
        console.log('Starting fetch test...')
        const response = await fetch('/api/deals')
        console.log('Response received:', response.status)
        const data = await response.json()
        console.log('Data received:', data.length, 'deals')
        setResult(`Success: ${data.length} deals loaded`)
      } catch (error) {
        console.error('Fetch error:', error)
        setResult(`Error: ${error}`)
      }
    }

    testFetch()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Fetch Test</h1>
      <p>Result: {result}</p>
    </div>
  )
}
