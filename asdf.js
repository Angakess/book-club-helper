import { InteractionResponseType } from 'discord-interactions'
import { getRandomEmoji } from './utils.js'

async function actionTest(req, res) {
  // Send a message into the channel where command was triggered from
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      // Fetches a random emoji to send from a helper function
      content: `hello world ${getRandomEmoji()}`,
    },
  })
}

export { actionTest }
