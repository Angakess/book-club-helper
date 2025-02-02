# Book Club Helper Bot

A Discord bot to help book clubs organize their next read through polls, nominations, and book searches.

## Features

- **Polls for Book Selection**: Create polls to decide which book to read next.
- **Tiebreakers**: Offer tiebreakers when necessary.
- **Book Search & Nomination**: Search for books and nominate them for voting.
- **Custom Nominations**: Nominate books that may not be found online.

## Setup & Installation

### Prerequisites
- [Node.js](https://nodejs.org/) installed
- A Discord bot token
- SQLite installed (or another database if preferred)

### Installation
1. Clone the repository:
   ```sh
   git clone https://github.com/yourusername/book-club-helper.git
   cd book-club-helper
   ```

2. Install dependencies using [npm](https://www.npmjs.com/):
   ```sh
   npm install
   ```

3. Create a `.env` file and add your Discord bot token:
   ```sh
   DISCORD_TOKEN=your-bot-token
   APP_ID=your-discord-app-id
   ```

4. Start the bot:
   ```sh
   node app.js
   //or
   npm run start
   ```

## Usage

### Creating a Poll
Use the `/poll` command to start a book selection poll. Members will vote, and if there is a tie, users will be offered to resolve it randomly or by running another poll only involving the tied books.

### Searching for a Book
Use `/search <title> [author]` to find a book.

### Nominating a Book
Use `/nominate <title>` to add a book to the list of nominees.
