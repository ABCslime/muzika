import fetch from 'node-fetch'; // Import node-fetch
import prettier from 'prettier';
import cheerio from 'cheerio';
export class Download {
    constructor() {
    }
    delay = millis => new Promise((resolve, reject) => {
        setTimeout(_ => resolve(), millis)
    });


    async login() {
        return fetch("http://api:5030/api/v0/session", {
            method: "POST",
            body: JSON.stringify({
                password: "slskd",
                username: "slskd",

            }),
            headers: {
                "Content-type": "application/json; charset=UTF-8"
            }
        }).then((response) => response.json())
            .then((json) => {return  json.token});
    }

    get(name,id) {

        return new Promise(async (resolve, reject) => {

            try{

                if (this.token == null) {

                    this.token = await this.login()
                    console.log("Bearer " + this.token)

                }
                let Authorization = "Bearer " + this.token


                const response = await fetch("http://api:5030/api/v0/searches", {
                    credentials: "include",
                    headers: {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Content-Type": "application/json",
                        "Authorization": Authorization,
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin",
                        "Priority": "u=0"
                    },
                    referrer: "http://api:5030/searches",
                    body: JSON.stringify({
                        id: id,
                        searchText: name.artist+" "+name.name
                    }), // id needs to be static, ensure to handle the search after downloading
                    method: "POST",
                    mode: "cors"
                }).catch(error => { throw error});

                // Optional: Add a delay to avoid overwhelming the server
                await new Promise(resolve => setTimeout(resolve, 20000));


                let data = await fetch("http://api:5030/api/v0/searches/" + id + "/responses", {
                    "credentials": "include",
                    "headers": {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Authorization": Authorization,
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin"
                    },
                    "referrer": "http://api:5030/searches/" + id,
                    "method": "GET",
                    "mode": "cors"
                }).then((response) => response.json()).catch(error => { throw error})




                const filteredData = data.filter(item => item.hasFreeUploadSlot && item.fileCount > 0);

                filteredData.sort((a, b) => {
                    return -(a.uploadSpeed - b.uploadSpeed); // Use subtraction for numerical comparison
                });

                // Log the sorted data

                let filename;

                await new Promise(resolve => setTimeout(resolve, 2000));


                console.log(`files found for ${name.name}`);

                filename = filteredData[0].files[0].filename;
                let size = filteredData[0].files[0].size;

                await fetch("http://api:5030/api/v0/transfers/downloads/" + filteredData[0].username, {
                    "credentials": "include",
                    "headers": {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Content-Type": "application/json",
                        "Authorization": Authorization,
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin",
                        "Priority": "u=0"
                    },
                    "referrer": "http://api:5030/searches/" + id,
                    "body": "[{\"filename\":\"" + escapePath(filename) + "\",\"size\":" + size + "}]",
                    "method": "POST",
                    "mode": "cors"
                }).catch(error => { throw error});

                await this.delay(20000);





                await fetch("http://api:5030/api/v0/searches/" + id, {
                    "credentials": "include",
                    "headers": {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Authorization": Authorization,
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin",
                        "Priority": "u=0"
                    },
                    "referrer": "http://api:5030/searches",
                    "method": "DELETE",
                    "mode": "cors"
                }).catch(error => { throw error});
                resolve({path:formatFilePath(filename),name:name.name,artist:name.artist});
            }catch (e) {
                let Authorization = "Bearer " + this.token
                await fetch("http://api:5030/api/v0/searches/" + id, {
                    "credentials": "include",
                    "headers": {
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
                        "Accept": "application/json, text/plain, */*",
                        "Accept-Language": "en-US,en;q=0.5",
                        "Authorization": Authorization,
                        "Sec-Fetch-Dest": "empty",
                        "Sec-Fetch-Mode": "cors",
                        "Sec-Fetch-Site": "same-origin",
                        "Priority": "u=0"
                    },
                    "referrer": "http://api:5030/searches",
                    "method": "DELETE",
                    "mode": "cors"
                }).catch(error => { throw error});
                reject(name.name)
            }
        })
    }


