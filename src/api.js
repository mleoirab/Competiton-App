// Thin client for the Google Apps Script backend.
// Every call is a POST with a JSON body { action, ...payload }.
// We send Content-Type text/plain to keep it a "simple" CORS request so the
// browser doesn't send a preflight (Apps Script doesn't handle preflight well).

const API_URL = import.meta.env.VITE_API_URL

export class ApiError extends Error {}

export async function call(action, payload = {}) {
  if (!API_URL) {
    throw new ApiError(
      'VITE_API_URL is not set. Copy .env.example to .env and paste your Apps Script URL.'
    )
  }
  let res
  try {
    res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action, ...payload }),
      redirect: 'follow',
    })
  } catch (e) {
    throw new ApiError('Network error — check your internet and the API URL.')
  }
  let body
  try {
    body = await res.json()
  } catch (e) {
    throw new ApiError('The API did not return JSON. Is the Web App deployed with access "Anyone"?')
  }
  if (!body.ok) throw new ApiError(body.error || 'Request failed')
  return body.data
}

export const api = {
  // host accounts
  signup: (username, password) => call('signup', { username, password }),
  login: (username, password) => call('login', { username, password }),
  getMe: (token) => call('getMe', { token }),

  // competitions / joining
  createCompetition: (token, name) => call('createCompetition', { token, name }),
  claimAdmin: (token, adminCode, competitionId) => call('claimAdmin', { token, adminCode, competitionId }),
  joinAsPlayer: (code, name) => call('joinAsPlayer', { code, name }),
  // viewer identity is optional: account token (admin) and/or player token
  getCompetition: (code, token, playerToken) => call('getCompetition', { code, token, playerToken }),
  deleteCompetition: (token, competitionId) => call('deleteCompetition', { token, competitionId }),

  // admin management (primary only)
  listAdmins: (token, competitionId) => call('listAdmins', { token, competitionId }),
  removeAdmin: (token, competitionId, adminId) => call('removeAdmin', { token, competitionId, adminId }),
  setAdminCode: (token, competitionId, adminCode) => call('setAdminCode', { token, competitionId, adminCode }),

  // competition management (any admin)
  // team: { name, color, mascot }
  createTeam: (token, competitionId, team) => call('createTeam', { token, competitionId, ...team }),
  updateTeam: (token, competitionId, teamId, patch) => call('updateTeam', { token, competitionId, teamId, ...patch }),
  deleteTeam: (token, competitionId, teamId) => call('deleteTeam', { token, competitionId, teamId }),
  assignPlayer: (token, competitionId, playerId, teamId) =>
    call('assignPlayer', { token, competitionId, playerId, teamId }),
  setPlayerStatus: (token, competitionId, playerId, status) =>
    call('setPlayerStatus', { token, competitionId, playerId, status }),
  removePlayer: (token, competitionId, playerId) =>
    call('removePlayer', { token, competitionId, playerId }),
  createGame: (token, competitionId, game) => call('createGame', { token, competitionId, ...game }),
  deleteGame: (token, competitionId, gameId) => call('deleteGame', { token, competitionId, gameId }),
  // fixture: { teamIds: [...], date?, venue?, gameId? }
  createFixture: (token, competitionId, fixture) =>
    call('createFixture', { token, competitionId, ...fixture }),
  // patch: { fixtureId, scores?: [{teamId, score}], status?, date?, venue? }
  updateFixture: (token, competitionId, patch) =>
    call('updateFixture', { token, competitionId, ...patch }),
  deleteFixture: (token, competitionId, fixtureId) =>
    call('deleteFixture', { token, competitionId, fixtureId }),
}
