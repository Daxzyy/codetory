const https = require('https')

function get(url) {
  return new Promise(function(resolve, reject) {
    const u = new URL(url)
    https.get({ hostname: u.hostname, path: u.pathname + u.search, headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' } }, function(res) {
      let d = ''
      res.on('data', function(c) { d += c })
      res.on('end', function() { try { resolve(JSON.parse(d)) } catch(e) { reject(e) } })
    }).on('error', reject)
  })
}

function post(url, body) {
  return new Promise(function(resolve, reject) {
    const u = new URL(url)
    const payload = JSON.stringify(body)
    const req = https.request({ hostname: u.hostname, path: u.pathname + u.search, method: 'POST', headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) } }, function(res) {
      let d = ''
      res.on('data', function(c) { d += c })
      res.on('end', function() { try { resolve(JSON.parse(d)) } catch(e) { reject(e) } })
    })
    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

async function robloxStalk(username) {
  try {
    const userData = await post('https://users.roblox.com/v1/usernames/users', { usernames: [username], excludeBannedUsers: false })

    if (!userData || !userData.data || !userData.data.length) {
      return { success: false, error: 'User "' + username + '" not found' }
    }

    const userId = userData.data[0].id

    const [profile, presence, friends, followers, following, games, badges, groups, avatar] = await Promise.all([
      get('https://users.roblox.com/v1/users/' + userId).catch(function() { return null }),
      post('https://presence.roblox.com/v1/presence/users', { userIds: [userId] }).catch(function() { return null }),
      get('https://friends.roblox.com/v1/users/' + userId + '/friends/count').catch(function() { return null }),
      get('https://friends.roblox.com/v1/users/' + userId + '/followers/count').catch(function() { return null }),
      get('https://friends.roblox.com/v1/users/' + userId + '/followings/count').catch(function() { return null }),
      get('https://games.roblox.com/v2/users/' + userId + '/games?limit=50&sortOrder=Asc').catch(function() { return null }),
      get('https://badges.roblox.com/v1/users/' + userId + '/badges?limit=100&sortOrder=Desc').catch(function() { return null }),
      get('https://groups.roblox.com/v1/users/' + userId + '/groups/roles').catch(function() { return null }),
      get('https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=' + userId + '&size=420x420&format=Png&isCircular=false').catch(function() { return null })
    ])

    const p = (presence && presence.userPresences && presence.userPresences[0]) || {}
    const pd = profile || {}
    const statusMap = { 0: 'Offline', 1: 'Online (Website)', 2: 'In-Game', 3: 'In Studio' }
    const gamesData = (games && games.data) || []
    const badgesData = (badges && badges.data) || []
    const groupsData = (groups && groups.data) || []

    return {
      success: true,
      results: {
        id: userId,
        username: pd.name || username,
        displayName: pd.displayName || null,
        description: pd.description || null,
        created: pd.created || null,
        isBanned: pd.isBanned || false,
        avatar: (avatar && avatar.data && avatar.data[0] && avatar.data[0].imageUrl) || null,
        presence: {
          status: statusMap[p.userPresenceType] || 'Unknown',
          lastOnline: p.lastOnline || null,
          gameId: p.gameId || null,
          gameName: p.lastLocation || null,
          placeId: p.placeId || null
        },
        social: {
          friends: (friends && friends.count) || 0,
          followers: (followers && followers.count) || 0,
          following: (following && following.count) || 0
        },
        games: {
          total: gamesData.length,
          list: gamesData.map(function(g) {
            return { id: g.id, name: g.name, description: g.description || null, playing: g.playing || 0, visits: g.visits || 0, created: g.created || null, updated: g.updated || null }
          })
        },
        badges: {
          total: badgesData.length,
          list: badgesData.map(function(b) {
            return { id: b.id, name: b.name, description: b.description || null, enabled: b.enabled, awarded: (b.statistics && b.statistics.awarder && b.statistics.awarder.Count) || 0 }
          })
        },
        groups: {
          total: groupsData.length,
          list: groupsData.map(function(g) {
            return { id: (g.group && g.group.id) || null, name: (g.group && g.group.name) || null, role: (g.role && g.role.name) || null, rank: (g.role && g.role.rank) || null }
          })
        }
      }
    }
  } catch (err) {
    return { success: false, error: err.message }
  }
}

const input = process.argv[2] || 'ynlvaealuht'
robloxStalk(input).then(function(r) { console.log(JSON.stringify(r, null, 2)) })