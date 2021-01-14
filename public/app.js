// Gets the accessToken from the search bar paramater
const urlParams = new URLSearchParams(window.location.search);
const accessToken = urlParams.get('access_token');
const plainHeaders = {
	Authorization: 'Bearer ' + accessToken
};
const jsonHeaders = {
	Authorization: 'Bearer ' + accessToken,
	'Content-Type': 'application/json'
};

getSpotifyUsername();
getPlaylists();

let submit = document.getElementById('submit');
submit.addEventListener('click', createCleanifiedPlaylist, false);

let deleted = document.getElementById('delete');
deleted.addEventListener('click', deletePlaylist, false);

/** Gets Spotify username of the current user's account. */
function getSpotifyUsername() {
	fetch('https://api.spotify.com/v1/me', {
		headers: plainHeaders
	})
	.then(res => res.json())
	.then(data => {
		if (!data || !data.display_name) {
			console.error(
				"One of the following occured:\n" +
				"1) You tried to access the home page without logging in\n" +
				"2) You were idle for too long and your access token expired\n" +
				"3) Your login failed for some other reason\n" +
				"As a result, the site is going to redirect you back to the " +
				"login page. Please try again, and make an issue on the " +
				"repository if the problem persists!"
			);
			return window.location.pathname = '/index.html';
		}

		document.getElementById('theUsersName').innerHTML =
			`Signed in as <strong>${data.display_name}</strong`;
	});
}

/** Gets all playlists that the user follows. */
function getPlaylists() {
	fetch('https://api.spotify.com/v1/me/playlists', {
		headers: plainHeaders
	})
	.then(res => res.json())
	.then(data => {
		let playlistItems = '';
		data.items.forEach(function(names) {
			playlistItems += `
				<ul class="list-group list-group-flush">
					<li class="list-group-item">
						<input type="radio" name="playlistTitles" id="${names.id}" value="${names.name}">
						${names.name}
					</li>
				</ul>
			`;
		});
		document.getElementById('playlistItems').innerHTML = playlistItems;
	});
}

/**
 * Deletes the selected ORIGINAL playlist, NOT the clean version.
 * TODO: Remove this feature and instead apply it to the newly
 * created playlist, nobody should want to use this tool to
 * delete playlists.
 */
