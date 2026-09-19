import { useRef, useState } from 'react'
import './index.css'

const POKEAPI_BASE = 'https://pokeapi.co/api/v2/pokemon'

const STAT_LABELS = {
  hp: 'HP',
  attack: 'Attack',
  defense: 'Defense',
  'special-attack': 'Sp. Atk',
  'special-defense': 'Sp. Def',
  speed: 'Speed',
}

const PHASE = {
  CLOSED: 'closed',
  OPENING: 'opening',
  FLASH: 'flash',
  GLASS: 'glass',
}

const OPEN_DELAY = 150
const DOOR_TRANSITION = 950
const FLASH_DURATION = 900

function titleCase(str) {
  return str
    .split('-')
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(' ')
}

async function fetchPokemon(query) {
  const key = query.trim().toLowerCase()
  if (!key) throw new Error('Enter a Pokémon name or ID')

  const pokemonRes = await fetch(`${POKEAPI_BASE}/${key}`)
  if (!pokemonRes.ok) throw new Error(`No Pokédex entry found for "${query}"`)
  const pokemon = await pokemonRes.json()

  const speciesRes = await fetch(pokemon.species.url)
  const species = speciesRes.ok ? await speciesRes.json() : null

  const flavorEntry = species?.flavor_text_entries.find((entry) => entry.language.name === 'en')
  const genusEntry = species?.genera.find((entry) => entry.language.name === 'en')

  const genderRate = species?.gender_rate ?? -1
  const gender =
    genderRate === -1
      ? null
      : {
          female: Math.round((genderRate / 8) * 100),
          male: Math.round(100 - (genderRate / 8) * 100),
        }

  return {
    id: String(pokemon.id).padStart(3, '0'),
    name: pokemon.name,
    category: genusEntry?.genus ?? 'Unknown Pokémon',
    types: pokemon.types.map((entry) => entry.type.name),
    height: `${(pokemon.height / 10).toFixed(1)} m`,
    weight: `${(pokemon.weight / 10).toFixed(1)} kg`,
    abilities: pokemon.abilities.map(
      (entry) => titleCase(entry.ability.name) + (entry.is_hidden ? ' (Hidden)' : '')
    ),
    gender,
    description: flavorEntry
      ? flavorEntry.flavor_text.replace(/[\n\f\r]+/g, ' ').replace(/pokémon/gi, 'Pokémon')
      : 'No Pokédex data available for this entry.',
    image:
      pokemon.sprites.other?.['official-artwork']?.front_default ??
      pokemon.sprites.front_default,
    stats: pokemon.stats.map((entry) => ({
      label: STAT_LABELS[entry.stat.name] ?? titleCase(entry.stat.name),
      value: entry.base_stat,
    })),
  }
}

