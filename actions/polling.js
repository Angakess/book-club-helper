import { InteractionResponseType } from 'discord-interactions'
import {
  DiscordRequest,
  makePollAnswers,
  getAnswers,
  getWinners,
  makeRepollAnswers,
  makeNewNominees,
  makeNewWinners,
  sendTiebreakerMessage,
} from '../utils.js'
import {
  checkActivePoll,
  deleteActivePoll,
  saveActivePoll,
  updateNomineesVotes,
  updateWinners,
  updateNominees,
  getNominees,
} from '../database.js'
import { EmbedBuilder } from 'discord.js'
const HOST_URL = process.env.HOST_URL
const POLLDURATIONHRS = 24

async function runPoll(req, res) {
  await res.send({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  })

  const channelId = req.body.channel.id
  const isPollActive = await checkActivePoll(channelId)
  if (isPollActive) {
    await DiscordRequest(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: {
        content:
          'There is already an active poll in this channel. Please cancel the latest poll and try again.  :warning:',
        message_reference: {
          type: 0,
          message_id: isPollActive.message_id,
          channel_id: isPollActive.channel_id,
        },
      },
    })
    return DiscordRequest(`/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`, {
      method: 'DELETE',
    })
  }

  const pollAnswers = await makePollAnswers(channelId)
  if (pollAnswers.length < 1) {
    return DiscordRequest(`/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`, {
      method: 'PATCH',
      body: {
        content: 'There are currently 0 nominated books in this channel.  :warning:',
      },
    })
  }
  const msgBody = {
    poll: {
      question: { text: 'What book should we read next?' },
      answers: pollAnswers,
      duration: POLLDURATIONHRS,
      allow_multiselect: true,
      layout_type: 1,
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            label: 'Cancel',
            style: 4,
            custom_id: 'cancel_poll',
          },
          {
            type: 2,
            label: 'End Poll',
            style: 1,
            custom_id: 'end_poll',
          },
        ],
      },
    ],
  }

  try {
    const endpoint = `/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`
    const result = await DiscordRequest(endpoint, {
      method: 'PATCH',
      body: msgBody,
    })
    const msgData = await result.json()

    const channelId = req.body.channel.id
    const msgId = msgData.id
    const expiryDate = msgData.poll.expiry
    const pollDurationMs = POLLDURATIONHRS * 60 * 60 * 1000

    saveActivePoll(msgId, channelId, expiryDate)
    setTimeout(async () => {
      try {
        const isPollActive = await checkActivePoll(channelId)
        if (!isPollActive) {
          return
        }

        const pollEndpoint = `/channels/${channelId}/messages/${msgId}`
        await DiscordRequest(pollEndpoint, {
          method: 'PATCH',
          body: {
            components: [],
          },
        })

        await deleteActivePoll(msgId)

        const newNominees = await makeNewNominees(channelId, msgId)
        await updateNominees(newNominees)

        const winners = newNominees.filter((a) => a.winner === 1)
        if (winners.length > 1) {
          await sendTiebreakerMessage(channelId)
        }
      } catch (err) {
        console.error('Error closing the poll or sending results:', err)
      }
    }, pollDurationMs)
  } catch (err) {
    console.log(err)
    return DiscordRequest(`/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`, {
      method: 'PATCH',
      body: {
        content: 'An error occurred while creating the poll. Please try again later. :x:',
        components: [],
      },
    })
  }
}

async function cancelPoll(req, res) {
  const msgId = req.body.message.id
  const channelId = req.body.channel.id
  const pollEndpoint = `/channels/${channelId}/messages/${msgId}`
  const chatEndpoint = `/channels/${channelId}/messages`

  try {
    await DiscordRequest(pollEndpoint, {
      method: 'DELETE',
    })
    await DiscordRequest(chatEndpoint, {
      method: 'POST',
      body: {
        content: 'The poll has been cancelled.  :confused:',
      },
    })
  } catch (err) {
    console.log(err)
    await DiscordRequest(chatEndpoint, {
      method: 'POST',
      body: {
        content: 'An error occurred while cancelling the poll. Please try again later. :x:',
      },
    })
  }

  await deleteActivePoll(msgId)
}

async function endPoll(req, res) {
  await res.send({
    type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
  })

  const msgId = req.body.message.id
  const channelId = req.body.channel.id
  const pollEndpoint = `/channels/${channelId}/polls/${msgId}/expire`
  const ogMessageEndpoint = `/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`

  try {
    await DiscordRequest(pollEndpoint, {
      method: 'POST',
    })

    await DiscordRequest(ogMessageEndpoint, {
      method: 'PATCH',
      body: {
        components: [],
      },
    })

    await deleteActivePoll(msgId)

    const newNominees = await makeNewNominees(channelId, msgId)
    await updateNominees(newNominees)

    const winners = newNominees.filter((a) => a.winner === 1)
    if (winners.length > 1) {
      await sendTiebreakerMessage(channelId)
    }
  } catch (err) {
    console.log(err)
    await DiscordRequest(ogMessageEndpoint, {
      method: 'PATCH',
      body: {
        content: 'An error occurred while ending the poll. Please try again later. :x:',
      },
    })
  }
}

