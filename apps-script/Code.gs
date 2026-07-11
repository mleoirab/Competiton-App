/**
 * Competition Manager — Google Apps Script backend.
 *
 * MODEL (Kahoot-style):
 *   - HOSTS have accounts (username + password). Creating a competition makes
 *     the host its PRIMARY admin. Each competition has two codes:
 *       • playerCode — share with players (used in the app URL /c/<playerCode>)
 *       • adminCode  — share with co-admins; entering it makes an account a
 *                      SECONDARY admin of that competition.
 *   - PLAYERS have NO account. They join with playerCode + a display name and
 *     are remembered on their device by a player token. Joining auto-assigns
 *     them to the smallest team. A player exists only inside one competition.
 *
 * Tabs (created by initialize()):
 *   Users, Sessions, Competitions, Admins, Players, Teams, Games, Fixtures
 *
 * SETUP (once): see apps-script/SETUP.md — run initialize(), deploy as a Web
 * app (Execute as: Me, Access: Anyone), copy the /exec URL into .env.
 */

var SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 14; // host login tokens last 14 days

var SHEETS = {
  Users:        ['id', 'username', 'salt', 'passwordHash', 'createdAt'],
  Sessions:     ['token', 'userId', 'expiresAt'],
  Competitions: ['id', 'name', 'playerCode', 'adminCode', 'ownerId', 'createdAt'],
  Admins:       ['id', 'userId', 'competitionId', 'role', 'createdAt'],   // role: primary | secondary
  Players:      ['id', 'competitionId', 'name', 'teamId', 'status', 'token', 'createdAt'],
  Teams:        ['id', 'competitionId', 'name', 'createdAt'],
  Games:        ['id', 'competitionId', 'name', 'description', 'createdAt'],
  // participants = JSON: [{ "teamId": "t1", "score": "" }, ...] — any number of teams.
  Fixtures:     ['id', 'competitionId', 'gameId', 'date', 'venue', 'participants', 'status', 'createdAt'],
};

// ===== HTTP entry points ====================================================

