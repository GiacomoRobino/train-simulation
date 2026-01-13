import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [redPosition, setRedPosition] = useState(0)
  const [bluePosition, setBluePosition] = useState(0)
  const [velocity, setVelocity] = useState(0)
  const [maxSpeed, setMaxSpeed] = useState(200)
  const [acceleration, setAcceleration] = useState(50)

  const animationRef = useRef(null)
  const lastTimeRef = useRef(null)
  const velocityRef = useRef(0)
  const positionRef = useRef(0)

  const TRAIN_WIDTH = 80

  useEffect(() => {
    velocityRef.current = velocity
  }, [velocity])

  useEffect(() => {
    if (isRunning && !isFinished) {
      lastTimeRef.current = performance.now()

      const animate = (currentTime) => {
        if (lastTimeRef.current === null) {
          lastTimeRef.current = currentTime
        }

        const deltaTime = (currentTime - lastTimeRef.current) / 1000
        lastTimeRef.current = currentTime

        const trackWidth = window.innerWidth - TRAIN_WIDTH - 40
        const currentPos = positionRef.current
        const currentVel = velocityRef.current

        // Calculate stopping distance: d = v² / (2 * a)
        const stoppingDistance = (currentVel * currentVel) / (2 * acceleration)
        const remainingDistance = trackWidth - currentPos

        let newVelocity
        let newPosition

        if (remainingDistance <= stoppingDistance && currentVel > 0) {
          // Decelerate
          newVelocity = Math.max(0, currentVel - acceleration * deltaTime)
        } else if (currentVel < maxSpeed) {
          // Accelerate
          newVelocity = Math.min(currentVel + acceleration * deltaTime, maxSpeed)
        } else {
          newVelocity = currentVel
        }

        newPosition = currentPos + newVelocity * deltaTime

        // Clamp to track end
        if (newPosition >= trackWidth) {
          newPosition = trackWidth
          newVelocity = 0
        }

        velocityRef.current = newVelocity
        positionRef.current = newPosition
        setVelocity(newVelocity)
        setRedPosition(newPosition)
        setBluePosition(newPosition)

        // Check if finished
        if (newPosition >= trackWidth && newVelocity === 0) {
          setIsFinished(true)
          setIsRunning(false)
          return
        }

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
  }, [isRunning, isFinished, maxSpeed, acceleration])

  const handleStart = () => {
    setIsRunning(true)
  }

  const handleStop = () => {
    setIsRunning(false)
  }

  const handleReset = () => {
    setIsRunning(false)
    setIsFinished(false)
    setRedPosition(0)
    setBluePosition(0)
    setVelocity(0)
    velocityRef.current = 0
    positionRef.current = 0
    lastTimeRef.current = null
  }

  const simulationStarted = isRunning || isFinished || velocity > 0 || redPosition > 0

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
            disabled={simulationStarted}
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
            disabled={simulationStarted}
          />
        </div>
        <div className="velocity-display">
          Current Speed: {Math.round(velocity)} px/s
          {isFinished && ' - Finished!'}
        </div>
      </div>

      <div className="controls">
        <button onClick={handleStart} className="control-btn start-btn" disabled={isRunning || isFinished}>
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
