const CJKUnifiedIdeographsBlock = [0x4E00, 0x9FCC];
const HangulSyllablesBlock = [0xAC00, 0xD7A3];
const DevanagariBlock = [0x0900, 0x097F];
const ArabicBlock = [0x0600, 0x06FF];
const BengaliBlock = [0x0980, 0x09FF];
const HiraganaBlock = [0x3040, 0x309F];
const KatakanaBlock = [0x30A0, 0x30FF];
const TeluguBlock = [0x0C00, 0x0C7F];
const LatinBlock = [0x0000, 0x007F];

const englishWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/google-10000-english-usa.txt'
const spanishWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/spanish.txt'
const portugueseWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/pt_50k.txt'
const frenchWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/fr_50k.txt'
const russianWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/ru_50k.txt'
const indonesianWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/Indonesia.dic.txt'
const germanWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/de_50k.txt'
const swahiliWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/sw_KE.dic.txt'
const vietnameseWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/Vietnamese_vi_VN.dic.txt'
const italianWordsURL = 'https://raw.githubusercontent.com/tobyalden/youhole2/master/dictionaries/it_50k.txt'
const dictionaries = [englishWordsURL, englishWordsURL, englishWordsURL, spanishWordsURL, portugueseWordsURL, frenchWordsURL, russianWordsURL, russianWordsURL, indonesianWordsURL, germanWordsURL, swahiliWordsURL, vietnameseWordsURL, italianWordsURL];

function getRandomCharactersFromUnicodeBlocks(blocks, numCharacters) {
    var randomCharacters = [];
    for(var i = 0; i < numCharacters; i++) {
        var block = blocks[Math.floor(Math.random() * blocks.length)];
        randomCharacters.push(String.fromCharCode(block[0] + Math.random() * (block[1] - block[0] + 1)));
    }
    return randomCharacters.join(" ");
}

const cron = require("node-cron");
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();
const db = require('./queries')
const port = 3000;

const apiKey = 'API_KEY_GOES_HERE';
const searchURL = 'https://www.googleapis.com/youtube/v3/search?order=date&part=snippet&type=video&safeSearch=none&maxResults=50&key=' + apiKey + '&q=';
const statsURL = 'https://www.googleapis.com/youtube/v3/videos?part=statistics&key=' + apiKey + '&id=';

