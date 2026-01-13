import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [maxSpeed, setMaxSpeed] = useState(120)
  const [acceleration, setAcceleration] = useState(50)
  const [stationStopDuration, setStationStopDuration] = useState(0.5)

  // Red train state
  const [redPosition, setRedPosition] = useState(0)
  const [redVelocity, setRedVelocity] = useState(0)
  const [redTime, setRedTime] = useState(0)
  const [redFinished, setRedFinished] = useState(false)
  const [redStations, setRedStations] = useState([])
  const [redAtStation, setRedAtStation] = useState(false)
  const [redPlacingStation, setRedPlacingStation] = useState(false)

  // Blue train state
  const [bluePosition, setBluePosition] = useState(0)
  const [blueVelocity, setBlueVelocity] = useState(0)
  const [blueTime, setBlueTime] = useState(0)
  const [blueFinished, setBlueFinished] = useState(false)
  const [blueStations, setBlueStations] = useState([])
  const [blueAtStation, setBlueAtStation] = useState(false)
  const [bluePlacingStation, setBluePlacingStation] = useState(false)

  const animationRef = useRef(null)
  const lastTimeRef = useRef(null)
  const startTimeRef = useRef(null)
  const redTrackRef = useRef(null)
  const blueTrackRef = useRef(null)

  // Refs for animation
  const redRef = useRef({
    position: 0,
    velocity: 0,
    finished: false,
    atStation: false,
    stationStopTime: 0,
    passedStations: new Set(),
    finishedTime: null
  })
  const blueRef = useRef({
    position: 0,
    velocity: 0,
    finished: false,
    atStation: false,
    stationStopTime: 0,
    passedStations: new Set(),
    finishedTime: null
  })

  const TRAIN_WIDTH = 80

  const updateTrain = (state, stations, trackWidth, deltaTime, maxSpd, accel, stopDuration) => {
    const newState = { ...state, passedStations: new Set(state.passedStations) }

    // If at station, handle stop
    if (newState.atStation) {
      newState.stationStopTime += deltaTime
      if (newState.stationStopTime >= stopDuration) {
        newState.atStation = false
        newState.currentStationPassed = true
      }
      return newState
    }

    // Mark current station as passed after leaving
    if (newState.currentStationPassed && newState.currentStationIndex !== undefined) {
      newState.passedStations.add(newState.currentStationIndex)
      newState.currentStationPassed = false
      newState.currentStationIndex = undefined
    }

    const currentPos = newState.position
    const currentVel = newState.velocity

    // Find next target (next station or end)
    let targetPos = trackWidth
    let nextStationIndex = -1

    // Sort stations and find the next one
    const sortedStations = [...stations].map((pos, idx) => ({ pos, idx })).sort((a, b) => a.pos - b.pos)

    for (const { pos, idx } of sortedStations) {
      if (pos > currentPos && !newState.passedStations.has(idx)) {
        targetPos = pos
        nextStationIndex = idx
        break
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

    // Check if reached a station
    if (nextStationIndex !== -1 && newPosition >= targetPos && currentPos < targetPos) {
      newPosition = targetPos
      newVelocity = 0
      newState.atStation = true
      newState.stationStopTime = 0
      newState.currentStationIndex = nextStationIndex
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
          redStations,
          trackWidth,
          deltaTime,
          maxSpeed,
          acceleration,
          stationStopDuration
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
          blueStations,
          trackWidth,
          deltaTime,
          maxSpeed,
          acceleration,
          stationStopDuration
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
  }, [isRunning, isFinished, maxSpeed, acceleration, redStations, blueStations, stationStopDuration])

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
    setRedPlacingStation(false)
    setBluePlacingStation(false)
    redRef.current = {
      position: 0,
      velocity: 0,
      finished: false,
      atStation: false,
      stationStopTime: 0,
      passedStations: new Set(),
      finishedTime: null
    }
    blueRef.current = {
      position: 0,
      velocity: 0,
      finished: false,
      atStation: false,
      stationStopTime: 0,
      passedStations: new Set(),
      finishedTime: null
    }
    lastTimeRef.current = null
    startTimeRef.current = null
  }

  const handleClearStations = () => {
    setRedStations([])
    setBlueStations([])
  }

  const handleAddRedStation = () => {
    setRedPlacingStation(true)
    setBluePlacingStation(false)
  }

  const handleAddBlueStation = () => {
    setBluePlacingStation(true)
    setRedPlacingStation(false)
  }

  const handleRedTrackClick = (e) => {
    if (!redPlacingStation || simulationStarted) return

    const rect = redTrackRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left

    // Ensure station is within valid bounds
    const minPos = 20
    const maxPos = rect.width - 20
    const stationPos = Math.max(minPos, Math.min(maxPos, clickX))

    setRedStations(prev => [...prev, stationPos])
    setRedPlacingStation(false)
  }

  const handleBlueTrackClick = (e) => {
    if (!bluePlacingStation || simulationStarted) return

    const rect = blueTrackRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left

    // Ensure station is within valid bounds
    const minPos = 20
    const maxPos = rect.width - 20
    const stationPos = Math.max(minPos, Math.min(maxPos, clickX))

    setBlueStations(prev => [...prev, stationPos])
    setBluePlacingStation(false)
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
              onClick={handleAddRedStation}
              disabled={simulationStarted}
            >
              {redPlacingStation ? 'Click on track...' : 'Add Station'}
            </button>
          </div>
          <div
            className={`track ${redPlacingStation ? 'track-placing' : ''}`}
            ref={redTrackRef}
            onClick={handleRedTrackClick}
          >
            <div className="track-line"></div>
            {redStations.map((pos, index) => (
              <div key={index} className="station" style={{ left: `${pos}px` }}></div>
            ))}
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
              onClick={handleAddBlueStation}
              disabled={simulationStarted}
            >
              {bluePlacingStation ? 'Click on track...' : 'Add Station'}
            </button>
          </div>
          <div
            className={`track ${bluePlacingStation ? 'track-placing' : ''}`}
            ref={blueTrackRef}
            onClick={handleBlueTrackClick}
          >
            <div className="track-line"></div>
            {blueStations.map((pos, index) => (
              <div key={index} className="station" style={{ left: `${pos}px` }}></div>
            ))}
            <div
              className="train blue-train"
              style={{ left: `${bluePosition}px` }}
            ></div>
          </div>
        </div>
      </div>

      <div className="sliders-container">
        <div className="slider-group">
          <label>Max Speed: {maxSpeed} km/h</label>
          <input
            type="range"
            min="80"
            max="200"
            step="10"
            value={maxSpeed}
            onChange={(e) => setMaxSpeed(Number(e.target.value))}
            disabled={simulationStarted}
          />
        </div>
        <div className="selector-group">
          <label>Acceleration:</label>
          <div className="selector-options">
            {[
              { value: 20, label: 'Slow' },
              { value: 50, label: 'Normal' },
              { value: 100, label: 'Fast' },
              { value: 150, label: 'Dangerous' }
            ].map((option) => (
              <button
                key={option.value}
                className={`selector-btn ${option.label === 'Dangerous' ? 'danger' : ''} ${acceleration === option.value ? 'selected' : ''}`}
                onClick={() => setAcceleration(option.value)}
                disabled={simulationStarted}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
        <div className="selector-group">
          <label>Station Stop Time:</label>
          <div className="selector-options">
            {[0.2, 0.5, 1, 1.5, 2].map((value) => (
              <button
                key={value}
                className={`selector-btn ${stationStopDuration === value ? 'selected' : ''}`}
                onClick={() => setStationStopDuration(value)}
                disabled={simulationStarted}
              >
                {value}s
              </button>
            ))}
          </div>
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
        <button
          onClick={handleClearStations}
          className="control-btn clear-btn"
          disabled={simulationStarted || (redStations.length === 0 && blueStations.length === 0)}
        >
          Clear Stations
        </button>
      </div>
    </div>
  )
}

export default App