function deletePlaylist() {
	const [checkedPlaylistID, checkedPlaylistName] = getCheckedPlaylistInfo();
	fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/followers`, {
		method: 'DELETE',
		headers: plainHeaders
	})
	.then(res => res.json());

	location.reload();
	alert(`Deleted playlist named: ${checkedPlaylistName}`);
}

/**
 * Gathers the information for the selected user's playlist.
 * @returns {array} [playlist ID, playlist name]
 */
function getCheckedPlaylistInfo() {
	let playlists = document.getElementsByName('playlistTitles');
	for (let i = 0; i < playlists.length; i++)
		if (playlists[i].checked)
			return [playlists[i].id, playlists[i].value];
}

/** 
 * Once the "Cleanify Playlist" button is pressed, this function
 * creates a new playlist based off of the existing playlists name, and
 * it displays the tracks of the original playlist and shows which tracks
 * are explicit.
 */
function createCleanifiedPlaylist() {
	const [checkedPlaylistID, checkedPlaylistName] = getCheckedPlaylistInfo();

	// Creates new playlist
	fetch('https://api.spotify.com/v1/me/playlists', {
		method: 'POST',
		body: JSON.stringify({
			name: checkedPlaylistName + ' (Clean)',
			public: false
		}),
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(data => getAndDisplayTracks(checkedPlaylistID, data.id));
}

/**
 * Gets the tracks from the original playlist.
 * @param {string} checkedPlaylistID 
 * @param {string} newPlaylistID 
 */
function getAndDisplayTracks(checkedPlaylistID, newPlaylistID) {
	fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/tracks`, {
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(data => {
		// TODO: Figure out where the hell the undefined text is coming from and
		// what it is supposed to say
		let cleanTracks = [];
		let tracksInPlaylist, pageNumber = 1;
		data.items.forEach(function(names, index) {
			if (!names.track.explicit)
				cleanTracks.push('spotify:track:' + names.track.id);

			// TODO: Stop this at 20, then have a "Show more..." pagination button
			if (index % 20 == 0) pageNumber++;
			tracksInPlaylist += `
				<ul class="list-group list-group-flush">
					<li class="list-group-item" name="trackTitles" trackId="${names.track.id}" explicit="${names.track.explicit}">
						${index + 1}. ${names.track.name}
					</li>
				</ul>
			`;
		});

		document.getElementById('tracksInPlaylist').innerHTML = tracksInPlaylist;
		document.getElementById(
			'numberOfSongsBeforeCleanified'
		).innerHTML = `(${data.total} total)`;

		// TODO: Make sure less than 100, or break into batches first
		addTracksToCleanPlaylist(newPlaylistID, cleanTracks);
		findCleanVersionOfSongs(checkedPlaylistID, newPlaylistID);
	});
}

/**
 * Add all of the explicit songs you want to look for into an array.
 * @param {string} checkedPlaylistID 
 * @param {string} newPlaylistID 
 */
function findCleanVersionOfSongs(checkedPlaylistID, newPlaylistID) {
	fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/tracks`, {
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(async (data) => {
		// TODO: Add bottlenecking here if absolutely necessary
		let cleanTracks = [];
		for (const item of data.items) {
			// https://www.coreycleary.me/why-does-async-await-in-a-foreach-not-actually-await
			const track = item.track;
			if (track.explicit) {
				const cleanVersionOfSong = await searchForSong(track.name, track.artists[0].name);
				if (cleanVersionOfSong) cleanTracks.push(cleanVersionOfSong);
			}

			// Every 50 clean songs, add them to the playlist and reset the clean queue
			if (cleanTracks.length > 50) {
				await addTracksToCleanPlaylist(newPlaylistID, cleanTracks);
				cleanTracks = [];
			}
		}

		// Catch any stragglers after uploading clean songs in batches of 50
		if (cleanTracks.length > 0)
			await addTracksToCleanPlaylist(newPlaylistID, cleanTracks);

		getAfterCleanified(newPlaylistID);
	});
}

/**
 * Search Spotify for the song name and artist name, then iterate over
 * the results looking for the first non-explicit match.
 * @param {string} songTitle - Title of the song.
 * @param {string} artistName - Name of the primary artist of the song.
 * @returns {string|undefined} - Track string for clean version of song,
 * or null if a clean version cannot be found.
 */
async function searchForSong(songTitle, artistName) {
	let url = `https://api.spotify.com/v1/search?q=${songTitle + " " + artistName}&type=track`;
	const res = await axios({
		url: url,
		headers: jsonHeaders
	});

	let returnValue = null;
	await res.data.tracks.items.forEach(function(track) {
		if (!track.explicit && track.name === songTitle)
			returnValue = 'spotify:track:' + track.id;
	});

	return returnValue;
}

/**
 * Pushes the array of clean tracks to the new Spotify playlist,
 * up to 100 at a time.
 * @param {string} newPlaylistID - newly created playlist ID on Spotify
 * @param {array} cleanTracks - array of clean songs to be added
 * to the specified new playlist.
 */
async function addTracksToCleanPlaylist(newPlaylistID, cleanTracks) {
	const url = `https://api.spotify.com/v1/playlists/${newPlaylistID}/tracks`;
	await axios({
		url: url,
		method: 'post',
		data: JSON.stringify({
			uris: cleanTracks
		}),
		headers: jsonHeaders
	});
}

/**
 * Retrieve and display the tracks from the newly created
 * clean playlist.
 * @param {string} newPlaylistID - newly created playlist ID on Spotify
 */
function getAfterCleanified(newPlaylistID) {
	// TODO: Clear the HTML when starting new playlist, and add loading icon

	// https://api.spotify.com/v1/playlists/71GcVkQyHGke5ZIoOto5uI/tracks?offset=0&limit=100
	fetch(`https://api.spotify.com/v1/playlists/${newPlaylistID}/tracks`, {
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(data => {
		// TODO: Also paginate, same as getAndDisplayTracks
		let tracksInNewPlaylist;
		data.items.forEach(function(names, index) {
			tracksInNewPlaylist += `
				<ul class="list-group list-group-flush">
					<li class="list-group-item" name="trackTitles" trackId="${names.track.id}" explicit="${names.track.explicit}">
						${index + 1}. ${names.track.name}
					</li>
				</ul>
			`;
		});

		document.getElementById(
			'tracksInNewPlaylist'
		).innerHTML = tracksInNewPlaylist;
		document.getElementById(
			'numberOfSongsAfterCleanified'
		).innerHTML = `(${data.total} total)`;
	});
}