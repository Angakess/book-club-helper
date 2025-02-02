import { InteractionResponseType } from 'discord-interactions'
import { DiscordRequest } from '../utils.js'
import { addBook, checkActivePoll, checkAlreadyNominated } from '../database.js'
import { getBook, getWork, getAuthor } from '../bookAPI.js'

async function nominateSearchedBook(req, res) {
  const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`
  const channelId = req.body.channel.id
  const isPollActive = await checkActivePoll(channelId)
  if (isPollActive) {
    return DiscordRequest(`/channels/${channelId}/messages`, {
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
  }

  const { custom_id } = req.body.data
  const parts = custom_id.split('_')
  const bookKey = parts[1]
  const authorKey = parts[2]

  console.log('XXX: ', channelId)
  try {
    await res.send({
      type: InteractionResponseType.UPDATE_MESSAGE,
    })
    const work = await getWork(bookKey)
    const author = await getAuthor('/authors/' + authorKey)
    const book = await getBook(work.title, author.name)

    const newBook = {
      title: `${book.title}`,
      author: `${book.author_name[0] ? book.author_name[0] : 'N/A'}`,
      pages: `${book.number_of_pages_median ? book.number_of_pages_median : 'N/A'}`,
      rating: `${book.ratings_average ? book.ratings_average.toFixed(1) : 'N/A'}`,
      votes: 0,
      channel_id: channelId,
    }

    try {
      await checkAlreadyNominated(newBook)
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

    try {
      await addBook(newBook)
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

    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: `"${book.title}" added successfully  :white_check_mark:`,
        components: [],
        embeds: [],
      },
    })
  } catch (error) {
    console.error(error)
    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: error.message,
      },
    })
  }
}

async function nominateCustomBook(req, res) {
  const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`

  try {
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
      return DiscordRequest(
        `/webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`,
        {
          method: 'DELETE',
        }
      )
    }

    const bookTitle = req.body.data.options[0].value

    const newBook = {
      title: `${bookTitle}`,
      author: 'N/A',
      pages: 'N/A',
      rating: 'N/A',
      votes: 0,
      channel_id: req.body.channel.id,
    }

    try {
      await addBook(newBook)
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

    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: 'Book added successfully  :white_check_mark:',
      },
    })
  } catch (error) {
    console.error(error)
    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: error.message,
      },
    })
  }
}

export { nominateCustomBook, nominateSearchedBook }