function App() {
  const [phase, setPhase] = useState(PHASE.CLOSED)
  const [pokemon, setPokemon] = useState(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState('idle')
  const [showLegend, setShowLegend] = useState(false)
  const requestId = useRef(0)
  const timersRef = useRef([])

  const runSequence = (steps) => {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = steps.map(([fn, delay]) => setTimeout(fn, delay))
  }

  const openPokedex = () => {
    runSequence([
      [() => setPhase(PHASE.OPENING), OPEN_DELAY],
      [() => setPhase(PHASE.FLASH), OPEN_DELAY + DOOR_TRANSITION],
      [() => setPhase(PHASE.GLASS), OPEN_DELAY + DOOR_TRANSITION + FLASH_DURATION],
    ])
  }

  const closePokedex = () => {
    runSequence([
      [() => setPhase(PHASE.FLASH), 0],
      [
        () => {
          setPhase(PHASE.CLOSED)
          setPokemon(null)
          setQuery('')
          setStatus('idle')
        },
        FLASH_DURATION,
      ],
    ])
  }

  const submitSearch = async () => {
    if (phase !== PHASE.CLOSED) return
    const q = query.trim()
    if (!q || status === 'loading') return

    const id = ++requestId.current
    setStatus('loading')
    try {
      const data = await fetchPokemon(q)
      if (id !== requestId.current) return
      setPokemon(data)
      setStatus('idle')
      openPokedex()
    } catch {
      if (id !== requestId.current) return
      setStatus('error')
    }
  }

  const handleFormSubmit = (e) => {
    e.preventDefault()
    submitSearch()
  }

  const showShell = phase !== PHASE.GLASS
  const controlsActive = phase === PHASE.CLOSED && status !== 'loading'
  const searchReady = controlsActive && query.trim().length > 0
  const searchLoading = phase === PHASE.CLOSED && status === 'loading'
  const lensState = phase === PHASE.CLOSED ? status : 'idle'

  const resetSearch = () => {
    if (!controlsActive) return
    setQuery('')
    setStatus('idle')
  }

  const adjustId = (delta) => {
    if (!controlsActive) return
    setQuery((prev) => {
      const n = parseInt(prev.trim(), 10)
      const current = Number.isFinite(n) ? n : 0
      return String(Math.max(1, current + delta))
    })
    setStatus('idle')
  }

  return (
    <div className="stage">
      <div className="ambient-blob blob-a" />
      <div className="ambient-blob blob-b" />
      <div className="ambient-blob blob-c" />

      <div className="legend-toggle-wrap">
        <button
          type="button"
          className={`legend-toggle${showLegend ? ' legend-toggle-open' : ''}`}
          onClick={() => setShowLegend((v) => !v)}
          aria-label={showLegend ? 'Close manual' : 'Open manual'}
        >
          {showLegend ? '✕' : '?'}
        </button>
        <span className="legend-tooltip">{showLegend ? 'Close' : 'Manual'}</span>
      </div>

      {showLegend && (
        <div className="legend-panel">
          <h2>Controls</h2>
          <div className="legend-row">
            <span className="legend-dot legend-dot-screen" />
            <span>Input area</span>
          </div>
          <div className="legend-row">
            <span className="legend-dot legend-dot-blue" />
            <span>Search</span>
          </div>
          <div className="legend-row">
            <span className="legend-dot legend-dot-yellow" />
            <span>Reset</span>
          </div>
          <div className="legend-row">
            <span className="legend-dot legend-dot-cross" />
            <span>+1 / −1 Pokédex ID</span>
          </div>
        </div>
      )}

      {showShell && (
        <div className="pokedex-3d">
          <div className={`pokedex-body ${phase}`}>
            <div className="core-light" />

            <div className="pokedex-door door-left">
              <div className="hinge-strip hinge-left" />
              <div
                className={`lens-mount${lensState === 'loading' ? ' lens-scanning' : ''}${
                  lensState === 'error' ? ' lens-error' : ''
                }`}
              >
                <div className="lens-outer">
                  <div className="lens-mid">
                    <div className="lens-inner">
                      <div className="lens-shine" />
                    </div>
                  </div>
                </div>
              </div>
              <div className="indicator-lights">
                <span className="light light-red" />
                <span className="light light-yellow" />
                <span className="light light-green" />
              </div>
              <div className="vent-lines">
                <span />
                <span />
                <span />
              </div>
              <div className="screw screw-tl" />
              <div className="screw screw-bl" />

              <form className="search-overlay" onSubmit={handleFormSubmit}>
                <div className="search-row">
                  <div className="search-glass">
                    <span className="search-scan" />
                    <input
                      type="text"
                      value={query}
                      onChange={(e) => setQuery(e.target.value.slice(0, 12))}
                      placeholder="Name or ID…"
                      autoComplete="off"
                      spellCheck="false"
                      maxLength={12}
                      disabled={!controlsActive}
                      autoFocus
                    />
                  </div>
                </div>
              </form>
            </div>

            <div className="pokedex-door door-right">
              <div className="hinge-strip hinge-right" />
              <div className="screen-panel">
                <div className="screen-glass">
                  <div className="screen-scan" />
                </div>
              </div>
              <div className="speaker-grille">
                {Array.from({ length: 12 }).map((_, i) => (
                  <span key={i} />
                ))}
              </div>
              <div className="dpad">
                <button
                  type="button"
                  className="dpad-vert dpad-up"
                  onClick={() => adjustId(1)}
                  disabled={!controlsActive}
                  aria-label="Increment Pokédex ID"
                />
                <button
                  type="button"
                  className="dpad-vert dpad-down"
                  onClick={() => adjustId(-1)}
                  disabled={!controlsActive}
                  aria-label="Decrement Pokédex ID"
                />
                <span className="dpad-horiz" />
              </div>
              <div className="bottom-buttons">
                <button
                  type="button"
                  className="btn-round btn-a btn-reset"
                  onClick={resetSearch}
                  disabled={!controlsActive}
                  aria-label="Reset search"
                />
                <button
                  type="button"
                  className={`btn-round btn-b btn-search${searchReady ? ' btn-search-ready' : ''}${
                    searchLoading ? ' btn-search-loading' : ''
                  }`}
                  onClick={submitSearch}
                  disabled={!controlsActive}
                  aria-label="Search"
                />
              </div>
              <div className="screw screw-tr" />
              <div className="screw screw-br" />
            </div>
          </div>
        </div>
      )}

      {phase === PHASE.FLASH && <div className="flash-burst" />}

      {phase === PHASE.GLASS && pokemon && (
        <div className="glass-pokedex">
          <div className="glass-panel left-panel">
            <div className="screen-frame">
              <img src={pokemon.image} alt={pokemon.name} className="pokemon-img" />
              <div className="scan-line" />
              <div className="frame-corner corner-tl" />
              <div className="frame-corner corner-tr" />
              <div className="frame-corner corner-bl" />
              <div className="frame-corner corner-br" />
            </div>
            <div className="dex-id-row">
              <span className="dex-hash">No.</span>
              <span className="dex-id">{pokemon.id}</span>
            </div>
            <div className="mini-controls">
              <span className="mini-light" />
              <span className="mini-light" />
              <span className="mini-light" />
            </div>
          </div>

          <div className="glass-panel right-panel">
            <header className="dex-header">
              <h1>{pokemon.name}</h1>
              <span className="category">{pokemon.category}</span>
              <div className="types">
                {pokemon.types.map((type) => (
                  <span key={type} className={`type-badge type-${type}`}>
                    {type}
                  </span>
                ))}
              </div>
            </header>

            <p className="dex-description">{pokemon.description}</p>

            <div className="info-grid">
              <div className="info-item">
                <label>Height</label>
                <span>{pokemon.height}</span>
              </div>
              <div className="info-item">
                <label>Weight</label>
                <span>{pokemon.weight}</span>
              </div>
              <div className="info-item">
                <label>Abilities</label>
                <span>{pokemon.abilities.join(', ')}</span>
              </div>
              <div className="info-item">
                <label>Gender</label>
                {pokemon.gender ? (
                  <span className="gender-ratio">
                    <span className="male">♂ {pokemon.gender.male}%</span>
                    <span className="female">♀ {pokemon.gender.female}%</span>
                  </span>
                ) : (
                  <span>Genderless</span>
                )}
              </div>
            </div>

            <div className="stats">
              {pokemon.stats.map((stat) => (
                <div className="stat-row" key={stat.label}>
                  <span className="stat-label">{stat.label}</span>
                  <div className="stat-bar">
                    <div
                      className="stat-fill"
                      style={{ width: `${Math.min(100, (stat.value / 200) * 100)}%` }}
                    />
                  </div>
                  <span className="stat-value">{stat.value}</span>
                </div>
              ))}
            </div>

            <button className="rescan-btn" onClick={closePokedex}>
              ⟳ Rescan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App
