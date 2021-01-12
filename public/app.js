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

/*var Bottleneck = require('bottleneck');
const limiter = new Bottleneck({
  maxConcurrent: 5,
  minTime: 500,
});*/

// TODO: Break the page if this returns undefined, redirect to main URL
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
	.then(
		data =>
			(document.getElementById('theUsersName').innerHTML =
				`Signed in as <strong>${data.display_name}</strong`)
	);
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
 * Once the "cleanify playlist button" is pressed, this function
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

/** Gets the tracks from the original playlist */
function getAndDisplayTracks(checkedPlaylistID, newPlaylistID) {
	fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/tracks`, {
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(data => {
		console.log("getAndDisplayTracks data:", data);

		let cleanTracks = [];
		let tracksInPlaylist;
		data.items.forEach(function(names, index) {
			if (!names.track.explicit) {
				// TODO: Make sure explicit songs are still being processed
				cleanTracks.push('spotify:track:' + names.track.id);
			}

			// TODO: Stop this at 20, then have a "Show more..." pagination button
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

		addTracksIntoCleanfiedPlaylist(newPlaylistID, cleanTracks);
		findCleanVersionOfSongs(checkedPlaylistID, newPlaylistID);
		getAfterCleanified(newPlaylistID);

		// Display "After Cleanified"
	});
}

function getAfterCleanified(newPlaylistID) {
	setTimeout(function() {
		// NOTE, implicit URL is as follows:
		// https://api.spotify.com/v1/playlists/71GcVkQyHGke5ZIoOto5uI/tracks?offset=0&limit=100
		// So I can apply the pagination feature here as well.
		fetch(`https://api.spotify.com/v1/playlists/${newPlaylistID}/tracks`, {
			headers: jsonHeaders
		})
		.then(res => res.json())
		.then(data => {
			console.log("getAfterCleanified data:", data);

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
	}, 3000);
}

function addTracksIntoCleanfiedPlaylist(playlistID, cleanTracks) {
	// `https://api.spotify.com/v1/playlists/5U74wGWvE7pepqLyYSklT1/tracks`,
	fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks`, {
		method: 'POST',
		body: JSON.stringify({
			uris: cleanTracks
		}),
		headers: jsonHeaders
	})
	.then(res => res.json());
}

/** Add all of the explicit songs you want to look for into an array */
function findCleanVersionOfSongs(checkedPlaylistID, newPlaylistID) {
	fetch(`https://api.spotify.com/v1/playlists/${checkedPlaylistID}/tracks`, {
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(data => {
		//let explicitTracks = [];
		data.items.forEach((names) => {
			if (names.track.explicit)
				// TODO: Find a better method of finding the clean track;
				// TODOOOOOO -> Roll with this, go thru results and see if
				// song name w/ non-explicit checker works
				searchForSong(names.track.name, newPlaylistID);
				//explicitTracks.push(`${names.track.name} Clean`);
		});

		//for (let i = 0; i < explicitTracks.length; i++)
			//searchForSong(explicitTracks[i], newPlaylistID);
	});
}

// TODO: See if I can avoid this shitty playlist method and instead directly
// search for the song by the same artist and select which of the two songs
// is not the explicit, if there are two results.
function searchForSong(songTitle, newPlaylistID) {
	fetch(`https://api.spotify.com/v1/search?q=${songTitle}&type=playlist`, {
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(data => {
		if (data.playlists.items.length == 0) return;

		theRandomPlaylistWithCleanSongID = data.playlists.items[0].id;
		getFirstSongInPlaylist(
			theRandomPlaylistWithCleanSongID,
			songTitle,
			newPlaylistID
		);
	});
}

// TODO: Include album covers with names.track.album.images[2], and can
// link to the official song with names.track.external_urls.spotify on
// top of displaying a preview with names.track.preview_url. Can get extra
// fancy with it and include popularity with names.track.popularity if desired.
function getFirstSongInPlaylist(playlistID, songTitle, newPlaylistID) {
	fetch(`https://api.spotify.com/v1/playlists/${playlistID}/tracks`, {
		headers: jsonHeaders
	})
	.then(res => res.json())
	.then(data => {
		console.log("getFirstSongInPlaylist data:"/*, data*/);

		let cleanTracks = [];
		data.items.forEach(function(names) {
			//console.log("Track:", names.track);
			//console.log(`TRACK NAME: ${names.track.name}, SLICE: ${songTitle.slice(0, -6)}`);
			if (
				!names.track.explicit &&
				// TODO: Change this part as well, invalid assumption;
				// IDEA: Check the artist here instead?
				names.track.name === songTitle.slice(0, -6)
			) {
				console.log("PUSHING TRACK TO PLAYLIST:", names.track);
				cleanTracks.push('spotify:track:' + names.track.id);
			}
		});
		addTracksIntoCleanfiedPlaylist(newPlaylistID, cleanTracks);
	});
}
