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
	// Show loader until data is all displayed
	let spinner = document.getElementsByClassName('spinner-border')[0];
	spinner.style.display = 'block';

	fetch('https://api.spotify.com/v1/me/playlists', {
		headers: plainHeaders
	})
	.then(res => res.json())
	.then(async data => {
		// TODO: Gather all the images async simultaneously, then continue;
			// IDEA: Can go back over list of IDs and change src attribute
		let playlistItems = '';
		for (const playlist of data.items) {
			let imageURL = await getPlaylistImage(playlist.id);
			playlistItems += `
				<ul class="list-group list-group-flush">
					<li class="list-group-item">
						<input type="radio" name="playlistTitles" id="${playlist.id}" value="${playlist.name}">
						<img class="playlistCover" src="${imageURL}" />
						<p>${playlist.name}</p>
					</li>
				</ul>
			`;
		};
		document.getElementById('playlistItems').innerHTML = playlistItems;
		spinner.style.display = 'none';
	});
}

/**
 * Gets the cover image of the specified playlist, if it exists.
 * @param {string} playlistId 
 * @returns {string}
 */
async function getPlaylistImage(playlistId) {
	const getImageURL = async () => {
		const res = await axios({
			url: `https://api.spotify.com/v1/playlists/${playlistId}/images`,
			headers: plainHeaders
		});
    return res.data[0].url;
  }

  return (async () => await getImageURL() )();
}

/** 
 * Once the "Cleanify Playlist" button is pressed, this function
 * creates a new playlist based off of the existing playlists name, and
 * it displays the tracks of the original playlist and shows which tracks
 * are explicit.
 */
