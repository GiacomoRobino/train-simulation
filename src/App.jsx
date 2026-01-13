import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [redPosition, setRedPosition] = useState(0)
  const [bluePosition, setBluePosition] = useState(0)
  const animationRef = useRef(null)
  const lastTimeRef = useRef(null)

  const TRAIN_SPEED_RED = 150
  const TRAIN_SPEED_BLUE = 100
  const TRAIN_WIDTH = 80

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = performance.now()

      const animate = (currentTime) => {
        if (lastTimeRef.current === null) {
          lastTimeRef.current = currentTime
        }

        const deltaTime = (currentTime - lastTimeRef.current) / 1000
        lastTimeRef.current = currentTime

        setRedPosition(prev => {
          const trackWidth = window.innerWidth - TRAIN_WIDTH - 40
          const newPos = prev + TRAIN_SPEED_RED * deltaTime
          return newPos >= trackWidth ? 0 : newPos
        })

        setBluePosition(prev => {
          const trackWidth = window.innerWidth - TRAIN_WIDTH - 40
          const newPos = prev + TRAIN_SPEED_BLUE * deltaTime
          return newPos >= trackWidth ? 0 : newPos
        })

        animationRef.current = requestAnimationFrame(animate)
      }

      animationRef.current = requestAnimationFrame(animate)
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isRunning])

  const handleStartStop = () => {
    setIsRunning(prev => !prev)
  }

  const handleReset = () => {
    setIsRunning(false)
    setRedPosition(0)
    setBluePosition(0)
    lastTimeRef.current = null
  }

  return (
    <div className="simulation-container">
      <h1>Train Simulation</h1>

      <div className="tracks-container">
        <div className="track">
          <div className="track-line"></div>
          <div
            className="train red-train"
            style={{ left: `${redPosition}px` }}
          ></div>
        </div>

        <div className="track">
          <div className="track-line"></div>
          <div
            className="train blue-train"
            style={{ left: `${bluePosition}px` }}
          ></div>
        </div>
      </div>

      <div className="controls">
        <button onClick={handleStartStop} className="control-btn">
          {isRunning ? 'Stop' : 'Start'}
        </button>
        <button onClick={handleReset} className="control-btn reset-btn">
          Reset
        </button>
      </div>
    </div>
  )
}

export default App
