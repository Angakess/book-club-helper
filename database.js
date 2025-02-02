import sqlite3 from 'sqlite3'

export async function addBook(book) {
  const maxNomineesAmount = 10
  const nominees = await getNominees(book.channel_id)

  if (nominees.length >= maxNomineesAmount) {
    throw new Error('Error adding book: There is already a maximum amount of nominees')
  }
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      throw new Error('Error connecting to database: ' + err.message)
    }
    console.log('Connection successful.')
  })

  const query = `INSERT INTO nominees (title, author, pages, rating, votes, channel_id) VALUES (?, ?, ?, ?, ?, ?)`

  db.run(
    query,
    [book.title, book.author, book.pages, book.rating, book.votes, book.channel_id],
    function (err) {
      if (err) {
        db.close((err) => {
          if (err) {
            throw new Error('Error disconnecting from database: ' + err.message)
          }
          console.log('Connection closed (list).')
        })
        throw new Error('Error adding book: ' + err.message)
      }
      console.log(`Book added successfully`)
    }
  )

  db.close((err) => {
    if (err) {
      throw new Error('Error disconnecting from database: ' + err.message)
    }
    console.log('Connection closed (adding).')
  })
}

export async function checkAlreadyNominated(newBook) {
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      throw new Error('Error connecting to database: ' + err.message)
    }
    console.log('Connection successful.')
  })

  const nominees = await new Promise((resolve, reject) => {
    const query = 'SELECT title, author FROM nominees WHERE channel_id = ?'

    db.all(query, [newBook.channel_id], (err, rows) => {
      if (err) {
        console.log('Error obtaining nominees')
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })

  db.close((err) => {
    if (err) {
      throw new Error('Error disconnecting from database: ' + err.message)
    }
    console.log('Connection closed ().')
  })

  if (nominees.some((book) => book.title === newBook.title && book.author === newBook.author)) {
    throw new Error('This book is already nominated')
  }
  return
}

export async function getNominees(channelId) {
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      throw new Error('Error connecting to database: ' + err.message)
    }
    console.log('Connection successful.')
  })

  const nominees = await new Promise((resolve, reject) => {
    const query = 'SELECT * FROM nominees WHERE channel_id = ?'

    db.all(query, [channelId], (err, rows) => {
      if (err) {
        console.log('Error obtaining nominees')
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })

  db.close((err) => {
    if (err) {
      throw new Error('Error disconnecting from database: ' + err.message)
    }
    console.log('Connection closed (list).')
  })

  return nominees.sort(function (a, b) {
    return a.id - b.id
  })
}

export async function dropBook(id) {
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      return console.error('Error connecting to database:', err.message)
    }
    console.log('Connected to database.')
  })

  // Consulta SQL para eliminar un elemento según su ID
  const query = `DELETE FROM nominees WHERE id = ?`

  db.run(query, [id], function (err) {
    if (err) {
      return console.error('Error executing query:', err.message)
    }

    console.log(`Rows affected: ${this.changes}`)
    console.log(`Element with ID ${id} deleted successfully.`)
  })

  // Cerrar la conexión a la base de datos
  db.close((err) => {
    if (err) {
      return console.error('Error closing the database:', err.message)
    }
    console.log('Database connection closed.')
  })
}

export async function saveActivePoll(msgId, channelId, expiryDate, isTiebreaker = 0) {
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      console.error('Error connecting to database:', err.message)
      return
    }
    console.log('Connected to the database.')
  })

  const query = `INSERT INTO active_polls (message_id, channel_id, expiry_date, tiebreaker) VALUES (?, ?, ?, ?)`

  db.run(query, [msgId, channelId, expiryDate, isTiebreaker], function (err) {
    if (err) {
      console.error('Error inserting row:', err.message)
    } else {
      console.log(`Row inserted successfully with ID: ${this.lastID}`)
    }
  })

  db.close((err) => {
    if (err) {
      console.error('Error closing the database:', err.message)
    } else {
      console.log('Database connection closed.')
    }
  })
}

