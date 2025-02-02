import { InteractionResponseType } from 'discord-interactions'
import { DiscordRequest } from '../utils.js'
import { getBook, getRating, getWork } from '../bookAPI.js'
import { EmbedBuilder } from 'discord.js'

async function searchBook(req, res) {
  const bookTitle = req.body.data.options[0].value
  const author = req.body.data.options[1] ? req.body.data.options[1].value : ''

  const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`

  try {
    await res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    })

    const book = await getBook(bookTitle, author)

    const work = await getWork(book.key)

    const ratings = await getRating(work.key)

    const description =
      typeof work.description === 'string'
        ? work.description
        : work.description?.value || 'Description unavailable'

    let resultmsg

    if (book && work) {
      const embed = new EmbedBuilder()
        .setTitle(`${book.title}`)
        .setDescription(description)
        .addFields(
          {
            name: 'Author',
            value: `${book.author_name[0]}`,
            inline: true,
          },
          {
            name: 'Rating',
            value: `⭐ ${ratings.summary.average.toFixed(1)} (${ratings.summary.count})`,
            inline: true,
          }
        )
        .setImage(`https://covers.openlibrary.org/b/id/${book.cover_i}.jpg`)
        .setColor('#78BFD6')
      resultmsg = {
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                label: 'Nominate',
                style: 1,
                custom_id: `nominate_${book.key}_${book.author_key[0]}`,
              },
            ],
          },
        ],
        embeds: [embed],
      }
    } else {
      resultmsg = {
        content: `Sorry, I couldn't find a book titled '${bookTitle}'`,
        components: [],
      }
    }

    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: resultmsg,
    })
  } catch (error) {
    console.error(error)
    return DiscordRequest(endpoint, {
      method: 'PATCH',
      body: {
        content: 'There was an error while searching for the book, Please try again later',
      },
    })
  }
}

export { searchBook }
