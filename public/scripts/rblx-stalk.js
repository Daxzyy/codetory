const axios = require('axios')

async function robloxStalk(username) {
  try {
    const headers = {
      'User-Agent': 'Mozilla/5.0',
      'Accept': 'application/json'
    }

    const { data: userData } = await axios.post(
      'https://users.roblox.com/v1/usernames/users',
      {
        usernames: [username],
        excludeBannedUsers: false
      },
      { headers }
    )

    if (!userData?.data?.length) {
      return {
        success: false,
        error: `User "${username}" not found`
      }
    }

    const user = userData.data[0]
    const userId = user.id

    const [
      profile,
      presence,
      friends,
      followers,
      following,
      games,
      badges,
      groups,
      avatar
    ] = await Promise.all([
      axios.get(`https://users.roblox.com/v1/users/${userId}`, { headers }).catch(() => null),
      axios.post(
        'https://presence.roblox.com/v1/presence/users',
        { userIds: [userId] },
        { headers }
      ).catch(() => null),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/friends/count`, { headers }).catch(() => null),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/followers/count`, { headers }).catch(() => null),
      axios.get(`https://friends.roblox.com/v1/users/${userId}/followings/count`, { headers }).catch(() => null),
      axios.get(`https://games.roblox.com/v2/users/${userId}/games?limit=50&sortOrder=Asc`, { headers }).catch(() => null),
      axios.get(`https://badges.roblox.com/v1/users/${userId}/badges?limit=100&sortOrder=Desc`, { headers }).catch(() => null),
      axios.get(`https://groups.roblox.com/v1/users/${userId}/groups/roles`, { headers }).catch(() => null),
      axios.get(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${userId}&size=420x420&format=Png&isCircular=false`,
        { headers }
      ).catch(() => null)
    ])

    const p = presence?.data?.userPresences?.[0] || {}

    const statusMap = {
      0: 'Offline',
      1: 'Online (Website)',
      2: 'In-Game',
      3: 'In Studio'
    }

    return {
      success: true,
      results: {
        id: userId,
        username: profile?.data?.name || username,
        displayName: profile?.data?.displayName || null,
        description: profile?.data?.description || null,
        created: profile?.data?.created || null,
        isBanned: profile?.data?.isBanned || false,
        avatar: avatar?.data?.data?.[0]?.imageUrl || null,
        presence: {
          status: statusMap[p.userPresenceType] || 'Unknown',
          lastOnline: p.lastOnline || null,
          gameId: p.gameId || null,
          gameName: p.lastLocation || null,
          placeId: p.placeId || null
        },
        social: {
          friends: friends?.data?.count || 0,
          followers: followers?.data?.count || 0,
          following: following?.data?.count || 0
        },
        games: {
          total: games?.data?.data?.length || 0,
          list: (games?.data?.data || []).map(game => ({
            id: game.id,
            name: game.name,
            description: game.description || null,
            playing: game.playing || 0,
            visits: game.visits || 0,
            created: game.created || null,
            updated: game.updated || null
          }))
        },
        badges: {
          total: badges?.data?.data?.length || 0,
          list: (badges?.data?.data || []).map(badge => ({
            id: badge.id,
            name: badge.name,
            description: badge.description || null,
            enabled: badge.enabled,
            awarded: badge.statistics?.awarder?.Count || 0
          }))
        },
        groups: {
          total: groups?.data?.data?.length || 0,
          list: (groups?.data?.data || []).map(group => ({
            id: group.group?.id || null,
            name: group.group?.name || null,
            role: group.role?.name || null,
            rank: group.role?.rank || null
          }))
        }
      }
    }
  } catch (err) {
    return {
      success: false,
      error: err.response?.data || err.message
    }
  }
}

return await robloxStalk('ynlvaealuht')