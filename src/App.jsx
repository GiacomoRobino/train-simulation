import { useState, useEffect, useRef } from 'react'
import './App.css'
import pineroloImg from './assets/Pinerolo.png'
import turinImg from './assets/Turin.png'

function App() {
  const [isRunning, setIsRunning] = useState(false)
  const [isFinished, setIsFinished] = useState(false)
  const [maxSpeed, setMaxSpeed] = useState(120)
  const [acceleration, setAcceleration] = useState(100)
  const [stationStopDuration, setStationStopDuration] = useState(0.5)

  // Red train state
  const [redPosition, setRedPosition] = useState(0)
  const [redVelocity, setRedVelocity] = useState(0)
  const [redTime, setRedTime] = useState(0)
  const [redFinished, setRedFinished] = useState(false)
  const [redStations, setRedStations] = useState([])
  const [redAtStation, setRedAtStation] = useState(false)
  const [redPlacingStation, setRedPlacingStation] = useState(false)
  const [redStationCount, setRedStationCount] = useState(0)

  // Blue train state
  const [bluePosition, setBluePosition] = useState(0)
  const [blueVelocity, setBlueVelocity] = useState(0)
  const [blueTime, setBlueTime] = useState(0)
  const [blueFinished, setBlueFinished] = useState(false)
  const [blueStations, setBlueStations] = useState([])
  const [blueAtStation, setBlueAtStation] = useState(false)
  const [bluePlacingStation, setBluePlacingStation] = useState(false)
  const [blueStationCount, setBlueStationCount] = useState(0)

  // Editing state
  const [editingStation, setEditingStation] = useState(null)

  // Dragging state
  const [draggingStation, setDraggingStation] = useState(null)

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

  const TRAIN_WIDTH = 120

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
    if (newState.currentStationPassed && newState.currentStationId !== undefined) {
      newState.passedStations.add(newState.currentStationId)
      newState.currentStationPassed = false
      newState.currentStationId = undefined
    }

    const currentPos = newState.position
    const currentVel = newState.velocity

    // Find next target (next station or end)
    let targetPos = trackWidth
    let nextStationId = null

    // Sort stations by position and find the next one
    const sortedStations = [...stations].sort((a, b) => a.position - b.position)

    for (const station of sortedStations) {
      if (station.position > currentPos && !newState.passedStations.has(station.id)) {
        targetPos = station.position
        nextStationId = station.id
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
    if (nextStationId !== null && newPosition >= targetPos && currentPos < targetPos) {
      newPosition = targetPos
      newVelocity = 0
      newState.atStation = true
      newState.stationStopTime = 0
      newState.currentStationId = nextStationId
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

        const trackWidth = window.innerWidth - TRAIN_WIDTH - 40 - 120 // 120 for city markers (60px each side)

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
    setRedStationCount(0)
    setBlueStationCount(0)
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
    const clickX = e.clientX - rect.left - 60 // Account for city marker offset

    // Ensure station is within valid bounds (within the actual track area)
    const minPos = 20
    const maxPos = rect.width - 120 - 20 // Subtract both city markers
    const stationPos = Math.max(minPos, Math.min(maxPos, clickX))

    const newCount = redStationCount + 1
    setRedStations(prev => [...prev, {
      id: newCount,
      position: stationPos,
      name: `Station_${newCount}`
    }])
    setRedStationCount(newCount)
    setRedPlacingStation(false)
  }

  const handleBlueTrackClick = (e) => {
    if (!bluePlacingStation || simulationStarted) return

    const rect = blueTrackRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left - 60 // Account for city marker offset

    // Ensure station is within valid bounds (within the actual track area)
    const minPos = 20
    const maxPos = rect.width - 120 - 20 // Subtract both city markers
    const stationPos = Math.max(minPos, Math.min(maxPos, clickX))

    const newCount = blueStationCount + 1
    setBlueStations(prev => [...prev, {
      id: newCount,
      position: stationPos,
      name: `Station_${newCount}`
    }])
    setBlueStationCount(newCount)
    setBluePlacingStation(false)
  }

  const handleDeleteRedStation = (id) => {
    setRedStations(prev => prev.filter(s => s.id !== id))
  }

  const handleDeleteBlueStation = (id) => {
    setBlueStations(prev => prev.filter(s => s.id !== id))
  }

  const handleEditStation = (track, id) => {
    setEditingStation({ track, id })
  }

  const handleSaveStationName = (e, track, id) => {
    const newName = e.target.value.trim() || `Station_${id}`
    if (track === 'red') {
      setRedStations(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s))
    } else {
      setBlueStations(prev => prev.map(s => s.id === id ? { ...s, name: newName } : s))
    }
    setEditingStation(null)
  }

  const handleKeyDown = (e, track, id) => {
    if (e.key === 'Enter') {
      handleSaveStationName(e, track, id)
    } else if (e.key === 'Escape') {
      setEditingStation(null)
    }
  }

  const handleDragStart = (e, track, id) => {
    if (simulationStarted) return
    e.preventDefault()
    setDraggingStation({ track, id })
  }

  const handleDragMove = (e) => {
    if (!draggingStation) return

    const trackRef = draggingStation.track === 'red' ? redTrackRef : blueTrackRef
    const rect = trackRef.current.getBoundingClientRect()
    const newX = e.clientX - rect.left - 60 // Account for city marker offset

    const minPos = 20
    const maxPos = rect.width - 120 - 20 // Subtract both city markers
    const clampedPos = Math.max(minPos, Math.min(maxPos, newX))

    if (draggingStation.track === 'red') {
      setRedStations(prev => prev.map(s =>
        s.id === draggingStation.id ? { ...s, position: clampedPos } : s
      ))
    } else {
      setBlueStations(prev => prev.map(s =>
        s.id === draggingStation.id ? { ...s, position: clampedPos } : s
      ))
    }
  }

  const handleDragEnd = () => {
    setDraggingStation(null)
  }

  // Global mouse event listeners for drag and drop
  useEffect(() => {
    if (draggingStation) {
      const onMouseMove = (e) => handleDragMove(e)
      const onMouseUp = () => handleDragEnd()

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

      return () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
    }
  }, [draggingStation])

  const formatTime = (time) => {
    return time.toFixed(2) + 's'
  }

  const simulationStarted = isRunning || isFinished || redVelocity > 0 || redPosition > 0

  const renderStation = (station, track) => {
    const isEditing = editingStation?.track === track && editingStation?.id === station.id
    const isDragging = draggingStation?.track === track && draggingStation?.id === station.id

    return (
      <div key={station.id} className="station-container" style={{ left: `${station.position}px` }}>
        <div className="station-label">
          {isEditing ? (
            <input
              type="text"
              className="station-name-input"
              defaultValue={station.name}
              autoFocus
              onBlur={(e) => handleSaveStationName(e, track, station.id)}
              onKeyDown={(e) => handleKeyDown(e, track, station.id)}
            />
          ) : (
            <span className="station-name">{station.name}</span>
          )}
          {!simulationStarted && (
            <div className="station-buttons">
              <button
                className="station-edit-btn"
                onClick={() => handleEditStation(track, station.id)}
                title="Edit name"
              >
                ✎
              </button>
              <button
                className="station-delete-btn"
                onClick={() => track === 'red' ? handleDeleteRedStation(station.id) : handleDeleteBlueStation(station.id)}
                title="Delete station"
              >
                ×
              </button>
            </div>
          )}
        </div>
        <div
          className={`station ${!simulationStarted ? 'station-draggable' : ''} ${isDragging ? 'station-dragging' : ''}`}
          onMouseDown={(e) => handleDragStart(e, track, station.id)}
        ></div>
      </div>
    )
  }

  return (
    <div className="simulation-container">
      <h1>Train Simulation - Pinerolo edition</h1>

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
            <div className="city-marker city-start">
              <img src={pineroloImg} alt="Pinerolo" />
              <span>Pinerolo</span>
            </div>
            <div className="track-line"></div>
            {redStations.map(station => renderStation(station, 'red'))}
            <div
              className="train red-train"
              style={{ left: `${redPosition}px` }}
            ></div>
            <div className="city-marker city-end">
              <img src={turinImg} alt="Turin" />
              <span>Turin</span>
            </div>
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
            <div className="city-marker city-start">
              <img src={pineroloImg} alt="Pinerolo" />
              <span>Pinerolo</span>
            </div>
            <div className="track-line"></div>
            {blueStations.map(station => renderStation(station, 'blue'))}
            <div
              className="train blue-train"
              style={{ left: `${bluePosition}px` }}
            ></div>
            <div className="city-marker city-end">
              <img src={turinImg} alt="Turin" />
              <span>Turin</span>
            </div>
          </div>
        </div>
      </div>

      {isFinished && (
        <div className="results">
          <h2>Results</h2>
          <div className="results-times">
            <span className="red-timer">Red: {formatTime(redTime)}</span>
            <span className="blue-timer">Blue: {formatTime(blueTime)}</span>
          </div>
          <div className="results-difference">
            {redTime === blueTime ? (
              <span className="tie">It's a tie!</span>
            ) : redTime < blueTime ? (
              <span className="winner red-timer">Red wins by {(blueTime - redTime).toFixed(2)}s ({(((blueTime - redTime) / blueTime) * 100).toFixed(1)}% faster)</span>
            ) : (
              <span className="winner blue-timer">Blue wins by {(redTime - blueTime).toFixed(2)}s ({(((redTime - blueTime) / redTime) * 100).toFixed(1)}% faster)</span>
            )}
          </div>
        </div>
      )}

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
              { value: 40, label: 'Slow' },
              { value: 100, label: 'Normal' },
              { value: 200, label: 'Fast' },
              { value: 300, label: 'Dangerous' }
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
    </div>
  )
}

export default App
