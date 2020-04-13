const Pool = require('pg').Pool
const pool = new Pool({
    user: 'me',
    host: 'localhost',
    database: 'youhole',
    password: 'password',
    port: 5432,
})

const getVideoId = (request, response) => {
    pool.query('SELECT * FROM unwatched ORDER BY RANDOM() LIMIT 1', (error, results) => {
        if(error) {
            throw error;
        }
        var id = results.rows[0].id;
        pool.query('DELETE FROM unwatched WHERE id = $1', [results.rows[0].id], (error, results) => {
            if (error) {
                throw error;
            }
        });
        pool.query('INSERT INTO watched(video_id) VALUES ($1)', [results.rows[0].video_id], (error, results) => {
            if (error) {
                throw error;
            }
        });
        response.status(200).json(results.rows);
    });
}

const addIdToUnwatched = (request, response) => {
    var videoId = request.body.video_id;
    pool.query('INSERT INTO unwatched(video_id) VALUES ($1)', [videoId], (error, results) => {
        if (error) {
            throw error;
        }
        response.status(201).send('Video ID added.');
    });
}

module.exports = {
    getVideoId,
    addIdToUnwatched,
    pool,
}