function doGet(e)  { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  var payload = {};
  try {
    if (e && e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else if (e && e.parameter) {
      payload = e.parameter;
      if (payload.body) payload = JSON.parse(payload.body);
    }
  } catch (err) {
    return json({ ok: false, error: 'Bad request body' });
  }
  try {
    return json({ ok: true, data: route(payload.action, payload) });
  } catch (err) {
    return json({ ok: false, error: (err && err.message) || String(err) });
  }
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== Router ===============================================================

function route(action, p) {
  switch (action) {
    // --- host accounts ---
    case 'signup':            return signup(p);
    case 'login':             return login(p);
    case 'getMe':             return getMe(p);

    // --- competitions / joining ---
    case 'createCompetition': return createCompetition(p);
    case 'claimAdmin':        return claimAdmin(p);         // account + admin code -> secondary admin
    case 'joinAsPlayer':      return joinAsPlayer(p);       // no account: code + name
    case 'getCompetition':    return getCompetition(p);     // public read by player code
    case 'deleteCompetition': return deleteCompetition(p);  // primary only

    // --- admin management (primary only) ---
    case 'listAdmins':        return listAdmins(p);
    case 'removeAdmin':       return removeAdmin(p);

    // --- competition management (any admin of that competition) ---
    case 'createTeam':        return createTeam(p);
    case 'deleteTeam':        return deleteTeam(p);
    case 'assignPlayer':      return assignPlayer(p);
    case 'setPlayerStatus':   return setPlayerStatus(p);
    case 'removePlayer':      return removePlayer(p);
    case 'createGame':        return createGame(p);
    case 'deleteGame':        return deleteGame(p);
    case 'createFixture':     return createFixture(p);
    case 'updateFixture':     return updateFixture(p);
    case 'deleteFixture':     return deleteFixture(p);

    default: throw new Error('Unknown action: ' + action);
  }
}

// ===== Host account auth ====================================================

function signup(p) {
  var username = String(p.username || '').trim();
  var password = String(p.password || '');
  if (username.length < 3) throw new Error('Username must be at least 3 characters');
  if (password.length < 4) throw new Error('Password must be at least 4 characters');
  if (readRows('Users').filter(function (u) { return String(u.username).toLowerCase() === username.toLowerCase(); })[0]) {
    throw new Error('That username is taken');
  }
  var salt = Utilities.getUuid();
  var id = newId('u');
  appendRow('Users', { id: id, username: username, salt: salt, passwordHash: hash(password, salt), createdAt: nowMs() });
  return startSession({ id: id, username: username });
}

function login(p) {
  var user = String(p.username || '').trim().toLowerCase();
  var match = readRows('Users').filter(function (u) { return String(u.username).toLowerCase() === user; })[0];
  if (!match || hash(p.password, match.salt) !== match.passwordHash) {
    throw new Error('Invalid username or password');
  }
  return startSession(match);
}

function startSession(user) {
  var token = Utilities.getUuid();
  appendRow('Sessions', { token: token, userId: user.id, expiresAt: nowMs() + SESSION_TTL_MS });
  pruneSessions();
  return { token: token, user: { id: user.id, username: user.username } };
}

function currentUser(p) {
  if (!p.token) throw new Error('Please log in');
  var s = readRows('Sessions').filter(function (x) { return x.token === p.token; })[0];
  if (!s || Number(s.expiresAt) < nowMs()) throw new Error('Session expired, please log in again');
  var user = readRows('Users').filter(function (u) { return u.id === s.userId; })[0];
  if (!user) throw new Error('Account no longer exists');
  return user;
}

function hash(password, salt) {
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(salt) + '::' + String(password));
  return bytes.map(function (b) { return ('0' + (b & 0xff).toString(16)).slice(-2); }).join('');
}

function pruneSessions() {
  var now = nowMs();
  readRows('Sessions').forEach(function (r) { if (Number(r.expiresAt) < now) deleteById('Sessions', 'token', r.token); });
}

// ===== Me: account + competitions I administer ==============================

function getMe(p) {
  var user = currentUser(p);
  var comps = {}; readRows('Competitions').forEach(function (c) { comps[c.id] = c; });
  var mine = readRows('Admins')
    .filter(function (a) { return String(a.userId) === String(user.id); })
    .map(function (a) {
      var c = comps[a.competitionId];
      if (!c) return null;
      return { competitionId: c.id, name: c.name, playerCode: c.playerCode, adminCode: c.adminCode, role: a.role };
    })
    .filter(function (x) { return x; });
  return { user: { id: user.id, username: user.username }, competitions: mine };
}

// ===== Competitions =========================================================

function createCompetition(p) {
  var user = currentUser(p);
  var name = String(p.name || '').trim();
  if (!name) throw new Error('Competition name is required');
  var taken = {};
  readRows('Competitions').forEach(function (c) {
    taken[String(c.playerCode).toUpperCase()] = true;
    taken[String(c.adminCode).toUpperCase()] = true;
  });
  var playerCode = uniqueCode(taken); taken[playerCode] = true;
  var adminCode = uniqueCode(taken);
  var id = newId('c');
  appendRow('Competitions', { id: id, name: name, playerCode: playerCode, adminCode: adminCode, ownerId: user.id, createdAt: nowMs() });
  appendRow('Admins', { id: newId('a'), userId: user.id, competitionId: id, role: 'primary', createdAt: nowMs() });
  return { id: id, name: name, playerCode: playerCode, adminCode: adminCode };
}

function claimAdmin(p) {
  var user = currentUser(p);
  var code = String(p.adminCode || '').trim().toUpperCase();
  if (!code) throw new Error('Enter an admin code');
  var comp = readRows('Competitions').filter(function (c) { return String(c.adminCode).toUpperCase() === code; })[0];
  if (!comp) throw new Error('No competition found with that admin code');
  if (p.competitionId && String(comp.id) !== String(p.competitionId)) {
    throw new Error('That admin code isn’t for this competition');
  }
  var already = readRows('Admins').filter(function (a) {
    return String(a.userId) === String(user.id) && String(a.competitionId) === String(comp.id);
  })[0];
  if (!already) {
    appendRow('Admins', { id: newId('a'), userId: user.id, competitionId: comp.id, role: 'secondary', createdAt: nowMs() });
  }
  return { competitionId: comp.id, name: comp.name, playerCode: comp.playerCode };
}

function joinAsPlayer(p) {
  var code = String(p.code || '').trim().toUpperCase();
  var name = String(p.name || '').trim();
  if (!code) throw new Error('Enter a competition code');
  if (!name) throw new Error('Enter a display name');
  var comp = readRows('Competitions').filter(function (c) { return String(c.playerCode).toUpperCase() === code; })[0];
  if (!comp) throw new Error('No competition found with that code');
  var clash = readRows('Players').filter(function (pl) {
    return String(pl.competitionId) === String(comp.id) && String(pl.name).toLowerCase() === name.toLowerCase();
  })[0];
  if (clash) throw new Error('That name is taken in this competition — pick another');

  var teamId = smallestTeamId(comp.id);
  var token = Utilities.getUuid();
  appendRow('Players', {
    id: newId('p'), competitionId: comp.id, name: name, teamId: teamId,
    status: teamId ? 'assigned' : 'pending', token: token, createdAt: nowMs(),
  });
  var teamName = teamId ? nameOfTeam(teamId) : '';
  return { code: comp.playerCode, name: name, playerToken: token, competitionName: comp.name, teamId: teamId, teamName: teamName };
}

// Public read of one competition by player code. Optional account token and/or
// player token identify the viewer (admin vs a specific player).
function getCompetition(p) {
  var code = String(p.code || '').trim().toUpperCase();
  var comp = readRows('Competitions').filter(function (c) { return String(c.playerCode).toUpperCase() === code; })[0];
  if (!comp) throw new Error('No competition found with that code');

  // Viewer: admin? (via account token) / which player? (via player token)
  var isAdmin = false, adminRole = null;
  if (p.token) {
    try {
      var user = currentUser(p);
      var a = readRows('Admins').filter(function (r) {
        return String(r.userId) === String(user.id) && String(r.competitionId) === String(comp.id);
      })[0];
      if (a) { isAdmin = true; adminRole = a.role; }
    } catch (e) { /* not logged in — public viewer */ }
  }

  var teams = readRows('Teams').filter(byComp(comp.id));
  var games = readRows('Games').filter(byComp(comp.id));
  var gameName = {}; games.forEach(function (g) { gameName[g.id] = g.name; });
  var fixtures = readRows('Fixtures').filter(byComp(comp.id)).map(function (f) {
    return {
      id: f.id, competitionId: f.competitionId, gameId: f.gameId, gameName: gameName[f.gameId] || '',
      date: f.date, venue: f.venue, status: f.status, participants: parseParticipants(f.participants),
    };
  });
  var playerRows = readRows('Players').filter(byComp(comp.id));

  var me = null;
  if (p.playerToken) {
    var mine = playerRows.filter(function (pl) { return pl.token === p.playerToken; })[0];
    if (mine) me = { playerId: mine.id, name: mine.name, teamId: mine.teamId || '', status: mine.status, teamName: mine.teamId ? nameOfTeam(mine.teamId) : '' };
  }

  // Teams with rosters, and a flat players list (for admins).
  var teamById = {}; teams.forEach(function (t) { t.players = []; teamById[t.id] = t; });
  var players = playerRows.map(function (pl) {
    var row = { id: pl.id, name: pl.name, teamId: pl.teamId || '', status: pl.status };
    if (pl.teamId && teamById[pl.teamId]) teamById[pl.teamId].players.push(row);
    return row;
  });

  // Standings: raw fixture score adds to each team's total.
  var totals = {};
  teams.forEach(function (t) { totals[t.id] = { teamId: t.id, name: t.name, points: 0, games: 0 }; });
  fixtures.forEach(function (f) {
    f.participants.forEach(function (part) {
      var hasScore = part.score !== '' && part.score !== null && !isNaN(Number(part.score));
      if (totals[part.teamId] && hasScore) { totals[part.teamId].points += Number(part.score); totals[part.teamId].games += 1; }
    });
  });
  var standings = Object.keys(totals).map(function (k) { return totals[k]; });
  standings.sort(function (a, b) { return b.points - a.points || a.name.localeCompare(b.name); });
  var rank = 0, prevPts = null;
  standings.forEach(function (row, i) { if (row.points !== prevPts) { rank = i + 1; prevPts = row.points; } row.rank = rank; });

  return {
    competition: { id: comp.id, name: comp.name, playerCode: comp.playerCode, adminCode: isAdmin && adminRole === 'primary' ? comp.adminCode : null },
    isAdmin: isAdmin, adminRole: adminRole, me: me,
    teams: teams, games: games, fixtures: fixtures, players: players, standings: standings,
  };
}

function deleteCompetition(p) {
  var ctx = requirePrimary(p, p.competitionId);
  var id = ctx.comp.id;
  ['Fixtures', 'Games', 'Teams', 'Players', 'Admins'].forEach(function (tab) {
    readRows(tab).forEach(function (r) { if (String(r.competitionId) === String(id)) deleteById(tab, 'id', r.id); });
  });
  deleteById('Competitions', 'id', id);
  return { ok: true };
}

// ===== Admin management (primary only) ======================================

function listAdmins(p) {
  var ctx = requirePrimary(p, p.competitionId);
  var users = {}; readRows('Users').forEach(function (u) { users[u.id] = u; });
  return readRows('Admins')
    .filter(function (a) { return String(a.competitionId) === String(ctx.comp.id); })
    .map(function (a) { return { id: a.id, username: users[a.userId] ? users[a.userId].username : '(unknown)', role: a.role }; });
}

function removeAdmin(p) {
  var ctx = requirePrimary(p, p.competitionId);
  var target = readRows('Admins').filter(function (a) { return String(a.id) === String(p.adminId); })[0];
  if (!target || String(target.competitionId) !== String(ctx.comp.id)) throw new Error('Admin not found');
  if (target.role === 'primary') throw new Error('Cannot remove the primary admin');
  deleteById('Admins', 'id', p.adminId);
  return { ok: true };
}

// ===== Teams ================================================================

function createTeam(p) {
  var ctx = requireAdmin(p, p.competitionId);
  var name = String(p.name || '').trim();
  if (!name) throw new Error('Team name is required');
  var id = newId('t');
  appendRow('Teams', { id: id, competitionId: ctx.comp.id, name: name, createdAt: nowMs() });
  assignPendingPlayers(ctx.comp.id);
  return { id: id };
}

function deleteTeam(p) {
  var ctx = requireAdmin(p, p.competitionId);
  readRows('Players').forEach(function (pl) {
    if (String(pl.competitionId) === String(ctx.comp.id) && String(pl.teamId) === String(p.teamId)) {
      updateById('Players', 'id', pl.id, { teamId: '', status: 'pending' });
    }
  });
  deleteById('Teams', 'id', p.teamId);
  assignPendingPlayers(ctx.comp.id);
  return { ok: true };
}

// ===== Players ==============================================================

function assignPlayer(p) {
  requireAdmin(p, p.competitionId);
  updateById('Players', 'id', p.playerId, { teamId: p.teamId || '', status: p.teamId ? 'assigned' : 'pending' });
  return { ok: true };
}

function setPlayerStatus(p) {
  requireAdmin(p, p.competitionId);
  updateById('Players', 'id', p.playerId, { status: p.status });
  return { ok: true };
}

function removePlayer(p) {
  requireAdmin(p, p.competitionId);
  deleteById('Players', 'id', p.playerId);
  return { ok: true };
}

// ===== Games ================================================================

function createGame(p) {
  var ctx = requireAdmin(p, p.competitionId);
  var name = String(p.name || '').trim();
  if (!name) throw new Error('Game name is required');
  var id = newId('g');
  appendRow('Games', { id: id, competitionId: ctx.comp.id, name: name, description: String(p.description || ''), createdAt: nowMs() });
  return { id: id };
}

function deleteGame(p) {
  requireAdmin(p, p.competitionId);
  readRows('Fixtures').forEach(function (f) {
    if (String(f.gameId) === String(p.gameId)) updateById('Fixtures', 'id', f.id, { gameId: '' });
  });
  deleteById('Games', 'id', p.gameId);
  return { ok: true };
}

// ===== Fixtures =============================================================

function createFixture(p) {
  var ctx = requireAdmin(p, p.competitionId);
  var teamIds = (p.teamIds || []).filter(function (t) { return t; });
  if (teamIds.length < 2) throw new Error('Select at least two teams');
  var participants = teamIds.map(function (tid) { return { teamId: tid, score: '' }; });
  var id = newId('f');
  appendRow('Fixtures', {
    id: id, competitionId: ctx.comp.id, gameId: String(p.gameId || ''),
    date: String(p.date || ''), venue: String(p.venue || ''),
    participants: JSON.stringify(participants), status: 'scheduled', createdAt: nowMs(),
  });
  return { id: id };
}

function updateFixture(p) {
  requireAdmin(p, p.competitionId);
  var patch = {};
  ['date', 'venue', 'status', 'gameId'].forEach(function (k) { if (p[k] !== undefined) patch[k] = p[k]; });
  if (p.scores) {
    var fx = readRows('Fixtures').filter(function (f) { return String(f.id) === String(p.fixtureId); })[0];
    if (!fx) throw new Error('Fixture not found');
    var byTeam = {};
    (p.scores || []).forEach(function (s) { byTeam[s.teamId] = s.score; });
    var merged = parseParticipants(fx.participants).map(function (part) {
      return { teamId: part.teamId, score: byTeam[part.teamId] !== undefined ? byTeam[part.teamId] : part.score };
    });
    patch.participants = JSON.stringify(merged);
  }
  updateById('Fixtures', 'id', p.fixtureId, patch);
  return { ok: true };
}

function deleteFixture(p) {
  requireAdmin(p, p.competitionId);
  deleteById('Fixtures', 'id', p.fixtureId);
  return { ok: true };
}

function parseParticipants(raw) {
  if (!raw) return [];
  try { var arr = JSON.parse(raw); return Array.isArray(arr) ? arr : []; } catch (e) { return []; }
}

// ===== Auth / competition helpers ===========================================

function compById(id) {
  var c = readRows('Competitions').filter(function (x) { return String(x.id) === String(id); })[0];
  if (!c) throw new Error('Competition not found');
  return c;
}

// Any admin (primary or secondary) of the competition.
function requireAdmin(p, competitionId) {
  var user = currentUser(p);
  var comp = compById(competitionId);
  var a = readRows('Admins').filter(function (r) {
    return String(r.userId) === String(user.id) && String(r.competitionId) === String(comp.id);
  })[0];
  if (!a) throw new Error('Only an admin of this competition can do that');
  return { user: user, comp: comp, role: a.role };
}

function requirePrimary(p, competitionId) {
  var ctx = requireAdmin(p, competitionId);
  if (ctx.role !== 'primary') throw new Error('Only the primary admin can do that');
  return ctx;
}

function byComp(competitionId) {
  return function (row) { return String(row.competitionId) === String(competitionId); };
}

function nameOfTeam(teamId) {
  var t = readRows('Teams').filter(function (x) { return String(x.id) === String(teamId); })[0];
  return t ? t.name : '';
}

// Team with the fewest players in a competition ('' if no teams).
function smallestTeamId(competitionId) {
  var teams = readRows('Teams').filter(byComp(competitionId));
  if (!teams.length) return '';
  var counts = {}; teams.forEach(function (t) { counts[t.id] = 0; });
  readRows('Players').forEach(function (pl) {
    if (String(pl.competitionId) === String(competitionId) && counts[pl.teamId] !== undefined) counts[pl.teamId] += 1;
  });
  var best = teams[0].id, bestN = counts[teams[0].id];
  teams.forEach(function (t) { if (counts[t.id] < bestN) { best = t.id; bestN = counts[t.id]; } });
  return best;
}

function assignPendingPlayers(competitionId) {
  readRows('Players').filter(function (pl) {
    return String(pl.competitionId) === String(competitionId) && !pl.teamId;
  }).forEach(function (pl) {
    var teamId = smallestTeamId(competitionId);
    if (teamId) updateById('Players', 'id', pl.id, { teamId: teamId, status: 'assigned' });
  });
}

function uniqueCode(taken) {
  var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous 0/O/1/I
  for (var attempt = 0; attempt < 60; attempt++) {
    var uuid = Utilities.getUuid().replace(/-/g, '').toUpperCase();
    var code = '';
    for (var i = 0; i < 6; i++) code += alphabet.charAt(parseInt(uuid.charAt(i), 16) % alphabet.length);
    if (!taken || !taken[code]) return code;
  }
  throw new Error('Could not generate a unique code — try again');
}

// ===== Sheet helpers ========================================================

function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function sheetOf(name) {
  var sheet = ss().getSheetByName(name);
  if (!sheet) throw new Error('Sheet "' + name + '" is missing. Run initialize() again.');
  return sheet;
}

function readRows(name) {
  var sheet = sheetOf(name);
  var values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  var headers = values[0];
  var rows = [];
  for (var i = 1; i < values.length; i++) {
    var obj = {}, blank = true;
    for (var c = 0; c < headers.length; c++) {
      obj[headers[c]] = values[i][c];
      if (values[i][c] !== '' && values[i][c] !== null) blank = false;
    }
    if (!blank) rows.push(obj);
  }
  return rows;
}

function appendRow(name, obj) {
  var sheet = sheetOf(name);
  var row = SHEETS[name].map(function (h) { return obj[h] !== undefined ? obj[h] : ''; });
  sheet.appendRow(row);
}

function updateById(name, idCol, idVal, patch) {
  var sheet = sheetOf(name);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idIdx = headers.indexOf(idCol);
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][idIdx]) === String(idVal)) {
      Object.keys(patch).forEach(function (k) {
        var c = headers.indexOf(k);
        if (c >= 0) sheet.getRange(i + 1, c + 1).setValue(patch[k]);
      });
      return true;
    }
  }
  return false;
}

