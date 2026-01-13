import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [maxSpeed, setMaxSpeed] = useState(200)
  const [acceleration, setAcceleration] = useState(50)

  // Red train state
  const [redPosition, setRedPosition] = useState(0)
  const [redVelocity, setRedVelocity] = useState(0)
  const [redTime, setRedTime] = useState(0)
  const [redFinished, setRedFinished] = useState(false)
  const [redStation, setRedStation] = useState(null)
  const [redAtStation, setRedAtStation] = useState(false)

  // Blue train state
  const [bluePosition, setBluePosition] = useState(0)
  const [blueVelocity, setBlueVelocity] = useState(0)
  const [blueTime, setBlueTime] = useState(0)
  const [blueFinished, setBlueFinished] = useState(false)
  const [blueStation, setBlueStation] = useState(null)
  const [blueAtStation, setBlueAtStation] = useState(false)

  const animationRef = useRef(null)
  const lastTimeRef = useRef(null)
  const startTimeRef = useRef(null)

  // Refs for animation
  const redRef = useRef({
    position: 0,
    velocity: 0,
    finished: false,
    atStation: false,
    stationStopTime: 0,
    passedStation: false,
    finishedTime: null
  })
  const blueRef = useRef({
    position: 0,
    velocity: 0,
    finished: false,
    atStation: false,
    stationStopTime: 0,
    passedStation: false,
    finishedTime: null
  })

  const TRAIN_WIDTH = 80
  const STATION_STOP_DURATION = 1 // seconds

  const updateTrain = (state, station, trackWidth, deltaTime, maxSpd, accel) => {
    const newState = { ...state }

    // If at station, handle stop
    if (newState.atStation) {
      newState.stationStopTime += deltaTime
      if (newState.stationStopTime >= STATION_STOP_DURATION) {
        newState.atStation = false
        newState.passedStation = true
      }
      return newState
    }

    const currentPos = newState.position
    const currentVel = newState.velocity

    // Find next target (station or end)
    let targetPos = trackWidth

    if (station !== null && !newState.passedStation) {
      const stationPos = station
      if (currentPos < stationPos) {
        targetPos = stationPos
      }
    }

    // Calculate stopping distance: d = v² / (2 * a)
    const stoppingDistance = (currentVel * currentVel) / (2 * accel)
    const remainingDistance = targetPos - currentPos

    let newVelocity
    let newPosition

    if (remainingDistance <= stoppingDistance && currentVel > 0) {
      // Decelerate
      newVelocity = Math.max(0, currentVel - accel * deltaTime)
    } else if (currentVel < maxSpd) {
      // Accelerate
      newVelocity = Math.min(currentVel + accel * deltaTime, maxSpd)
    } else {
      newVelocity = currentVel
    }

    newPosition = currentPos + newVelocity * deltaTime

    // Check if reached station
    if (station !== null && !newState.passedStation && newPosition >= station && currentPos < station) {
      newPosition = station
      newVelocity = 0
      newState.atStation = true
      newState.stationStopTime = 0
    }

    // Clamp to track end
    if (newPosition >= trackWidth) {
      newPosition = trackWidth
      newVelocity = 0
      newState.finished = true
    }

    newState.position = newPosition
    newState.velocity = newVelocity

    return newState
  }

  useEffect(() => {
    if (isRunning && !isFinished) {
      lastTimeRef.current = performance.now()
      if (startTimeRef.current === null) {
        startTimeRef.current = performance.now()
      }

      const animate = (currentTime) => {
        if (lastTimeRef.current === null) {
          lastTimeRef.current = currentTime
        }

        const deltaTime = (currentTime - lastTimeRef.current) / 1000
        lastTimeRef.current = currentTime

        const trackWidth = window.innerWidth - TRAIN_WIDTH - 40

        // Update red train
        const redState = updateTrain(
          redRef.current,
          redStation,
          trackWidth,
          deltaTime,
          maxSpeed,
          acceleration
        )
        redRef.current = redState
        setRedPosition(redState.position)
        setRedVelocity(redState.velocity)
        setRedAtStation(redState.atStation)
        if (redState.finished && !redRef.current.finishedTime) {
          redRef.current.finishedTime = (currentTime - startTimeRef.current) / 1000
          setRedFinished(true)
          setRedTime(redRef.current.finishedTime)
        }

        // Update blue train
        const blueState = updateTrain(
          blueRef.current,
          blueStation,
          trackWidth,
          deltaTime,
          maxSpeed,
          acceleration
        )
        blueRef.current = blueState
        setBluePosition(blueState.position)
        setBlueVelocity(blueState.velocity)
        setBlueAtStation(blueState.atStation)
        if (blueState.finished && !blueRef.current.finishedTime) {
          blueRef.current.finishedTime = (currentTime - startTimeRef.current) / 1000
          setBlueFinished(true)
          setBlueTime(blueRef.current.finishedTime)
        }

        // Update timers for non-finished trains
        const elapsedTime = (currentTime - startTimeRef.current) / 1000
        if (!redRef.current.finished) {
          setRedTime(elapsedTime)
        }
        if (!blueRef.current.finished) {
          setBlueTime(elapsedTime)
        }

        // Check if both finished
        if (redState.finished && blueState.finished) {
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
  }, [isRunning, isFinished, maxSpeed, acceleration, redStation, blueStation])

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
    setRedVelocity(0)
    setBlueVelocity(0)
    setRedTime(0)
    setBlueTime(0)
    setRedFinished(false)
    setBlueFinished(false)
    setRedAtStation(false)
    setBlueAtStation(false)
    redRef.current = {
      position: 0,
      velocity: 0,
      finished: false,
      atStation: false,
      stationStopTime: 0,
      passedStation: false,
      finishedTime: null
    }
    blueRef.current = {
      position: 0,
      velocity: 0,
      finished: false,
      atStation: false,
      stationStopTime: 0,
      passedStation: false,
      finishedTime: null
    }
    lastTimeRef.current = null
    startTimeRef.current = null
  }

  const addRedStation = () => {
    const trackWidth = window.innerWidth - TRAIN_WIDTH - 40
    setRedStation(trackWidth / 2)
  }

  const addBlueStation = () => {
    const trackWidth = window.innerWidth - TRAIN_WIDTH - 40
    setBlueStation(trackWidth / 2)
  }

  const formatTime = (time) => {
    return time.toFixed(2) + 's'
  }

  const simulationStarted = isRunning || isFinished || redVelocity > 0 || redPosition > 0

  return (
    <div className="simulation-container">
      <h1>Train Simulation</h1>

      <div className="tracks-container">
        <div className="track-wrapper">
          <div className="track-header">
            <div className="track-timer red-timer">
              {formatTime(redTime)}
              {redFinished && ' ✓'}
              {redAtStation && ' (at station)'}
            </div>
            <button
              className="station-btn red-station-btn"
              onClick={addRedStation}
              disabled={simulationStarted || redStation !== null}
            >
              Add Station
            </button>
          </div>
          <div className="track">
            <div className="track-line"></div>
            {redStation !== null && (
              <div className="station" style={{ left: `${redStation}px` }}></div>
            )}
            <div
              className="train red-train"
              style={{ left: `${redPosition}px` }}
            ></div>
          </div>
        </div>

        <div className="track-wrapper">
          <div className="track-header">
            <div className="track-timer blue-timer">
              {formatTime(blueTime)}
              {blueFinished && ' ✓'}
              {blueAtStation && ' (at station)'}
            </div>
            <button
              className="station-btn blue-station-btn"
              onClick={addBlueStation}
              disabled={simulationStarted || blueStation !== null}
            >
              Add Station
            </button>
          </div>
          <div className="track">
            <div className="track-line"></div>
            {blueStation !== null && (
              <div className="station" style={{ left: `${blueStation}px` }}></div>
            )}
            <div
              className="train blue-train"
              style={{ left: `${bluePosition}px` }}
            ></div>
          </div>
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
          Red: {Math.round(redVelocity)} px/s | Blue: {Math.round(blueVelocity)} px/s
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
