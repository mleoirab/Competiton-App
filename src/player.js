// Anonymous player identity, remembered on THIS device (no account).
// Keyed by competition player code, so one device can be a player in several
// competitions. Each entry is { token, name }.

const KEY = 'competition_players'

function readAll() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

function writeAll(map) {
  localStorage.setItem(KEY, JSON.stringify(map))
}

const norm = (code) => String(code || '').trim().toUpperCase()

// Returns { token, name } for a competition code, or null if not joined here.
export function getPlayer(code) {
  return readAll()[norm(code)] || null
}

export function setPlayer(code, { token, name }) {
  const map = readAll()
  map[norm(code)] = { token, name }
  writeAll(map)
}

export function clearPlayer(code) {
  const map = readAll()
  delete map[norm(code)]
  writeAll(map)
}
