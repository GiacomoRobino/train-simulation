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
  const [crossingSlowdown, setCrossingSlowdown] = useState(50) // percentage of max speed

  // Red train state
  const [redPosition, setRedPosition] = useState(0)
  const [redVelocity, setRedVelocity] = useState(0)
  const [redTime, setRedTime] = useState(0)
  const [redFinished, setRedFinished] = useState(false)
  const [redStations, setRedStations] = useState([])
  const [redAtStation, setRedAtStation] = useState(false)
  const [redPlacingStation, setRedPlacingStation] = useState(false)
  const [redStationCount, setRedStationCount] = useState(0)
  const [redCrossings, setRedCrossings] = useState([])
  const [redPlacingCrossing, setRedPlacingCrossing] = useState(false)
  const [redCrossingCount, setRedCrossingCount] = useState(0)

  // Blue train state
  const [bluePosition, setBluePosition] = useState(0)
  const [blueVelocity, setBlueVelocity] = useState(0)
  const [blueTime, setBlueTime] = useState(0)
  const [blueFinished, setBlueFinished] = useState(false)
  const [blueStations, setBlueStations] = useState([])
  const [blueAtStation, setBlueAtStation] = useState(false)
  const [bluePlacingStation, setBluePlacingStation] = useState(false)
  const [blueStationCount, setBlueStationCount] = useState(0)
  const [blueCrossings, setBlueCrossings] = useState([])
  const [bluePlacingCrossing, setBluePlacingCrossing] = useState(false)
  const [blueCrossingCount, setBlueCrossingCount] = useState(0)

  // Editing state
  const [editingStation, setEditingStation] = useState(null)

  // Dragging state
  const [draggingStation, setDraggingStation] = useState(null)
  const [draggingCrossing, setDraggingCrossing] = useState(null)

  // Configuration management
  const [savedConfigs, setSavedConfigs] = useState(() => {
    try {
      const saved = localStorage.getItem('savedConfigs')
      return saved ? JSON.parse(saved) : []
    } catch {
      return []
    }
  })
  const [selectedConfig, setSelectedConfig] = useState('')

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
    passedCrossings: new Set(),
    finishedTime: null
  })
  const blueRef = useRef({
    position: 0,
    velocity: 0,
    finished: false,
    atStation: false,
    stationStopTime: 0,
    passedStations: new Set(),
    passedCrossings: new Set(),
    finishedTime: null
  })

  const TRAIN_WIDTH = 120

  // Save configurations list to localStorage
  useEffect(() => {
    localStorage.setItem('savedConfigs', JSON.stringify(savedConfigs))
  }, [savedConfigs])

  const handleSaveConfig = () => {
    const name = prompt('Enter configuration name:')
    if (!name || !name.trim()) return

    const newConfig = {
      name: name.trim(),
      redStations: redStations,
      blueStations: blueStations,
      redStationCount: redStationCount,
      blueStationCount: blueStationCount,
      redCrossings: redCrossings,
      blueCrossings: blueCrossings,
      redCrossingCount: redCrossingCount,
      blueCrossingCount: blueCrossingCount
    }

    setSavedConfigs(prev => {
      // Replace if name exists, otherwise add
      const existing = prev.findIndex(c => c.name === name.trim())
      if (existing >= 0) {
        const updated = [...prev]
        updated[existing] = newConfig
        return updated
      }
      return [...prev, newConfig]
    })
    setSelectedConfig(name.trim())
  }

  const handleLoadConfig = (configName) => {
    setSelectedConfig(configName)
    if (!configName) return

    const config = savedConfigs.find(c => c.name === configName)
    if (config) {
      setRedStations(config.redStations || [])
      setBlueStations(config.blueStations || [])
      setRedStationCount(config.redStationCount || 0)
      setBlueStationCount(config.blueStationCount || 0)
      setRedCrossings(config.redCrossings || [])
      setBlueCrossings(config.blueCrossings || [])
      setRedCrossingCount(config.redCrossingCount || 0)
      setBlueCrossingCount(config.blueCrossingCount || 0)
    }
  }

  const handleDeleteConfig = () => {
    if (!selectedConfig) return
    if (!confirm(`Delete configuration "${selectedConfig}"?`)) return

    setSavedConfigs(prev => prev.filter(c => c.name !== selectedConfig))
    setSelectedConfig('')
  }

  const updateTrain = (state, stations, crossings, trackWidth, deltaTime, maxSpd, accel, stopDuration, crossingSpeedPercent) => {
    const newState = {
      ...state,
      passedStations: new Set(state.passedStations),
      passedCrossings: new Set(state.passedCrossings || [])
    }

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

    // Find next crossing
    let nextCrossing = null
    const sortedCrossings = [...crossings].sort((a, b) => a.position - b.position)
    for (const crossing of sortedCrossings) {
      if (crossing.position > currentPos && !newState.passedCrossings.has(crossing.id)) {
        nextCrossing = crossing
        break
      }
    }

    // Determine effective max speed based on crossing proximity
    const crossingSpeed = maxSpd * (crossingSpeedPercent / 100)
    let effectiveMaxSpeed = maxSpd

    // If there's a crossing ahead, calculate slowdown distance
    if (nextCrossing) {
      const distanceToCrossing = nextCrossing.position - currentPos
      // Calculate distance needed to slow down to crossing speed
      const slowdownDistance = Math.abs((currentVel * currentVel - crossingSpeed * crossingSpeed) / (2 * accel))

      if (distanceToCrossing <= slowdownDistance + 50) {
        effectiveMaxSpeed = crossingSpeed
      }
    }

    // Calculate stopping distance: d = v² / (2 * a)
    const stoppingDistance = (currentVel * currentVel) / (2 * accel)
    const remainingDistance = targetPos - currentPos

    let newVelocity
    let newPosition

    if (remainingDistance <= stoppingDistance && currentVel > 0) {
      // Decelerate for station/end
      newVelocity = Math.max(0, currentVel - accel * deltaTime)
    } else if (currentVel > effectiveMaxSpeed) {
      // Decelerate for crossing
      newVelocity = Math.max(effectiveMaxSpeed, currentVel - accel * deltaTime)
    } else if (currentVel < effectiveMaxSpeed) {
      // Accelerate
      newVelocity = Math.min(currentVel + accel * deltaTime, effectiveMaxSpeed)
    } else {
      newVelocity = currentVel
    }

    newPosition = currentPos + newVelocity * deltaTime

    // Check if passed a crossing
    if (nextCrossing && newPosition >= nextCrossing.position && currentPos < nextCrossing.position) {
      newState.passedCrossings.add(nextCrossing.id)
    }

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
          redCrossings,
          trackWidth,
          deltaTime,
          maxSpeed,
          acceleration,
          stationStopDuration,
          crossingSlowdown
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
          blueCrossings,
          trackWidth,
          deltaTime,
          maxSpeed,
          acceleration,
          stationStopDuration,
          crossingSlowdown
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
  }, [isRunning, isFinished, maxSpeed, acceleration, redStations, blueStations, redCrossings, blueCrossings, stationStopDuration, crossingSlowdown])

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
    setRedPlacingCrossing(false)
    setBluePlacingCrossing(false)
    redRef.current = {
      position: 0,
      velocity: 0,
      finished: false,
      atStation: false,
      stationStopTime: 0,
      passedStations: new Set(),
      passedCrossings: new Set(),
      finishedTime: null
    }
    blueRef.current = {
      position: 0,
      velocity: 0,
      finished: false,
      atStation: false,
      stationStopTime: 0,
      passedStations: new Set(),
      passedCrossings: new Set(),
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
    setRedCrossings([])
    setBlueCrossings([])
    setRedCrossingCount(0)
    setBlueCrossingCount(0)
  }

  const handleAddRedStation = () => {
    setRedPlacingStation(true)
    setBluePlacingStation(false)
    setRedPlacingCrossing(false)
    setBluePlacingCrossing(false)
  }

  const handleAddBlueStation = () => {
    setBluePlacingStation(true)
    setRedPlacingStation(false)
    setRedPlacingCrossing(false)
    setBluePlacingCrossing(false)
  }

  const handleAddRedCrossing = () => {
    setRedPlacingCrossing(true)
    setBluePlacingCrossing(false)
    setRedPlacingStation(false)
    setBluePlacingStation(false)
  }

  const handleAddBlueCrossing = () => {
    setBluePlacingCrossing(true)
    setRedPlacingCrossing(false)
    setRedPlacingStation(false)
    setBluePlacingStation(false)
  }

  const handleRedTrackClick = (e) => {
    if (simulationStarted) return
    if (!redPlacingStation && !redPlacingCrossing) return

    const rect = redTrackRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left - 60 // Account for city marker offset

    // Ensure position is within valid bounds (within the actual track area)
    const minPos = 20
    const maxPos = rect.width - 120 - 20 // Subtract both city markers
    const pos = Math.max(minPos, Math.min(maxPos, clickX))

    if (redPlacingStation) {
      const newCount = redStationCount + 1
      setRedStations(prev => [...prev, {
        id: newCount,
        position: pos,
        name: `Station_${newCount}`
      }])
      setRedStationCount(newCount)
      setRedPlacingStation(false)
    } else if (redPlacingCrossing) {
      const newCount = redCrossingCount + 1
      setRedCrossings(prev => [...prev, {
        id: newCount,
        position: pos,
        name: `Crossing_${newCount}`
      }])
      setRedCrossingCount(newCount)
      setRedPlacingCrossing(false)
    }
  }

  const handleBlueTrackClick = (e) => {
    if (simulationStarted) return
    if (!bluePlacingStation && !bluePlacingCrossing) return

    const rect = blueTrackRef.current.getBoundingClientRect()
    const clickX = e.clientX - rect.left - 60 // Account for city marker offset

    // Ensure position is within valid bounds (within the actual track area)
    const minPos = 20
    const maxPos = rect.width - 120 - 20 // Subtract both city markers
    const pos = Math.max(minPos, Math.min(maxPos, clickX))

    if (bluePlacingStation) {
      const newCount = blueStationCount + 1
      setBlueStations(prev => [...prev, {
        id: newCount,
        position: pos,
        name: `Station_${newCount}`
      }])
      setBlueStationCount(newCount)
      setBluePlacingStation(false)
    } else if (bluePlacingCrossing) {
      const newCount = blueCrossingCount + 1
      setBlueCrossings(prev => [...prev, {
        id: newCount,
        position: pos,
        name: `Crossing_${newCount}`
      }])
      setBlueCrossingCount(newCount)
      setBluePlacingCrossing(false)
    }
  }

  const handleDeleteRedStation = (id) => {
    setRedStations(prev => prev.filter(s => s.id !== id))
  }

  const handleDeleteBlueStation = (id) => {
    setBlueStations(prev => prev.filter(s => s.id !== id))
  }

  const handleDeleteRedCrossing = (id) => {
    setRedCrossings(prev => prev.filter(c => c.id !== id))
  }

  const handleDeleteBlueCrossing = (id) => {
    setBlueCrossings(prev => prev.filter(c => c.id !== id))
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

  const handleCrossingDragStart = (e, track, id) => {
    if (simulationStarted) return
    e.preventDefault()
    setDraggingCrossing({ track, id })
  }

  const handleCrossingDragMove = (e) => {
    if (!draggingCrossing) return

    const trackRef = draggingCrossing.track === 'red' ? redTrackRef : blueTrackRef
    const rect = trackRef.current.getBoundingClientRect()
    const newX = e.clientX - rect.left - 60 // Account for city marker offset

    const minPos = 20
    const maxPos = rect.width - 120 - 20 // Subtract both city markers
    const clampedPos = Math.max(minPos, Math.min(maxPos, newX))

    if (draggingCrossing.track === 'red') {
      setRedCrossings(prev => prev.map(c =>
        c.id === draggingCrossing.id ? { ...c, position: clampedPos } : c
      ))
    } else {
      setBlueCrossings(prev => prev.map(c =>
        c.id === draggingCrossing.id ? { ...c, position: clampedPos } : c
      ))
    }
  }

  const handleCrossingDragEnd = () => {
    setDraggingCrossing(null)
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

  // Global mouse event listeners for crossing drag and drop
  useEffect(() => {
    if (draggingCrossing) {
      const onMouseMove = (e) => handleCrossingDragMove(e)
      const onMouseUp = () => handleCrossingDragEnd()

      document.addEventListener('mousemove', onMouseMove)
      document.addEventListener('mouseup', onMouseUp)

      return () => {
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
      }
    }
  }, [draggingCrossing])

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

  const renderCrossing = (crossing, track) => {
    const isDragging = draggingCrossing?.track === track && draggingCrossing?.id === crossing.id

    return (
      <div key={crossing.id} className="crossing-container" style={{ left: `${crossing.position}px` }}>
        <div className="crossing-label">
          <span className="crossing-name">{crossing.name}</span>
          {!simulationStarted && (
            <button
              className="crossing-delete-btn"
              onClick={() => track === 'red' ? handleDeleteRedCrossing(crossing.id) : handleDeleteBlueCrossing(crossing.id)}
              title="Delete crossing"
            >
              ×
            </button>
          )}
        </div>
        <div
          className={`crossing ${!simulationStarted ? 'crossing-draggable' : ''} ${isDragging ? 'crossing-dragging' : ''}`}
          onMouseDown={(e) => handleCrossingDragStart(e, track, crossing.id)}
        >
          <div className="crossing-bar"></div>
          <div className="crossing-bar"></div>
        </div>
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
            <div className="track-buttons">
              <button
                className="station-btn red-station-btn"
                onClick={handleAddRedStation}
                disabled={simulationStarted}
              >
                {redPlacingStation ? 'Click on track...' : 'Add Station'}
              </button>
              <button
                className="crossing-btn red-crossing-btn"
                onClick={handleAddRedCrossing}
                disabled={simulationStarted}
              >
                {redPlacingCrossing ? 'Click on track...' : 'Add Crossing'}
              </button>
            </div>
          </div>
          <div
            className={`track ${redPlacingStation || redPlacingCrossing ? 'track-placing' : ''}`}
            ref={redTrackRef}
            onClick={handleRedTrackClick}
          >
            <div className="city-marker city-start">
              <img src={pineroloImg} alt="Pinerolo" />
              <span>Pinerolo</span>
            </div>
            <div className="track-line"></div>
            {redStations.map(station => renderStation(station, 'red'))}
            {redCrossings.map(crossing => renderCrossing(crossing, 'red'))}
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
            <div className="track-buttons">
              <button
                className="station-btn blue-station-btn"
                onClick={handleAddBlueStation}
                disabled={simulationStarted}
              >
                {bluePlacingStation ? 'Click on track...' : 'Add Station'}
              </button>
              <button
                className="crossing-btn blue-crossing-btn"
                onClick={handleAddBlueCrossing}
                disabled={simulationStarted}
              >
                {bluePlacingCrossing ? 'Click on track...' : 'Add Crossing'}
              </button>
            </div>
          </div>
          <div
            className={`track ${bluePlacingStation || bluePlacingCrossing ? 'track-placing' : ''}`}
            ref={blueTrackRef}
            onClick={handleBlueTrackClick}
          >
            <div className="city-marker city-start">
              <img src={pineroloImg} alt="Pinerolo" />
              <span>Pinerolo</span>
            </div>
            <div className="track-line"></div>
            {blueStations.map(station => renderStation(station, 'blue'))}
            {blueCrossings.map(crossing => renderCrossing(crossing, 'blue'))}
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

      <div className="config-container">
        <label>Configuration:</label>
        <select
          value={selectedConfig}
          onChange={(e) => handleLoadConfig(e.target.value)}
          disabled={simulationStarted}
          className="config-select"
        >
          <option value="">-- Select --</option>
          {savedConfigs.map(config => (
            <option key={config.name} value={config.name}>{config.name}</option>
          ))}
        </select>
        <button
          onClick={handleSaveConfig}
          className="config-btn save-config-btn"
          disabled={simulationStarted}
        >
          Save
        </button>
        <button
          onClick={handleDeleteConfig}
          className="config-btn delete-config-btn"
          disabled={simulationStarted || !selectedConfig}
        >
          Delete
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
        <div className="selector-group">
          <label>Crossing Slowdown:</label>
          <div className="selector-options">
            {[10, 25, 50, 75].map((value) => (
              <button
                key={value}
                className={`selector-btn ${crossingSlowdown === value ? 'selected' : ''}`}
                onClick={() => setCrossingSlowdown(value)}
                disabled={simulationStarted}
              >
                {value}%
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