async function showWinner(req, res) {
  res.send({
    type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
  })

  try {
    const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`
    const channelId = req.body.channel.id
    const winners = await getWinners(channelId)
    if (winners.length < 1) {
      return DiscordRequest(endpoint, {
        method: 'PATCH',
        body: {
          content: 'There are currently 0 books with votes.  :warning:',
        },
      })
    }
    let descWinners = ''
    if (winners.length === 1) {
      descWinners = `:medal: "${winners[0].title}" by ${winners[0].author}`
    } else {
      descWinners = `:thinking:  There appears to be a tie:\n`
      for (let i = 0; i < winners.length; i++) {
        const element = winners[i]
        descWinners = descWinners + `\n- "${element.title}" by ${element.author}`
      }
    }
    const embedWinners = new EmbedBuilder()
      .setTitle(`The winner from the latest poll is...`)
      .setColor('#78BFD6')
      .setDescription(descWinners)

    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        embeds: [embedWinners],
      },
    })
  } catch (error) {
    console.error('Error obtaining data:', error)

    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: 'Error obtaining winners  :x:',
      },
    })
  }
}

async function tiebreakerRandom(req, res) {
  res.send({
    type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
  })

  const channelId = req.body.channel.id
  const tied = await getWinners(channelId)
  const randomPos = Math.floor(Math.random() * tied.length)
  const newWinners = []
  for (let i = 0; i < tied.length; i++) {
    const element = tied[i]
    if (i != randomPos) {
      newWinners.push({
        ...element,
        winner: 0,
      })
    }
  }

  await updateNominees(newWinners)

  const ogMessageEndpoint = `/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`
  await DiscordRequest(ogMessageEndpoint, {
    method: 'DELETE',
  })
  const chatEndpoint = `channels/${channelId}/messages`
  await DiscordRequest(chatEndpoint, {
    method: 'POST',
    body: {
      content: `The new winner is: ${tied[randomPos].title}  :medal:`,
    },
  })
}

async function tiebreakerRepoll(req, res) {
  res.send({
    type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
  })

  const channelId = req.body.channel.id
  const currentWinners = await makeRepollAnswers(channelId)

  const isPollActive = await checkActivePoll(channelId)
  if (isPollActive) {
    await DiscordRequest(`/channels/${channelId}/messages`, {
      method: 'POST',
      body: {
        content:
          'There is already an active poll in this channel. Please cancel the latest poll and try again.  :warning:',
        message_reference: {
          type: 0,
          message_id: isPollActive.message_id,
          channel_id: isPollActive.channel_id,
        },
      },
    })
    return DiscordRequest(`/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`, {
      method: 'DELETE',
    })
  }

  if (currentWinners.length <= 1) {
    return DiscordRequest(`/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`, {
      method: 'PATCH',
      body: {
        content:
          "There's no longer a tie (one or more nominees involved may have been dropped or changed vote count).  :warning:",
        components: [],
      },
    })
  }

  const msgBody = {
    poll: {
      question: { text: 'TIEBREAKER: What book should we read next?' },
      answers: currentWinners,
      duration: POLLDURATIONHRS,
      allow_multiselect: false,
      layout_type: 1,
    },
    components: [
      {
        type: 1,
        components: [
          {
            type: 2,
            label: 'Cancel',
            style: 4,
            custom_id: 'cancel_poll',
          },
          {
            type: 2,
            label: 'End Poll',
            style: 1,
            custom_id: 'end_repoll',
          },
        ],
      },
    ],
  }

  try {
    const ogMessageEndpoint = `/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`
    const channelId = req.body.channel.id
    const chatEndpoint = `channels/${channelId}/messages`
    const result = await DiscordRequest(chatEndpoint, {
      method: 'POST',
      body: msgBody,
    })
    const msgData = await result.json()

    const msgId = msgData.id
    const expiryDate = msgData.poll.expiry
    const pollDurationMs = POLLDURATIONHRS * 60 * 60 * 1000

    const isTiebreaker = 1
    saveActivePoll(msgId, channelId, expiryDate, isTiebreaker)
    await DiscordRequest(ogMessageEndpoint, {
      method: 'DELETE',
    })

    setTimeout(async () => {
      try {
        const isPollActive = await checkActivePoll(channelId)
        if (!isPollActive) {
          return
        }

        const pollEndpoint = `channels/${channelId}/messages/${msgId}`
        await DiscordRequest(pollEndpoint, {
          method: 'PATCH',
          body: {
            components: [],
          },
        })

        await deleteActivePoll(msgId)

        const newWinners = await makeNewWinners(channelId, msgId)
        await updateNominees(newWinners)

        const winners = newWinners.filter((a) => a.winner === 1)
        if (winners.length > 1) {
          await sendTiebreakerMessage(channelId)
        }
      } catch (err) {
        console.error('Error closing the poll or sending results:', err)
      }
    }, pollDurationMs)
  } catch (err) {
    console.log(err)
    return DiscordRequest(`/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`, {
      method: 'PATCH',
      body: {
        content: 'An error occurred while creating the poll. Please try again later. :x:',
        components: [],
      },
    })
  }
}

async function endRepoll(req, res) {
  res.send({
    type: InteractionResponseType.DEFERRED_UPDATE_MESSAGE,
  })

  const msgId = req.body.message.id
  const channelId = req.body.channel.id
  const pollEndpoint = `/channels/${channelId}/polls/${msgId}/expire`
  const ogMessageEndpoint = `/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`

  try {
    await DiscordRequest(pollEndpoint, {
      method: 'POST',
    })

    await DiscordRequest(ogMessageEndpoint, {
      method: 'PATCH',
      body: {
        components: [],
      },
    })

    await deleteActivePoll(msgId)

    const newWinners = await makeNewWinners(channelId, msgId)
    await updateNominees(newWinners)

    const winners = newWinners.filter((a) => a.winner === 1)
    if (winners.length > 1) {
      await sendTiebreakerMessage(channelId)
    }
  } catch (err) {
    console.log(err)
    await DiscordRequest(ogMessageEndpoint, {
      method: 'PATCH',
      body: {
        content: 'An error occurred while ending the poll. Please try again later. :x:',
      },
    })
  }
}

export { runPoll, cancelPoll, endPoll, tiebreakerRandom, tiebreakerRepoll, endRepoll, showWinner }