    async findRandom(){



        let date = getRandomDate()

        try{
            const response = await fetch("https://www.beatport.com/genre/afro-house/15/tracks?publish_date="+stringfyDate(date)+"%3A"+stringfyDate(addWeeks(date,2))+"&page=1&per_page=150", {
                "credentials": "include",
                "headers": {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:128.0) Gecko/20100101 Firefox/128.0",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/png,image/svg+xml,*/*;q=0.8",
                    "Accept-Language": "en-US,en;q=0.5",
                    "Alt-Used": "www.beatport.com",
                    "Upgrade-Insecure-Requests": "1",
                    "Sec-Fetch-Dest": "document",
                    "Sec-Fetch-Mode": "navigate",
                    "Sec-Fetch-Site": "none",
                    "Sec-Fetch-User": "?1",
                    "Priority": "u=0, i"
                },
                "method": "GET",
                "mode": "cors"
            })
            const text = await response.text();

            // Load the HTML content into Cheerio
            const $ = cheerio.load(text);

            const scriptTags = $('script#__NEXT_DATA__');
            const lastScriptTagContent = scriptTags.last().html();

            // Check if content is found
            if (lastScriptTagContent) {
                // Parse the JSON data
                const jsonData = JSON.parse(lastScriptTagContent);
                let array = jsonData.props.pageProps.dehydratedState.queries[1].state.data.results
                let song = array[getRandomInt(0, array.length)]
                let artist = extractArtistNamesAsString(song)
                let out = artist+" "+song.name
                console.log(out)
                return {artist:artist, name:song.name}
                // Print the parsed JSON data
                //console.log(JSON.stringify(array[getRandomInt(0, array.length)], null, 2)); // Pretty print JSON
            } else {
                console.log('No <script> tag with id="__NEXT_DATA__" found.');
            }
        }catch (e){
            return null
        }




    }



}

function escapePath(path) {
    return path.replace(/\\/g, '\\\\');
}

function formatHtml(html) {
    try {
        return prettier.format(html, { parser: 'html' });
    } catch (error) {
        console.error('Error formatting HTML:', error);
        return html; // Return the original HTML in case of an error
    }
}

function formatFilePath(sourcePath) {
    // Split the source path by backslashes
    const pathSegments = sourcePath.split('\\');

    // Get the last two segments of the path
    const lastTwoSegments = pathSegments.slice(-2).join('/');



    // Define the target directory prefix
    const targetPrefix = "/rw/downloads/";

    // Combine the target prefix with the formatted path
    return targetPrefix + lastTwoSegments;
}

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getRandomDate() {
    // Convert date strings to Date objects
    const start = new Date(2000,0,1);
    const end = new Date();

    // Calculate the difference in milliseconds between the two dates
    const diff = end - start;

    // Generate a random number of milliseconds to add to the start date
    const randomDiff = Math.floor(Math.random() * diff);

    // Create the random date by adding the random milliseconds to the start date
    return new Date(start.getTime() + randomDiff);


}

function stringfyDate(date){
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0'); // Months are 0-based, so add 1
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addWeeks(date, weeks) {
    const result = new Date(date); // Create a new Date object to avoid modifying the original date
    result.setDate(result.getDate() + (weeks * 7)); // Add the number of weeks (converted to days) to the date
    return result; // Return the updated date
}

function extractArtistNamesAsString(jsonData) {
    // Parse the JSON data if it's a string
    const data = typeof jsonData === 'string' ? JSON.parse(jsonData) : jsonData;

    // Ensure data is in the expected format
    if (!data || !Array.isArray(data.artists)) {
        throw new Error('Invalid data format');
    }

    // Extract artist names and join them into a single string separated by spaces
    return data.artists.map(artist => artist.name).join(' ');
}
