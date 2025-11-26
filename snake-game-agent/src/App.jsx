import React from 'react'
import SnakeGame from './components/SnakeGame'

export default function App(){
  return (
    <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        <h1 className="text-3xl font-bold mb-4 text-center">Snake Game (React + Tailwind)</h1>
        <SnakeGame />
      </div>
    </div>
  )
}
