import 'dotenv/config'
import express from 'express'
import { InteractionType, InteractionResponseType, verifyKeyMiddleware } from 'discord-interactions'
import { selectForDrop, dropNominatedBook } from './actions/dropping.js'
import { nominateCustomBook, nominateSearchedBook } from './actions/nominating.js'
import { listNominatedBooks } from './actions/listing.js'
import { searchBook } from './actions/searching.js'
import {
  runPoll,
  cancelPoll,
  endPoll,
  tiebreakerRandom,
  tiebreakerRepoll,
  endRepoll,
  showWinner,
} from './actions/polling.js'
import { finishChosenBook, selectForFinish } from './actions/finishing.js'
import { actionTest } from './asdf.js'
import { rememberPolls } from './utils.js'

// Create an express app
const app = express()
// Get port, or default to 3000
const PORT = process.env.PORT || 3000

app.use('/static', express.static('static'))

/**
 * Interactions endpoint URL where Discord will send HTTP requests
 * Parse request body and verifies incoming requests using discord-interactions package
 */
app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
  // Interaction type and data
  const { type, data, id } = req.body

  /**
   * Handle verification requests
   */
  if (type === InteractionType.PING) {
    return res.send({ type: InteractionResponseType.PONG })
  }

  /**
   * Handle slash command requests
   * See https://discord.com/developers/docs/interactions/application-commands#slash-commands
   */
  if (type === InteractionType.APPLICATION_COMMAND) {
    const { name } = data

    if (name === 'test') {
      return actionTest(req, res)
    }
    if (name === 'search') {
      return searchBook(req, res)
    }
    if (name === 'list') {
      return listNominatedBooks(req, res)
    }
    if (name === 'nominate') {
      return nominateCustomBook(req, res)
    }
    if (name === 'drop') {
      return selectForDrop(req, res)
    }
    if (name === 'poll') {
      return runPoll(req, res)
    }
    if (name === 'finish') {
      return selectForFinish(req, res)
    }
    if (name === 'completed') {
      return actionListFinishedBooks(req, res)
    }
    if (name === 'winner') {
      return showWinner(req, res)
    }

    console.error(`unknown command: ${name}`)
    return res.status(400).json({ error: 'unknown command' })
  }

  if (type === InteractionType.MESSAGE_COMPONENT) {
    const { custom_id } = data
    if (custom_id.startsWith('nominate_')) {
      return nominateSearchedBook(req, res)
    }
    if (custom_id === 'drop_select') {
      return dropNominatedBook(req, res)
    }
    if (custom_id === 'cancel_poll') {
      return cancelPoll(req, res)
    }
    if (custom_id === 'end_poll') {
      return endPoll(req, res)
    }
    if (custom_id === 'finish_select') {
      return finishChosenBook(req, res)
    }
    if (custom_id === 'tiebreaker_random') {
      return tiebreakerRandom(req, res)
    }
    if (custom_id === 'tiebreaker_repoll') {
      return tiebreakerRepoll(req, res)
    }
    if (custom_id === 'end_repoll') {
      return endRepoll(req, res)
    }
  }

  console.error('unknown interaction type', type)
  return res.status(400).json({ error: 'unknown interaction type' })
})

rememberPolls()
console.log('Finished checking for active polls')

app.listen(PORT, () => {
  console.log('Listening on port', PORT)
})
