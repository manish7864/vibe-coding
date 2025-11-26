/*
SnakeGame.jsx
Single-file React component (default export) implementing a playable Snake game.
Drop this file into a React app (e.g. create-react-app / Vite) and import <SnakeGame />.

Features:
- Canvas-based grid game with responsive layout
- Arrow keys and WASD controls
- Touch swipe support for mobile
- Pause / Resume, Restart
- Score + High score saved in localStorage
- Increasing speed as snake eats food
- Neat Tailwind-styled UI (Tailwind available in the project) - no external libraries required

Usage:
1. Save as src/components/SnakeGame.jsx
2. import SnakeGame from './components/SnakeGame'
3. Use <SnakeGame /> in your App

Note: This file uses Tailwind utility classes for styling. If you don't have Tailwind, the game still works but the UI styling will be basic.
*/

import React, { useEffect, useRef, useState } from 'react'

export default function SnakeGame() {
  // game settings
  const GRID_ROWS = 20
  const GRID_COLS = 20
  const INITIAL_SPEED = 6 // ticks per second
  const SPEED_INCREASE = 0.5 // per food
  const INITIAL_SNAKE = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }]

  // refs
  const canvasRef = useRef(null)
  const intervalRef = useRef(null)
  const touchStartRef = useRef(null)

  // state
  const [snake, setSnake] = useState(INITIAL_SNAKE)
  const [dir, setDir] = useState({ x: 1, y: 0 }) // moving right initially
  const [nextDir, setNextDir] = useState(null)
  const [food, setFood] = useState(placeFood(INITIAL_SNAKE))
  const [speed, setSpeed] = useState(INITIAL_SPEED)
  const [running, setRunning] = useState(true)
  const [score, setScore] = useState(0)
  const [highScore, setHighScore] = useState(() => {
    try {
      return Number(localStorage.getItem('snake_highscore') || 0)
    } catch (e) {
      return 0
    }
  })
  const [cellSize, setCellSize] = useState(20)

  // draw
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    canvas.width = GRID_COLS * cellSize
    canvas.height = GRID_ROWS * cellSize

    // clear
    ctx.fillStyle = '#0f172a' // slate-900
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // draw grid subtle (optional)
    ctx.strokeStyle = 'rgba(255,255,255,0.03)'
    for (let r = 0; r <= GRID_ROWS; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * cellSize)
      ctx.lineTo(canvas.width, r * cellSize)
      ctx.stroke()
    }
    for (let c = 0; c <= GRID_COLS; c++) {
      ctx.beginPath()
      ctx.moveTo(c * cellSize, 0)
      ctx.lineTo(c * cellSize, canvas.height)
      ctx.stroke()
    }

    // draw food
    drawCell(ctx, food.x, food.y, cellSize, '#ef4444') // red-500

    // draw snake
    snake.forEach((seg, idx) => {
      const shade = idx === 0 ? '#84cc16' : '#16a34a' // head lighter
      drawCell(ctx, seg.x, seg.y, cellSize, shade)
    })
  }, [snake, food, cellSize])

  // handle resize to set cell size responsively
  useEffect(() => {
    function updateCellSize() {
      const maxWidth = Math.min(window.innerWidth - 48, 640) // keep some margins
      const cs = Math.floor(maxWidth / GRID_COLS)
      setCellSize(Math.max(12, Math.min(cs, 28)))
    }
    updateCellSize()
    window.addEventListener('resize', updateCellSize)
    return () => window.removeEventListener('resize', updateCellSize)
  }, [])

  // main loop: tick based on speed
  useEffect(() => {
    if (!running) return
    clearInterval(intervalRef.current)
    intervalRef.current = setInterval(() => {
      tick()
    }, 1000 / speed)
    return () => clearInterval(intervalRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speed, running, snake, dir, nextDir, food])

  // keyboard controls
  useEffect(() => {
    function onKey(e) {
      const key = e.key
      if (key === 'ArrowUp' || key === 'w' || key === 'W') trySetDir({ x: 0, y: -1 })
      if (key === 'ArrowDown' || key === 's' || key === 'S') trySetDir({ x: 0, y: 1 })
      if (key === 'ArrowLeft' || key === 'a' || key === 'A') trySetDir({ x: -1, y: 0 })
      if (key === 'ArrowRight' || key === 'd' || key === 'D') trySetDir({ x: 1, y: 0 })
      if (key === ' ' || key === 'Spacebar') toggleRunning()
      if (key === 'r' || key === 'R') resetGame()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir, running])

  // touch controls (swipe)
  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    function touchStart(e) {
      const t = e.touches[0]
      touchStartRef.current = { x: t.clientX, y: t.clientY }
    }
    function touchEnd(e) {
      const t0 = touchStartRef.current
      if (!t0) return
      const t = e.changedTouches[0]
      const dx = t.clientX - t0.x
      const dy = t.clientY - t0.y
      const absX = Math.abs(dx)
      const absY = Math.abs(dy)
      if (Math.max(absX, absY) < 20) return
      if (absX > absY) {
        if (dx > 0) trySetDir({ x: 1, y: 0 })
        else trySetDir({ x: -1, y: 0 })
      } else {
        if (dy > 0) trySetDir({ x: 0, y: 1 })
        else trySetDir({ x: 0, y: -1 })
      }
    }
    el.addEventListener('touchstart', touchStart)
    el.addEventListener('touchend', touchEnd)
    return () => {
      el.removeEventListener('touchstart', touchStart)
      el.removeEventListener('touchend', touchEnd)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dir])

  // helper to change direction safely (no reverse)
  function trySetDir(newDir) {
    if (!dir) {
      setDir(newDir)
      return
    }
    // prevent reversing onto itself
    if (dir.x + newDir.x === 0 && dir.y + newDir.y === 0) return
    // queue direction for next tick for responsiveness
    setNextDir(newDir)
  }

  function tick() {
    setSnake((prev) => {
      const currentDir = nextDir || dir
      // apply queued direction
      if (nextDir) setDir(nextDir)
      setNextDir(null)

      const head = prev[0]
      const newHead = { x: mod(head.x + currentDir.x, GRID_COLS), y: mod(head.y + currentDir.y, GRID_ROWS) }

      // check collision with self
      if (prev.some((s) => s.x === newHead.x && s.y === newHead.y)) {
        // game over
        handleGameOver()
        return prev
      }

      let grew = false
      if (newHead.x === food.x && newHead.y === food.y) {
        grew = true
        setScore((s) => s + 1)
        setSpeed((sp) => sp + SPEED_INCREASE)
        // place new food ensuring not on snake
        setFood(placeFood([newHead, ...prev]))
      }

      const newSnake = [newHead, ...prev]
      if (!grew) newSnake.pop()
      return newSnake
    })
  }

  function handleGameOver() {
    setRunning(false)
    // update highscore
    setHighScore((hs) => {
      const newHS = Math.max(hs, score)
      try {
        localStorage.setItem('snake_highscore', String(newHS))
      } catch (e) {}
      return newHS
    })
  }

  function toggleRunning() {
    setRunning((r) => !r)
  }

  function resetGame() {
    setSnake(INITIAL_SNAKE)
    setDir({ x: 1, y: 0 })
    setNextDir(null)
    setFood(placeFood(INITIAL_SNAKE))
    setSpeed(INITIAL_SPEED)
    setRunning(true)
    setScore(0)
  }

  // small helpers
  function drawCell(ctx, x, y, size, fill) {
    ctx.fillStyle = fill
    const pad = Math.max(1, Math.floor(size * 0.08))
    ctx.fillRect(x * size + pad, y * size + pad, size - pad * 2, size - pad * 2)
  }

  function mod(n, m) {
    return ((n % m) + m) % m
  }

  function placeFood(snakeArr) {
    const occupied = new Set(snakeArr.map((s) => `${s.x},${s.y}`))
    const free = []
    for (let x = 0; x < GRID_COLS; x++) {
      for (let y = 0; y < GRID_ROWS; y++) {
        const key = `${x},${y}`
        if (!occupied.has(key)) free.push({ x, y })
      }
    }
    if (free.length === 0) return { x: 0, y: 0 }
    return free[Math.floor(Math.random() * free.length)]
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800 p-6">
      <div className="w-full max-w-screen-sm bg-slate-50/5 border border-slate-700 rounded-2xl p-4 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-xl font-semibold text-white">Snake</h2>
            <p className="text-sm text-slate-300">Use arrow keys / WASD. Tap & swipe on mobile.</p>
          </div>
          <div className="text-right">
            <div className="text-slate-300 text-sm">Score</div>
            <div className="text-white text-2xl font-medium">{score}</div>
            <div className="text-slate-400 text-xs">High: {highScore}</div>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <canvas
            ref={canvasRef}
            className="rounded-md shadow-inner touch-none"
            style={{ background: 'transparent', display: 'block' }}
            width={GRID_COLS * cellSize}
            height={GRID_ROWS * cellSize}
          />

          <div className="flex-1">
            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button
                  onClick={toggleRunning}
                  className="px-3 py-2 rounded-lg bg-slate-700 text-white text-sm hover:bg-slate-600"
                >
                  {running ? 'Pause' : 'Resume'}
                </button>
                <button
                  onClick={resetGame}
                  className="px-3 py-2 rounded-lg bg-emerald-600 text-white text-sm hover:bg-emerald-500"
                >
                  Restart
                </button>
              </div>

              <div className="mt-2 text-slate-300 text-sm">Speed: {speed.toFixed(1)} ticks/sec</div>

              <div className="mt-4 bg-slate-800/50 p-2 rounded-lg text-slate-300 text-sm">
                <strong>Controls</strong>
                <ul className="list-disc list-inside mt-2 ml-2">
                  <li>Arrow keys or WASD to move</li>
                  <li>Space to pause/resume</li>
                  <li>R to restart</li>
                  <li>Swipe on touch devices</li>
                </ul>
              </div>

              <div className="mt-4 text-xs text-slate-400">Tip: Don't run into the snake's body. Eating food increases speed.</div>
            </div>
          </div>
        </div>

        <div className="mt-3 text-xs text-slate-500">Made with ❤️ — single-file React + Canvas</div>
      </div>
    </div>
  )
}
