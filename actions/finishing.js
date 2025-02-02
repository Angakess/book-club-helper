import { InteractionResponseType } from 'discord-interactions'
import { DiscordRequest } from '../utils.js'
import { checkActivePoll, getNominees, finishBook } from '../database.js'

async function selectForFinish(req, res) {
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
          'There is an active poll in this channel. Please cancel the latest poll and try again.  :warning:',
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

  const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`
  const books = []
  const nominees = await getNominees(channelId)
  if (nominees.length < 1) {
    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: 'There are currently 0 nominated books in this channel.  :warning:',
      },
    })
  }
  for (let i = 0; i < nominees.length; i++) {
    const nominee = nominees[i]
    const element = {
      label: `${nominee.title.length > 25 ? nominee.title.slice(0, 22) + '...' : nominee.title}`,
      value: `${nominee.id}`,
      description: `by ${nominee.author}`,
    }
    books.push(element)
  }

  return DiscordRequest(endpoint, {
    method: 'PATCH',
    body: {
      content: 'Select the book you wish to mark as finished',
      components: [
        {
          type: 1,
          components: [
            {
              type: 3,
              custom_id: 'finish_select',
              options: books,
              placeholder: 'Select a book',
              min_values: 1,
              max_values: 1,
            },
          ],
        },
      ],
    },
  })
}

async function finishChosenBook(req, res) {
  const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`
  const bookId = req.body.data.values[0]
  res.send({
    type: InteractionResponseType.UPDATE_MESSAGE,
  })

  try {
    const title = await finishBook(bookId)
    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: `"${title}" successfully marked as finished  :white_check_mark:`,
        components: [],
        embeds: [],
      },
    })
  } catch (error) {
    console.error(error)
    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: `${error.message}  :x:`,
        components: [],
        embeds: [],
      },
    })
  }
}

export { finishChosenBook, selectForFinish }