export async function deleteActivePoll(msgId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('library.db', (err) => {
      if (err) {
        console.error('Error connecting to database:', err.message)
        reject(err)
        return
      }
      console.log('Connected to the database.')
    })

    const selectQuery = `SELECT * FROM active_polls WHERE message_id = ?`
    const deleteQuery = `DELETE FROM active_polls WHERE message_id = ?`

    // Step 1: Retrieve the poll before deletion
    db.get(selectQuery, [msgId], (err, row) => {
      if (err) {
        console.error('Error retrieving row:', err.message)
        reject(err)
        db.close()
        return
      }

      if (!row) {
        console.log(`No poll found with message_id: ${msgId}`)
        resolve(null)
        db.close()
        return
      }

      // Step 2: Delete the poll
      db.run(deleteQuery, [msgId], function (err) {
        if (err) {
          console.error('Error deleting row:', err.message)
          reject(err)
        } else {
          console.log(`Poll with message_id ${msgId} deleted successfully.`)
          console.log(`Rows affected: ${this.changes}`)
          // Step 3: Resolve with the deleted poll details
          resolve(row)
        }

        db.close((err) => {
          if (err) {
            console.error('Error closing the database:', err.message)
          } else {
            console.log('Database connection closed.')
          }
        })
      })
    })
  })
}

export async function checkActivePoll(channelId) {
  return new Promise((resolve, reject) => {
    const db = new sqlite3.Database('library.db', (err) => {
      if (err) {
        return reject(new Error('Error connecting to database: ' + err.message))
      }
    })

    const query = `SELECT * FROM active_polls WHERE channel_id = ? LIMIT 1`

    db.get(query, [channelId], (err, row) => {
      if (err) {
        db.close()
        return reject(new Error('Error querying database: ' + err.message))
      }

      db.close((closeErr) => {
        if (closeErr) {
          return reject(new Error('Error closing database connection: ' + closeErr.message))
        }

        if (row) {
          resolve(row) // If a poll exists, resolve with the row
        } else {
          resolve(null) // If no poll exists, resolve with null
        }
      })
    })
  })
}

export async function updateNomineesVotes(answers, channelId) {
  if (!answers || answers.length === 0) {
    console.error("No answers to update nominees' votes.")
    return
  }
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      throw new Error('Error connecting to database: ' + err.message)
    }
    console.log('Connected to the database.')
  })

  const query = `UPDATE nominees SET votes = ?, winner = ? WHERE id = ?`

  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(`SELECT id FROM nominees WHERE channel_id = ?`, [channelId], (err, rows) => {
        if (err) {
          return reject(new Error('Error fetching books: ' + err.message))
        }
        resolve(rows)
      })
    })

    if (rows.length !== answers.length) {
      throw new Error('The number of books does not match the length of the vote list.')
    }

    const updatePromises = rows.map((row, index) => {
      return new Promise((resolve, reject) => {
        db.run(query, [answers[index].count, answers[index].isWinner, row.id], (err) => {
          if (err) {
            console.error(`Error updating book with ID ${row.id}: `, err.message)
            return reject(err)
          } else {
            console.log(
              `Updated book ID ${row.id} with votes: ${answers[index].count}, and winner: ${answers[index].isWinner}`
            )
            resolve()
          }
        })
      })
    })

    await Promise.all(updatePromises)
  } catch (error) {
    console.error(error)
    throw error
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing the database: ' + err.message)
      } else {
        console.log('Connection closed.')
      }
    })
  }
}

export async function updateWinners(exWinners, channelId) {
  if (!exWinners || exWinners.length === 0) {
    console.error('No former winners to update nominees.')
    return
  }
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      throw new Error('Error connecting to database: ' + err.message)
    }
    console.log('Connected to the database.')
  })

  try {
    const rows = await new Promise((resolve, reject) => {
      db.all(`SELECT id FROM nominees WHERE channel_id = ?`, [channelId], (err, rows) => {
        if (err) {
          return reject(new Error('Error fetching books: ' + err.message))
        }
        resolve(rows)
      })
    })

    const updatePromises = exWinners.map((row) => {
      return new Promise((resolve, reject) => {
        db.run('UPDATE nominees SET winner = ? WHERE id = ?', [row.winner, row.id], (err) => {
          if (err) {
            console.error(`Error updating book with ID ${row.id}: `, err.message)
            return reject(err)
          } else {
            console.log(`Updated book ID ${row.id} with winner: ${row.winner}`)
            resolve()
          }
        })
      })
    })

    await Promise.all(updatePromises)
  } catch (error) {
    console.error(error)
    throw error
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing the database: ' + err.message)
      } else {
        console.log('Connection closed.')
      }
    })
  }
}