app.use(bodyParser.json());
app.use(
    bodyParser.urlencoded({
        extended: true,
    })
);
app.use(function(req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

function parseSearchResults(response) {
    if(response.items == undefined) {
        if(response.error != undefined) {
            console.log("Error: " + response.error.message);
        }
        else {
            console.log("Unknown error: response.items was undefined");
        }
        return;
    }
    if(response.items.length == 0) {
        console.log("Search term resulted in no hits");
        return;
    }
    var uniqueChannelIds = [];
    for(var i = 0; i < response.items.length; i++) {
        var channelId = response.items[i].snippet.channelId;
        if(uniqueChannelIds.includes(channelId)) {
            console.log("Duplicate channel ID: " + channelId  + ". Skipping...");
            continue;
        }
        else {
            uniqueChannelIds.push(channelId);
        }
        request.get(statsURL + response.items[i].id.videoId, function(err, res, body) {
            var statsResponse = JSON.parse(body);
            if(
                statsResponse == undefined
                || statsResponse.items == undefined
                || statsResponse.items[0] == undefined
            ) {
                console.log("Stats unavailable.");
            }
            else {
                var viewCount = statsResponse.items[0].statistics.viewCount;
                if(viewCount > 500) {
                    console.log("Too many views: " + viewCount);
                }
                else {
                    console.log("Adding video with only " + viewCount + " views.");
                    var videoId = statsResponse.items[0].id;
                    db.pool.query('INSERT INTO unwatched(video_id) VALUES ($1)', [videoId], (error, results) => {
                        if (error) {
                            throw error;
                        }
                        else {
                            console.log("Video ID added");
                        }
                    });
                }
            }
        });
    }
}

function handleAjaxError(xhr) {
    console.log(
        'AJAX error! Request Status: ' + xhr.status +
        ' Status Text: ' + xhr.statusText +
        ' ResponseText: ' + xhr.responseText
    );
}

function onError(response) {
    console.log('onError called: ' + response);
}

function getUnicodeBlockSearchTerm() {
    var numberOfSearchMethods = 9;
    var searchMethod = Math.floor(Math.random() * numberOfSearchMethods) + 1;
    var searchTerm;
    if(searchMethod == 1) {
        // Three latin characters
        searchTerm = getRandomCharactersFromUnicodeBlocks([LatinBlock], 3);
    }
    else if(searchMethod == 2) {
        // One Hangul syllable
        searchTerm = getRandomCharactersFromUnicodeBlocks([HangulSyllablesBlock], 1);
    }
    else if(searchMethod == 3) {
        // One Devanagari character (only ~125 characters, may be prone to repeats)
        searchTerm = getRandomCharactersFromUnicodeBlocks([DevanagariBlock], 1);
    }
    else if(searchMethod == 4) {
        // One Arabic character (only ~250 characters, may be prone to repeats)
        searchTerm = getRandomCharactersFromUnicodeBlocks([ArabicBlock], 1);
    }
    else if(searchMethod == 5) {
        // One Bengali character (only ~125 characters, may be prone to repeats)
        searchTerm = getRandomCharactersFromUnicodeBlocks([BengaliBlock], 1);
    }
    else if(searchMethod == 6) {
        // Two Hiragana characters
        searchTerm = getRandomCharactersFromUnicodeBlocks([HiraganaBlock], 2);
    }
    else if(searchMethod == 7) {
        // Two Katakana characters
        searchTerm = getRandomCharactersFromUnicodeBlocks([KatakanaBlock], 2);
    }
    else if(searchMethod == 8) {
        // One Telugu character (only ~125 characters, may be prone to repeats)
        searchTerm = getRandomCharactersFromUnicodeBlocks([TeluguBlock], 1);
    }
    else {
        // One CJK character
        searchTerm = getRandomCharactersFromUnicodeBlocks([CJKUnifiedIdeographsBlock], 1);
    }
    return searchTerm;
}

function fetchVideoIds() {
    if(Math.random() > 0.5) {
        var searchTerm = getUnicodeBlockSearchTerm();
        console.log('Using search term ' + searchTerm);
        request.get(searchURL + encodeURI(searchTerm), function(err, res, body) {
            if(!err) {
                parseSearchResults(JSON.parse(body));
            }
        });
    }
    else {
        var dictionary = dictionaries[Math.floor(Math.random() * dictionaries.length)];
        console.log('Using dictionary: ' + dictionary);
        request.get(dictionary, function(err, res, body) {
            if(!err) {
                var searchTerm = getRandomLinesFromTextFile(body, 1);
                console.log('Using search term ' + searchTerm);
                request.get(searchURL + encodeURI(searchTerm), function(err, res, body) {
                    if(!err) {
                        parseSearchResults(JSON.parse(body));
                    }
                });
            }
        });
    }
}

app.get('/', (req, res) => {
    fetchVideoIds();
    res.json({ info: 'Making requests...' });
});

function getRandomLinesFromTextFile(textFile, numLines) {
    var allLines = textFile.split("\n");
    var randomLines = [];
    for(var i = 0; i < numLines; i++) {
        var index = Math.floor(allLines.length * Math.random());
        randomLines.push(allLines[index].split("/")[0].split(" ")[0]);
    }
    return randomLines.join(" ");
}

app.get('/unwatched', db.getVideoId)
app.post('/unwatched', db.addIdToUnwatched)

cron.schedule("* * * * *", function() {
    console.log("Cron activated. Fetching video IDs...");
    fetchVideoIds();
});

app.listen(port, () => {
    console.log('App running on port ' + port);
})
