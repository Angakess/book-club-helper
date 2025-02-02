import { InteractionResponseType } from 'discord-interactions'
import { DiscordRequest } from '../utils.js'
import { getNominees, getFinished } from '../database.js'
import { EmbedBuilder } from 'discord.js'

async function listNominatedBooks(req, res) {
  const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`
  try {
    await res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    })

    const channelId = req.body.channel.id
    let nominees = await getNominees(channelId)
    if (nominees.length < 1) {
      return DiscordRequest(endpoint, {
        method: 'PATCH',
        body: {
          content: 'There are currently 0 nominated books in this channel.  :warning:',
        },
      })
    }
    let titles = ''
    let pages = ''
    let votes = ''
    nominees = nominees.sort((a, b) => b.votes - a.votes)
    for (let i = 0; i < nominees.length; i++) {
      const element = nominees[i]

      titles =
        titles +
        `${element.title.length > 50 ? element.title.slice(0, 50) + '...' : element.title}\n\n`
      pages = pages + `${element.pages}\n\n`
      votes = votes + `${element.votes}\n\n`
    }

    const embedList = new EmbedBuilder().setTitle('Nominated books').setColor('#78BFD6').addFields(
      {
        name: 'Title',
        value: titles,
        inline: true,
      },
      {
        name: 'Pages',
        value: pages,
        inline: true,
      },
      {
        name: 'Votes',
        value: votes,
        inline: true,
      }
    )

    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        embeds: [embedList],
      },
    })
  } catch (error) {
    console.error('Error obtaining data:', error)

    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: 'Error obtaining nominees  :x:',
      },
    })
  }
}

async function listFinishedBooks(req, res) {
  const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`
  try {
    await res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    })

    const channelId = req.body.channel.id
    let finished = await getFinished(channelId)
    if (finished.length < 1) {
      return DiscordRequest(endpoint, {
        method: 'PATCH',
        body: {
          content: 'There are currently 0 finished books.  :warning:',
        },
      })
    }
    let titles = ''
    let pages = ''
    let rating = ''
    for (let i = 0; i < finished.length; i++) {
      const element = finished[i]

      titles =
        titles +
        `${element.title.length > 50 ? element.title.slice(0, 50) + '...' : element.title}\n\n`
      pages = pages + `${element.pages}\n\n`
      rating = rating + `${element.rating}\n\n`
    }

    const embedList = new EmbedBuilder().setTitle('Finished books').setColor('#78BFD6').addFields(
      {
        name: 'Title',
        value: titles,
        inline: true,
      },
      {
        name: 'Pages',
        value: pages,
        inline: true,
      },
      {
        name: 'Rating',
        value: rating,
        inline: true,
      }
    )

    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        embeds: [embedList],
      },
    })
  } catch (error) {
    console.error('Error obtaining data:', error)

    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: 'Error obtaining finished books  :x:',
      },
    })
  }
}
export { listNominatedBooks, listFinishedBooks }
