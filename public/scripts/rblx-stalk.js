const https = require('https')

const APIS = {
  users: 'users.roblox.com',
  games: 'games.roblox.com',
  badges: 'badges.roblox.com',
  friends: 'friends.roblox.com',
  presence: 'presence.roblox.com',
  avatar: 'thumbnails.roblox.com',
  groups: 'groups.roblox.com'
}

function get(hostname, path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname,
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json'
      }
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('Invalid JSON response'))
        }
      })
    })

    req.on('error', reject)
    req.end()
  })
}

function post(hostname, path, body) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(body)

    const req = https.request({
      hostname,
      path,
      method: 'POST',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = ''
      res.on('data', c => data += c)
      res.on('end', () => {
        try {
          resolve(JSON.parse(data))
        } catch {
          reject(new Error('Invalid JSON response'))
        }
      })
    })

    req.on('error', reject)
    req.write(payload)
    req.end()
  })
}

async function getUserId(username) {
  const data = await post(
    APIS.users,
    '/v1/usernames/users',
    {
      usernames: [username],
      excludeBannedUsers: false
    }
  )

  if (!data.data || !data.data.length) {
    throw new Error(`User "${username}" not found`)
  }

  return data.data[0]
}

async function getProfile(userId) {
  return await get(APIS.users, `/v1/users/${userId}`)
}

async function getPresence(userId) {
  const data = await post(
    APIS.presence,
    '/v1/presence/users',
    { userIds: [userId] }
  )

  const p = data.userPresences?.[0] || {}

  const statusMap = {
    0: 'Offline',
    1: 'Online (Website)',
    2: 'In-Game',
    3: 'In Studio'
  }

  return {
    status: statusMap[p.userPresenceType] || 'Unknown',
    lastOnline: p.lastOnline || null,
    gameId: p.gameId || null,
    gameName: p.lastLocation || null,
    placeId: p.placeId || null
  }
}

async function getFriends(userId) {
  const friends = await get(
    APIS.friends,
    `/v1/users/${userId}/friends/count`
  )

  const followers = await get(
    APIS.friends,
    `/v1/users/${userId}/followers/count`
  )

  const following = await get(
    APIS.friends,
    `/v1/users/${userId}/followings/count`
  )

  return {
    friends: friends.count || 0,
    followers: followers.count || 0,
    following: following.count || 0
  }
}

async function getGames(userId) {
  const data = await get(
    APIS.games,
    `/v2/users/${userId}/games?limit=50&sortOrder=Asc`
  )

  return (data.data || []).map(g => ({
    id: g.id,
    name: g.name,
    description: g.description || null,
    playing: g.playing || 0,
    visits: g.visits || 0,
    created: g.created || null,
    updated: g.updated || null
  }))
}

async function getBadges(userId) {
  const data = await get(
    APIS.badges,
    `/v1/users/${userId}/badges?limit=100&sortOrder=Desc`
  )

  return (data.data || []).map(b => ({
    id: b.id,
    name: b.name,
    description: b.description || null,
    enabled: b.enabled,
    awarded: b.statistics?.awarder?.Count || 0
  }))
}

async function getGroups(userId) {
  const data = await get(
    APIS.groups,
    `/v1/users/${userId}/groups/roles`
  )

  return (data.data || []).map(g => ({
    id: g.group?.id,
    name: g.group?.name,
    role: g.role?.name,
    rank: g.role?.rank
  }))
}

async function getAvatar(userId) {
  const data = await get(
    APIS.avatar,
    `/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`
  )

  return data.data?.[0]?.imageUrl || null
}

async function robloxStalk(username) {
  const userBase = await getUserId(username)
  const userId = userBase.id

  const [
    profile,
    presence,
    social,
    games,
    badges,
    groups,
    avatar
  ] = await Promise.all([
    getProfile(userId).catch(() => null),
    getPresence(userId).catch(() => null),
    getFriends(userId).catch(() => ({
      friends: 0,
      followers: 0,
      following: 0
    })),
    getGames(userId).catch(() => []),
    getBadges(userId).catch(() => []),
    getGroups(userId).catch(() => []),
    getAvatar(userId).catch(() => null)
  ])

  return {
    success: true,
    result: {
      id: userId,
      username: profile?.name || username,
      displayName: profile?.displayName || null,
      description: profile?.description || null,
      created: profile?.created || null,
      isBanned: profile?.isBanned || false,
      avatar,
      presence,
      social,
      games: {
        total: games.length,
        list: games
      },
      badges: {
        total: badges.length,
        list: badges
      },
      groups: {
        total: groups.length,
        list: groups
      }
    }
  }
}

const input = process.argv[2] || 'ynlvaealuht'

robloxStalk(input)
  .then(r => console.log(JSON.stringify(r, null, 2)))
  .catch(e => {
    console.log(JSON.stringify({
      success: false,
      error: e.message
    }, null, 2))
  })