export async function getActivePolls() {
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      throw new Error('Error connecting to database: ' + err.message)
    }
    console.log('Connection successful.')
  })

  const activePolls = await new Promise((resolve, reject) => {
    const query = 'SELECT * FROM active_polls'

    db.all(query, [], (err, rows) => {
      if (err) {
        console.log('Error obtaining nominees')
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })

  db.close((err) => {
    if (err) {
      throw new Error('Error disconnecting from database: ' + err.message)
    }
    console.log('Connection closed.')
  })

  return activePolls
}

export async function finishBook(bookId) {
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      return console.error('Error connecting to database:', err.message)
    }
    console.log('Connected to database.')
  })

  const nominee = await new Promise((resolve, reject) => {
    const selectQuery = 'SELECT * FROM nominees WHERE id = ?'
    db.get(selectQuery, [bookId], (err, row) => {
      if (err) {
        console.log('Error obtaining nominee')
        reject(err)
      } else {
        resolve(row)
      }
    })
  })

  console.log('XXXX: ', nominee)
  const insertQuery =
    'INSERT INTO finished (title, author, pages, rating, channel_id) VALUES (?, ?, ?, ?, ?)'
  db.run(
    insertQuery,
    [nominee.title, nominee.author, nominee.pages, nominee.rating, nominee.channel_id],
    function (err) {
      if (err) {
        db.close((err) => {
          if (err) {
            throw new Error('Error disconnecting from database: ' + err.message)
          }
          console.log('Connection closed (list).')
        })
        throw new Error('Error adding finished book: ' + err.message)
      }
      console.log(`Book marked as finished successfully`)
    }
  )

  // Consulta SQL para eliminar un elemento según su ID
  const deleteQuery = `DELETE FROM nominees WHERE id = ?`
  db.run(deleteQuery, [bookId], function (err) {
    if (err) {
      return console.error('Error executing query:', err.message)
    }

    console.log(`Rows affected: ${this.changes}`)
    console.log(`Element with ID ${bookId} deleted successfully.`)
  })

  // Cerrar la conexión a la base de datos
  db.close((err) => {
    if (err) {
      return console.error('Error closing the database:', err.message)
    }
    console.log('Database connection closed.')
  })

  return nominee.title
}
export async function getFinished(channelId) {
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      throw new Error('Error connecting to database: ' + err.message)
    }
    console.log('Connection successful.')
  })

  const finished = await new Promise((resolve, reject) => {
    const query = 'SELECT * FROM finished WHERE channel_id = ?'

    db.all(query, [channelId], (err, rows) => {
      if (err) {
        console.log('Error obtaining finished')
        reject(err)
      } else {
        resolve(rows)
      }
    })
  })

  db.close((err) => {
    if (err) {
      throw new Error('Error disconnecting from database: ' + err.message)
    }
    console.log('Connection closed (list).')
  })

  return finished
}

export async function updateNominees(newNominees) {
  if (!newNominees || newNominees.length === 0) {
    console.error('No former winners to update nominees.')
    return
  }
  const db = new sqlite3.Database('library.db', (err) => {
    if (err) {
      throw new Error('Error connecting to database: ' + err.message)
    }
    console.log('Connected to the database.')
  })

  const query = 'UPDATE nominees SET votes = ?, winner = ? WHERE id = ?'

  try {
    // Wrap db.run in Promises to ensure all updates finish before closing the DB
    await Promise.all(
      newNominees.map((newNominee) => {
        return new Promise((resolve, reject) => {
          db.run(query, [newNominee.votes, newNominee.winner, newNominee.id], (err) => {
            if (err) {
              console.error(`Error updating book with ID ${newNominee.id}: `, err.message)
              reject(err)
            } else {
              console.log(`Updated book ID ${newNominee.id} with winner: ${newNominee.winner}`)
              resolve()
            }
          })
        })
      })
    )
  } catch (error) {
    console.error('Database update failed:', error)
    throw error
  } finally {
    db.close((err) => {
      if (err) {
        console.error('Error closing the database: ' + err.message)
      } else {
        console.log('Connection closed.')
      }
    })
  }
}
