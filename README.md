# smoke-pit-playlist
Clean up Spotify playlists for smoke pit usage.

### What it does:

smoke-pit-playlist converts your explicit Spotify playlists into clean Spotify playlists, 
so you can listen to your favorite music when your NCOs are around!

### Credit

Project modified from original project [here](https://github.com/code-arman/Cleanify).

## Development:

1. Login to your [Spotify Developer Dashboard](https://developer.spotify.com/dashboard/applications)
2. Create a "New App" and record your Client ID and Client Secret
3. Go to "Edit Settings" within your project and set the Redirect URI to http://localhost:3000/callback and save
4. Clone this GitHub repo or download the ZIP file. This example saves it to your desktop:

```
cd Desktop
git clone https://github.com/ajmeese7/smoke-pit-playlist.git
cd smoke-pit-playlist
```

5. Once you're in the project directory in your terminal, run `npm install`.
6. Add your Client ID and Client Secret from your Spotify Developer Dashboard into `/src/.env`:

```
CLIENT_ID=YOURCLIENTID
CLIENT_SECRET=YOURCLIENTSECRET
```

7. Run the following commands
```
cd src
npm run devstart
```
8. Go to `http://localhost:3000/` in your browser
9. Login with Spotify and clean your playlists
10. Your new playlist will show up in your Spotify account

## Run an Instance
You only need to run `node server.js` from inside the `src` directory when the application
is in production. Nodemon is only used while under development to save you the time it
would take to kill the program and restart it manually.

## Troubleshooting
### 401 Errors
If you link your GitHub repository to a Heroku instance, be sure to 
copy your local `.env` variables to the `Config Vars` section of the
Heroku settings. If you don't, you will experience lots of 401 errors
in your console due to the lack of valid API credentials.

### TODOs
- Can link to the official song with names.track.external_urls.spotify on
top of displaying a preview with names.track.preview_url.
- Can get extra fancy with it and include popularity with names.track.popularity 
if desired.
- Add a feature to combine multiple playlists into one, removing duplicate IDs
in the process.
	- Switch from radio buttons to checkboxes if going with
		the "Combine playlists" idea in getPlaylists().
- Test with a HUGE playlist to see if timeout errors are still an issue, in which case
bottlenecking should be implemented.
- Don't display playlist in "Playlists" if it has already been cleaned.
- Implement Axios error handling.
	- https://stackoverflow.com/a/58417391/6456163
- Make tall pictures cover properly for playlist images.