function createCleanifiedPlaylist() {
	const [checkedPlaylistID, checkedPlaylistName] = getCheckedPlaylistInfo();
	if (!checkedPlaylistID) return;

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
 * Gathers the information for the selected user's playlist.
 * @returns {array} [playlist ID, playlist name]
 */
function getCheckedPlaylistInfo() {
	let playlists = document.getElementsByName('playlistTitles');
	for (let i = 0; i < playlists.length; i++)
		if (playlists[i].checked)
			return [playlists[i].id, playlists[i].value];

	return [null, null];
}

/**
 * Gets the tracks from the original playlist.
 * @param {string} checkedPlaylistID 
 * @param {string} newPlaylistID 
 */
function getAndDisplayTracks(checkedPlaylistID, newPlaylistID) {
	// Show loader until data is all displayed
	let spinner = document.getElementsByClassName('spinner-border')[1];
	spinner.style.display = 'block';
	clearPreviousResults();

	fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/tracks`, {
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(data => {
		// TODO: Figure out where the hell the undefined text is coming from and
		// what it is supposed to say
		let finalPlaylistArray = new Array(data.items.length);
		let dirtyTracks = [];
		let tracksInPlaylist, pageNumber = 1;
		data.items.forEach(function(names, index) {
			if (!names.track.explicit)
				finalPlaylistArray[index] = 'spotify:track:' + names.track.id;
			else
				dirtyTracks.push({index: index, track: names.track});

			// TODO: Stop this at 20, then have a "Show more..." pagination button
			if (index % 20 == 0) pageNumber++;
			tracksInPlaylist += `
				<ul class="list-group list-group-flush">
					<li class="list-group-item" name="trackTitles" trackId="${names.track.id}" explicit="${names.track.explicit}">
						<p>${index + 1}. ${names.track.name}</p>
					</li>
				</ul>
			`;
		});

		document.getElementById('tracksInPlaylist').innerHTML = tracksInPlaylist;
		document.getElementById(
			'numberOfSongsBeforeCleanified'
		).innerHTML = `(${data.total} total)`;

		spinner.style.display = 'none';
		findCleanVersionOfSongs(dirtyTracks, finalPlaylistArray, newPlaylistID);
	});
}

/**
 * Add all of the explicit songs you want to look for into an array.
 * @param {array} dirtyTracks - song objects that need to be cleaned.
 * @param {array} finalPlaylistArray - array of the final playlist.
 * @param {string} newPlaylistID - Spotify ID of the new clean playlist.
 */
async function findCleanVersionOfSongs(dirtyTracks, finalPlaylistArray, newPlaylistID) {
	for (const songObject of dirtyTracks) {
		const track = songObject.track;
		const cleanVersionOfSong = await searchForSong(track.name, track.artists[0].name);
		finalPlaylistArray[songObject.index] = cleanVersionOfSong;
	}

	// Clear all null values, leaving only clean versions of
	// songs in their original order.
	finalPlaylistArray = finalPlaylistArray.filter(Boolean);
	await addTracksToCleanPlaylist(newPlaylistID, finalPlaylistArray);
	getAfterCleanified(newPlaylistID);
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
 * Pushes the array of clean tracks to the new Spotify playlist.
 * @param {string} newPlaylistID - newly created playlist ID on Spotify
 * @param {array} cleanTracks - array of clean songs to be added
 * to the specified new playlist.
 */
async function addTracksToCleanPlaylist(newPlaylistID, cleanTracks) {
	// Splits the array of cleanTracks into smaller arrays of a maximum
	// of 50 elements, to upload in batches. Method used:
	// https://stackoverflow.com/a/37826698/6456163
	if (cleanTracks.length == 0) return;
	const chunkSize = 50;
	const chunks = cleanTracks.reduce((resultArray, item, index) => { 
		const chunkIndex = Math.floor(index / chunkSize);
		if (!resultArray[chunkIndex])
			// Start a new chunk
			resultArray[chunkIndex] = [];
	
		resultArray[chunkIndex].push(item);
		return resultArray;
	}, []);

	const url = `https://api.spotify.com/v1/playlists/${newPlaylistID}/tracks`;
	for (const chunk of chunks) {
		await axios({
			url: url,
			method: 'post',
			data: JSON.stringify({
				uris: chunk
			}),
			headers: jsonHeaders
		});
	}
}

/**
 * Retrieve and display the tracks from the newly created
 * clean playlist.
 * @param {string} newPlaylistID - newly created playlist ID on Spotify
 */
function getAfterCleanified(newPlaylistID) {
	// Show loader until data is all displayed
	let spinner = document.getElementsByClassName('spinner-border')[2];
	spinner.style.display = 'block';

	// https://api.spotify.com/v1/playlists/71GcVkQyHGke5ZIoOto5uI/tracks?offset=0&limit=100
	fetch(`https://api.spotify.com/v1/playlists/${newPlaylistID}/tracks`, {
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(data => {
		// TODO: Also paginate, same as getAndDisplayTracks
		let tracksInNewPlaylist;
		data.items.forEach((names, index) =>
			tracksInNewPlaylist += `
				<ul class="list-group list-group-flush">
					<li class="list-group-item" name="trackTitles" trackId="${names.track.id}" explicit="${names.track.explicit}">
						${index + 1}. ${names.track.name}
					</li>
				</ul>
			`
		);

		document.getElementById(
			'tracksInNewPlaylist'
		).innerHTML = tracksInNewPlaylist;
		document.getElementById(
			'numberOfSongsAfterCleanified'
		).innerHTML = `(${data.total} total)`;
		spinner.style.display = 'none';
	});
}

/** Removes all <ul> elements in the second two columns. */
function clearPreviousResults() {
	// https://stackoverflow.com/a/46424870/6456163
	let tracksInPlaylistElem = document.getElementById('tracksInPlaylist');
	tracksInPlaylistElem.querySelectorAll('ul').forEach(e => e.parentNode.removeChild(e));
	let tracksInNewPlaylistElem = document.getElementById('tracksInNewPlaylist');
	tracksInNewPlaylistElem.querySelectorAll('ul').forEach(e => e.parentNode.removeChild(e));
}