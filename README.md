# smoke-pit-playlist
Clean up Spotify playlists for smoke pit usage.

### What it does:

smoke-pit-playlist converts your explicit Spotify playlists into clean Spotify playlists, 
so you can listen to your favorite music when your NCOs are around!

## How to run it:

1. Login to your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)
2. Create a "New App" and record your Client ID and Client Secret
3. Go to "Edit Settings" within your project and set the Redirect URI to http://localhost:3000/callback and save
4. Clone this GitHub repo or download the ZIP file. This example saves it to your desktop:

```
cd Desktop
git clone https://github.com/ajmeese7/smoke-pit-playlist.git
cd smoke-pit-playlist
```

5. Once you're in the project directory in Terminal, run the following npm command (make sure you already have [Node](https://nodejs.org/en/download/) installed)

```
npm install
```

6. Add your Client ID and Client Secret from your Spotify Developer Dashboard into `/src/.env`:

```
CLIENT_ID=YOURCLIENTID
CLIENT_SECRET=YOURCLIENTSECRET
```

7. Run the following commands
   ```
   cd src
   node server.js
   ```
8. Go to `http://localhost:3000/` in your browser
9. Login with Spotify and Cleanify your Playlists
10. Your new playlist will show up in your spotify account

### How it works:

Cleanify sends a request to Spotify's API for each song in the selected playlist with " clean" appended at the end. Often times, users have created a playlist with the Clean version of that song inside of it, so it shows at the top of the search results. Cleanify then compares each song in this recenetly searched for playlist to the song that the user has in their own playlist, and adds it to a new 'Cleanified' playlist if it is both non-explicit and has the same name. There is no method to ensure all songs in the playlist have a clean version, but using Cleanify gives you the best chance at finding the clean version if it is there, and removes it if it can't find the clean version of the song. This will make it so when you want to listen to your playlist around your parents, the songs will not have swear words :)

## Troubleshooting
### 401 Errors
When you link your GitHub repository to a Heroku instance, be sure to 
copy your local `.env` variables to the `Config Vars` section of the
Heroku settings. If you don't, you will experience lots of 401 errors
in your console.

### Credit

Project modified from original project [here](https://github.com/code-arman/Cleanify).

### TODOs
- Include album covers with names.track.album.images[2]
- Can link to the official song with names.track.external_urls.spotify on
top of displaying a preview with names.track.preview_url.
- Can get extra fancy with it and include popularity with names.track.popularity 
if desired.
- Add a feature to combine multiple playlists into one, removing duplicate IDs
in the process.
- Try to preserve playlist order, once intermeshing clean and recently cleaned songs.
   - getAfterCleanified; will become even more important when weaving playlists.
- Test with a HUGE playlist to see if timeout errors are still an issue, in which case
bottlenecking should be implemented.