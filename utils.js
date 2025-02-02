import 'dotenv/config'
import {
  getActivePolls,
  getNominees,
  deleteActivePoll,
  updateNomineesVotes,
  updateNominees,
} from './database.js'

export async function DiscordRequest(endpoint, options) {
  // append endpoint to root API URL
  const url = 'https://discord.com/api/v10/' + endpoint
  // Stringify payloads
  if (options.body) options.body = JSON.stringify(options.body)
  // Use fetch to make requests
  while (true) {
    // Keep retrying if rate limited
    const res = await fetch(url, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
        'Content-Type': 'application/json; charset=UTF-8',
        'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
      },
      ...options,
    })

    if (res.status === 429) {
      const data = await res.json()
      const waitTime = data.retry_after * 1000 // Convert to ms
      console.warn(`Rate limited. Retrying after ${waitTime} ms...`)
      await new Promise((resolve) => setTimeout(resolve, waitTime)) // Wait
      continue // Retry request
    }

    if (!res.ok) {
      const errorData = await res.json()
      console.log(res.status)
      throw new Error(JSON.stringify(errorData))
    }

    return res // Successful response
  }
}

export async function InstallGlobalCommands(appId, commands) {
  // API endpoint to overwrite global commands
  const endpoint = `applications/${appId}/commands`

  try {
    // This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
    await DiscordRequest(endpoint, { method: 'PUT', body: commands })
  } catch (err) {
    console.error(err)
  }
}

// Simple method that returns a random emoji from list
export function getRandomEmoji() {
  const emojiList = [
    '😭',
    '😄',
    '😌',
    '🤓',
    '😎',
    '😤',
    '🤖',
    '😶‍🌫️',
    '🌏',
    '📸',
    '💿',
    '👋',
    '🌊',
    '✨',
  ]
  return emojiList[Math.floor(Math.random() * emojiList.length)]
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

export async function makePollAnswers(channelId) {
  const nominees = await getNominees(channelId)
  const answers = []

  for (let i = 0; i < nominees.length; i++) {
    const element = nominees[i]
    answers.push({
      answers_id: element.id,
      poll_media: { text: element.title },
    })
  }

  return answers
}

export async function makeRepollAnswers(channelId) {
  const nominees = await getWinners(channelId)
  const answers = []

  for (let i = 0; i < nominees.length; i++) {
    const element = nominees[i]
    answers.push({
      answers_id: element.id,
      poll_media: { text: element.title },
    })
  }

  return answers
}

export async function getAnswers(channelId, msgId) {
  const pollEndpnt = `/channels/${channelId}/messages/${msgId}`
  try {
    while (true) {
      const response = await DiscordRequest(pollEndpnt, { method: 'GET' })
      if (response.status === 404) {
        throw new Error(`Poll with message ID ${msgId} no longer exists.`)
      }
      const pollData = await response.json()

      if (pollData.poll.results.is_finalized) {
        return pollData.poll.results.answer_counts.sort(function (a, b) {
          return a.id - b.id
        })
      }

      await new Promise((resolve) => setTimeout(resolve, 500))
    }
  } catch (err) {
    console.error('Error fetching poll results:', err)
    return null
  }
}

export async function rememberPolls() {
  const activePolls = await getActivePolls()

  for (let i = 0; i < activePolls.length; i++) {
    const poll = activePolls[i]
    const now = Date.now()
    const expireDate = new Date(poll.expire_date)
    if (expireDate.getTime() <= now) {
      try {
        let newNominees
        if (poll.tiebreaker) {
          newNominees = await makeNewWinners(poll.channel_id, poll.message_id)
        } else {
          newNominees = await makeNewNominees(poll.channel_id, poll.message_id)
        }
        await updateNominees(newNominees)

        await deleteActivePoll(poll.message_id)

        const winners = newNominees.filter((a) => a.winner === 1)
        if (winners.length > 1) {
          await sendTiebreakerMessage(poll.channel_id)
        }

        await DiscordRequest(`/channels/${poll.channel_id}/messages/${poll.message_id}`, {
          method: 'PATCH',
          body: {
            components: [],
          },
        })
        /* const answers = await getAnswers(poll.channel_id, poll.message_id)
        if (!answers) {
          console.warn(`Poll ${poll.message_id} already deleted.`)
          return
        }
        updateNomineesVotes(answers, poll.channel_id) */
      } catch (err) {
        console.log(err)
      }
    } else {
      const timeDiff = expireDate.getTime() - now
      setTimeout(async () => {
        try {
          let newNominees
          if (poll.tiebreaker) {
            newNominees = await makeNewWinners(poll.channel_id, poll.message_id)
          } else {
            newNominees = await makeNewNominees(poll.channel_id, poll.message_id)
          }
          await updateNominees(newNominees)

          await deleteActivePoll(poll.message_id)

          const winners = newNominees.filter((a) => a.winner === 1)
          if (winners.length > 1) {
            await sendTiebreakerMessage(poll.channel_id)
          }

          await DiscordRequest(`/channels/${poll.channel_id}/messages/${poll.message_id}`, {
            method: 'PATCH',
            body: {
              components: [],
            },
          })

          /* const answers = await getAnswers(poll.channel_id, poll.message_id)
          if (!answers) {
            console.warn(`Poll ${poll.message_id} already deleted.`)
            return
          }
          updateNomineesVotes(answers, poll.channel_id)
          deleteActivePoll(poll.message_id)
          await DiscordRequest(`/channels/${poll.channel_id}/messages/${poll.message_id}`, {
            method: 'PATCH',
            body: {
              components: [],
            },
          }) */
        } catch (err) {
          console.error('Error closing the poll or sending results:', err)
        }
      }, timeDiff)
    }
  }
}

export async function getWinners(channelId) {
  const nominees = await getNominees(channelId)
  if (nominees.length === 0) {
    return []
  }
  // Filter nominees with the highest votes (handling ties)
  const winners = nominees.filter((nominee) => nominee.winner === 1)

  return winners
}

export async function makeNewNominees(channelId, msgId) {
  const answers = await getAnswers(channelId, msgId)
  const nominees = await getNominees(channelId)
  const maxVotes = Math.max(...answers.map((a) => a.count))
  const newNominees = []
  for (let i = 0; i < nominees.length; i++) {
    const nominee = nominees[i]
    newNominees.push({
      ...nominee,
      votes: answers[i].count,
      winner: answers[i].count === maxVotes ? 1 : 0,
    })
  }

  return newNominees
}
export async function makeNewWinners(channelId, msgId) {
  const answers = await getAnswers(channelId, msgId)
  const winners = await getWinners(channelId)
  const maxVotes = Math.max(...answers.map((a) => a.count))
  const newWinners = []
  for (let i = 0; i < winners.length; i++) {
    const winner = winners[i]
    newWinners.push({
      ...winner,
      winner: answers[i].count === maxVotes ? 1 : 0,
    })
  }

  return newWinners
}

export async function sendTiebreakerMessage(channelId) {
  await DiscordRequest(`channels/${channelId}/messages`, {
    method: 'POST',
    body: {
      content: 'There appears to another tie. How would you like to resolve it?',
      components: [
        {
          type: 1,
          components: [
            {
              type: 2,
              label: 'Random',
              style: 1,
              custom_id: 'tiebreaker_random',
              emoji: {
                id: null,
                name: '🎲',
              },
            },
            {
              type: 2,
              label: 'Run Tiebreaker',
              style: 1,
              custom_id: 'tiebreaker_repoll',
              emoji: {
                id: null,
                name: '⚖️',
              },
            },
          ],
        },
      ],
    },
  })
}