function deleteById(name, idCol, idVal) {
  var sheet = sheetOf(name);
  var values = sheet.getDataRange().getValues();
  var headers = values[0];
  var idIdx = headers.indexOf(idCol);
  for (var i = values.length - 1; i >= 1; i--) {
    if (String(values[i][idIdx]) === String(idVal)) sheet.deleteRow(i + 1);
  }
}

function newId(prefix) { return prefix + '_' + nowMs().toString(36) + Utilities.getUuid().slice(0, 6); }
function nowMs() { return new Date().getTime(); }

// ===== One-time setup =======================================================

/**
 * Run from the Apps Script editor (select initialize, click Run).
 * Creates every tab and verifies its header row. Tabs with stale headers are
 * reset to the correct schema (this clears their rows — intended). Removes
 * retired tabs. No admin is seeded — sign up in the app as a host.
 */
function initialize() {
  var book = ss();

  // Re-anchor the "active sheet" to a real tab. If a tab was deleted while it
  // was selected, the spreadsheet's active-sheet pointer goes stale and
  // insertSheet() (which inserts relative to it) throws "Sheet <id> not found".
  var sheets = book.getSheets();
  if (sheets.length) book.setActiveSheet(sheets[0]);

  // Ensure every required tab exists with the correct headers. Tabs with stale
  // headers are reset to the right columns (this clears their rows — intended).
  // We don't delete any sheets; leftover tabs (Sheet1, Config, Memberships,
  // Scores) are harmless — the app only reads the tabs it needs.
  Object.keys(SHEETS).forEach(function (name) {
    var want = SHEETS[name];
    var sheet = book.getSheetByName(name);
    // Insert at an explicit position so it never references the active sheet.
    if (!sheet) sheet = book.insertSheet(name, book.getSheets().length);
    var header = sheet.getLastRow() >= 1 ? sheet.getRange(1, 1, 1, want.length).getValues()[0] : [];
    var ok = want.every(function (h, i) { return header[i] === h; });
    if (!ok) {
      sheet.clear();
      sheet.getRange(1, 1, 1, want.length).setValues([want]);
      sheet.setFrozenRows(1);
    }
  });

  Logger.log('Initialize complete — schema verified. Now deploy as a Web app (see SETUP.md).');
}
