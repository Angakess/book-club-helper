import {
  InteractionType,
  InteractionResponseType,
  InteractionResponseFlags,
  MessageComponentTypes,
  ButtonStyleTypes,
  verifyKeyMiddleware,
} from "discord-interactions";
import { getRandomEmoji, DiscordRequest } from "./utils.js";
import { getBook, getWork } from "./bookAPI.js";
import { EmbedBuilder } from "discord.js";
import sqlite3 from "sqlite3";
import { open } from "sqlite";

const HOST_URL = process.env.HOST_URL;

function actionTest(req, res) {
  // Send a message into the channel where command was triggered from
  res.send({
    type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
    data: {
      // Fetches a random emoji to send from a helper function
      content: `hello world ${getRandomEmoji()}`,
    },
  });
}

async function actionSearchBook(req, res) {
  const bookTitle = req.body.data.options[0].value;
  const author = req.body.data.options[1] ? req.body.data.options[1].value : "";

  const endpoint = `webhooks/${process.env.APP_ID}/${req.body.token}/messages/@original`;

  try {
    await res.send({
      type: InteractionResponseType.DEFERRED_CHANNEL_MESSAGE_WITH_SOURCE,
    });

    const book = await getBook(bookTitle, author);

    const work = await getWork(book.key);

    const description =
      typeof work.description === "string"
        ? work.description
        : work.description?.value || "Descripción no disponible";

    let resultmsg;

    if (book && work) {
      const embed = new EmbedBuilder()
        .setTitle(`${book.title}`)
        .setDescription(description)
        .addFields(
          {
            name: "Author",
            value: `${book.author_name}`,
            inline: true,
          },
          {
            name: "Rating",
            value: `⭐ ${book.ratings_average.toFixed(1)} (${
              book.ratings_count
            })`,
            inline: true,
          }
        )
        .setImage(`https://covers.openlibrary.org/b/id/${book.cover_i}.jpg`)
        .setColor("#78BFD6");
      resultmsg = {
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                label: "Nominate",
                style: 1,
                custom_id: "agregar_button",
              },
            ],
          },
        ],
        embeds: [embed],
      };
    } else {
      resultmsg = {
        content: `Sorry, I couldn't find a book titled '${bookTitle}'`,
        components: [],
      };
    }

    return DiscordRequest(endpoint, {
      method: "PATCH",
      body: resultmsg,
    });
  } catch (error) {
    console.error(error);
    return DiscordRequest(endpoint, {
      method: "PATCH",
      body: {
        content:
          "There was an error while searching for the book, Please try again later",
      },
    });
  }
}

async function actionListNominatedBooks(req, res) {
  const db = await open({
    filename: "./library.db", // Reemplaza con la ruta de tu base de datos
    driver: sqlite3.Database,
  });
  try {
    let nominees = await db.all("SELECT * FROM nominees");

    let list = "";
    nominees = nominees.sort((a, b) => b.votes - a.votes);
    for (let index = 0; index < nominees.length; index++) {
      const element = nominees[index];
      list =
        list +
        `${index + 1}) ${element.title} (${element.pages} pags), ${
          element.votes
        } votos.\n`;
    }

    const embedList = new EmbedBuilder()
      .setTitle("Nominated books")
      .setDescription(list)
      .setColor("#78BFD6");

    await db.close();
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        embeds: [embedList],
      },
    });
  } catch (error) {
    console.error("Error obtaining data:", error);
    await db.close();
    return res.send({
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: "Error obtaining nominees",
      },
    });
  }
}

export { actionTest, actionSearchBook, actionListNominatedBooks };
