import 'dotenv/config'
import { InstallGlobalCommands } from './utils.js'

// Simple test command
const TEST_COMMAND = {
  name: 'test',
  description: 'Basic command',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const SEARCH_COMMAND = {
  name: 'search',
  description: 'Search book',
  options: [
    {
      type: 3,
      name: 'title',
      description: 'Enter a book title',
      required: true,
    },
    {
      type: 3,
      name: 'author',
      description: 'Enter an author',
      required: false,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const LIST_COMMAND = {
  name: 'list',
  description: 'List nominees',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const NOMINATE_COMMAND = {
  name: 'nominate',
  description: 'Nominate a book',
  options: [
    {
      type: 3,
      name: 'title',
      description: 'Enter a book title',
      required: true,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const DROP_COMMAND = {
  name: 'drop',
  description: 'Drop a nominated book',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const FINISH_COMMAND = {
  name: 'finish',
  description: 'Finish a nominated book',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const POLL_COMMAND = {
  name: 'poll',
  description: 'Run a poll to decide what to read',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const COMPLETED_COMMAND = {
  name: 'completed',
  description: 'List all finished books',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const REMOVE_COMMAND = {
  name: 'remove',
  description: 'Remove a finished book',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const WINNER_COMMAND = {
  name: 'winner',
  description: 'Show the winner of the latest poll',
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
}

const ALL_COMMANDS = [
  TEST_COMMAND,
  SEARCH_COMMAND,
  LIST_COMMAND,
  NOMINATE_COMMAND,
  DROP_COMMAND,
  //  FINISH_COMMAND,
  //  COMPLETED_COMMAND,
  POLL_COMMAND,
  //  REMOVE_COMMAND,
  WINNER_COMMAND,
]

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS)
