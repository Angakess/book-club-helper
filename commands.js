import "dotenv/config";
import { capitalize, InstallGlobalCommands } from "./utils.js";

// Simple test command
const TEST_COMMAND = {
  name: "test",
  description: "Basic command",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const SEARCH_COMMAND = {
  name: "search",
  description: "Search book",
  options: [
    {
      type: 3,
      name: "title",
      description: "Enter a book title",
      required: true,
    },
    {
      type: 3,
      name: "author",
      description: "Enter an author",
      required: false,
    },
  ],
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const LIST_COMMAND = {
  name: "list",
  description: "List nominees",
  type: 1,
  integration_types: [0, 1],
  contexts: [0, 1, 2],
};

const ALL_COMMANDS = [TEST_COMMAND, SEARCH_COMMAND, LIST_COMMAND];

InstallGlobalCommands(process.env.APP_ID, ALL_COMMANDS);
