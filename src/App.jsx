import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [redPosition, setRedPosition] = useState(0)
  const [bluePosition, setBluePosition] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [maxSpeed, setMaxSpeed] = useState(200)
  const [acceleration, setAcceleration] = useState(50)

  const animationRef = useRef(null)
  const lastTimeRef = useRef(null)
  const velocityRef = useRef(0)

  const TRAIN_WIDTH = 80

  useEffect(() => {
    velocityRef.current = velocity
  }, [velocity])

  useEffect(() => {
    if (isRunning) {
      lastTimeRef.current = performance.now()

      const animate = (currentTime) => {
        if (lastTimeRef.current === null) {
          lastTimeRef.current = currentTime
        }

        const deltaTime = (currentTime - lastTimeRef.current) / 1000
        lastTimeRef.current = currentTime

        // Accelerate up to max speed
        const newVelocity = Math.min(velocityRef.current + acceleration * deltaTime, maxSpeed)
        velocityRef.current = newVelocity
        setVelocity(newVelocity)

        const trackWidth = window.innerWidth - TRAIN_WIDTH - 40

        setRedPosition(prev => {
          const newPos = prev + newVelocity * deltaTime
          return newPos >= trackWidth ? 0 : newPos
        })

        setBluePosition(prev => {
          const newPos = prev + newVelocity * deltaTime
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
  }, [isRunning, maxSpeed, acceleration])

  const handleStart = () => {
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
    setVelocity(0)
    velocityRef.current = 0
  }

  const handleReset = () => {
    setIsRunning(false)
    setRedPosition(0)
    setBluePosition(0)
    setVelocity(0)
    velocityRef.current = 0
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

      <div className="sliders-container">
        <div className="slider-group">
          <label>Max Speed: {maxSpeed} px/s</label>
          <input
            type="range"
            min="50"
            max="500"
            value={maxSpeed}
            onChange={(e) => setMaxSpeed(Number(e.target.value))}
          />
        </div>
        <div className="slider-group">
          <label>Acceleration: {acceleration} px/s²</label>
          <input
            type="range"
            min="10"
            max="200"
            value={acceleration}
            onChange={(e) => setAcceleration(Number(e.target.value))}
          />
        </div>
        <div className="velocity-display">
          Current Speed: {Math.round(velocity)} px/s
        </div>
      </div>

      <div className="controls">
        <button onClick={handleStart} className="control-btn start-btn" disabled={isRunning}>
          Start
        </button>
        <button onClick={handleStop} className="control-btn stop-btn" disabled={!isRunning}>
          Stop
        </button>
        <button onClick={handleReset} className="control-btn reset-btn">
          Reset
        </button>
      </div>
    </div>
  )
}

export default App
