import React, { useRef, useEffect, useState } from 'react'

const CANVAS_SIZE = 400
const SCALE = 20
const ROWS = CANVAS_SIZE / SCALE

export default function SnakeGame(){
  const canvasRef = useRef(null)
  const [score, setScore] = useState(0)
  const scoreRef = useRef(0)
  const [highScore, setHighScore] = useState(0)
  const [running, setRunning] = useState(true)
  const velocityRef = useRef({x:1,y:0})
  const snakeRef = useRef([{x:10,y:10}])
  const appleRef = useRef({x:5,y:5})
  const animationRef = useRef(null)
  const speedRef = useRef(8)

  useEffect(() => {
    const saved = parseInt(localStorage.getItem('snake_high_score') || '0', 10)
    if(!isNaN(saved)) setHighScore(saved)
  }, [])

  useEffect(() => {
    localStorage.setItem('snake_high_score', String(highScore))
  }, [highScore])

  useEffect(() => {
    const handleKey = (e) => {
      const v = velocityRef.current
      if(e.key === 'ArrowUp' && v.y !== 1) velocityRef.current = {x:0, y:-1}
      if(e.key === 'ArrowDown' && v.y !== -1) velocityRef.current = {x:0, y:1}
      if(e.key === 'ArrowLeft' && v.x !== 1) velocityRef.current = {x:-1, y:0}
      if(e.key === 'ArrowRight' && v.x !== -1) velocityRef.current = {x:1, y:0}
      if(e.key === ' ' || e.key === 'Spacebar') setRunning(r => !r)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  },[])

  useEffect(() => {
    let lastTime = 0

    const loop = (time) => {
      if(!lastTime) lastTime = time
      const frameInterval = 1000 / speedRef.current
      const delta = time - lastTime
      if(delta > frameInterval){
        if(running) update()
        draw()
        lastTime = time
      }
      animationRef.current = requestAnimationFrame(loop)
    }
    animationRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(animationRef.current)
  }, [running])

  function reset(){
    // update refs and state for a fresh game
    snakeRef.current = [{x:10,y:10}]
    velocityRef.current = {x:1,y:0}
    appleRef.current = randomApple()
    scoreRef.current = 0
    setScore(0)
    speedRef.current = 8
    setRunning(true)
  }

  function randomApple(){
    return {
      x: Math.floor(Math.random() * ROWS),
      y: Math.floor(Math.random() * ROWS)
    }
  }

  function update(){
    const head = { ...snakeRef.current[0] }
    head.x += velocityRef.current.x
    head.y += velocityRef.current.y
    if(head.x < 0) head.x = ROWS -1
    if(head.x >= ROWS) head.x = 0
    if(head.y < 0) head.y = ROWS -1
    if(head.y >= ROWS) head.y = 0

    for(let part of snakeRef.current){
      if(part.x === head.x && part.y === head.y){
        // game over -> update high score before resetting
        const current = scoreRef.current || score
        if(current > highScore){
          setHighScore(current)
          localStorage.setItem('snake_high_score', String(current))
        }
        reset()
        return
      }
    }

    snakeRef.current.unshift(head)
    if(head.x === appleRef.current.x && head.y === appleRef.current.y){
      // increase score and possibly speed
      setScore(prev => {
        const next = prev + 1
        scoreRef.current = next
        // increase speed slightly every 5 points
        speedRef.current = 8 + Math.floor(next / 5)
        return next
      })
      appleRef.current = randomApple()
    } else {
      snakeRef.current.pop()
    }
  }

  function draw(){
    const canvas = canvasRef.current
    if(!canvas) return
    const ctx = canvas.getContext('2d')

    // background
    ctx.fillStyle = '#0f172a'
    ctx.fillRect(0,0,CANVAS_SIZE,CANVAS_SIZE)

    // grid
    const gridColor = 'rgba(255,255,255,0.03)'
    ctx.strokeStyle = gridColor
    ctx.lineWidth = 1

    // draw vertical lines
    for(let x = 0; x <= CANVAS_SIZE; x += SCALE){
      ctx.beginPath()
      ctx.moveTo(x + 0.5, 0)
      ctx.lineTo(x + 0.5, CANVAS_SIZE)
      ctx.stroke()
    }

    // draw horizontal lines
    for(let y = 0; y <= CANVAS_SIZE; y += SCALE){
      ctx.beginPath()
      ctx.moveTo(0, y + 0.5)
      ctx.lineTo(CANVAS_SIZE, y + 0.5)
      ctx.stroke()
    }

    // apple
    ctx.fillStyle = '#ef4444'
    ctx.fillRect(appleRef.current.x * SCALE, appleRef.current.y * SCALE, SCALE, SCALE)

    // snake
    ctx.fillStyle = '#22c55e'
    for(const part of snakeRef.current){
      ctx.fillRect(part.x * SCALE + 1, part.y * SCALE +1, SCALE -2, SCALE -2)
    }
  }

  return (
    <div className="bg-gray-800 rounded-lg p-4 shadow-lg">
      <div className="flex items-center justify-between mb-3">
        <div>Score: <span className="font-bold">{score}</span> <span className="text-sm text-gray-300">| High: {highScore}</span></div>
        <div>
          <button onClick={()=>{ setRunning(r=>!r) }} className="px-3 py-1 bg-indigo-600 rounded mr-2"> {running ? 'Pause' : 'Resume'} </button>
          <button onClick={() => {
            // update high score when manually restarting if current score > high
            const current = scoreRef.current || score
            if(current > highScore){
              setHighScore(current)
              localStorage.setItem('snake_high_score', String(current))
            }
            reset()
          }} className="px-3 py-1 bg-green-600 rounded">Restart</button>
        </div>
      </div>
      <div className="flex justify-center">
        <canvas ref={canvasRef} width={CANVAS_SIZE} height={CANVAS_SIZE} className="border border-gray-700 rounded" />
      </div>
      <p className="mt-3 text-sm text-gray-300">Use arrow keys to move. Press Space to pause/resume. Walls wrap around.</p>
    </div>
  )
}
