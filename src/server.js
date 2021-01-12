const express = require('express');
const request = require('request');
const app = express();
const path = require('path');
require('dotenv').config();

const PORT = process.env.PORT || 3000; // Heroku or local
const my_client_id = process.env.CLIENT_ID;
const client_secret = process.env.CLIENT_SECRET;
const redirect_uri = process.env.PORT ?
	'https://smoke-pit-playlist.herokuapp.com/callback'
	:
	'http://localhost:3000/callback';

app
	.use(express.static(path.join(__dirname, '../public')))
	.get('/index.html', (req, res) => {
		res.sendFile(path.join(__dirname, '../public/index.html'));
	})
	.get('/', (req, res) => {
		res.sendFile(path.join(__dirname, '../public/index.html'));
	})
	.get('/home', (req, res) => {
		res.sendFile(path.join(__dirname, '../public/home.html'));
	})
	.get('/login', function(req, res) {
		const scopes =
			'user-read-private user-read-email playlist-modify-public playlist-modify-private playlist-read-private playlist-read-collaborative ';
		res.redirect(
			'https://accounts.spotify.com/authorize' +
				'?response_type=code' +
				'&client_id=' +
				my_client_id +
				(scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
				'&redirect_uri=' +
				encodeURIComponent(redirect_uri)
		);
	})
	.get('/callback', function(req, res) {
		let code = req.query.code || null;
		let authOptions = {
			url: 'https://accounts.spotify.com/api/token',
			form: {
				code: code,
				redirect_uri,
				grant_type: 'authorization_code'
			},
			headers: {
				Authorization:
					'Basic ' +
					Buffer.from(my_client_id + ':' + client_secret).toString('base64')
			},
			json: true
		};
		request.post(authOptions, function(error, response, body) {
			var access_token = body.access_token;
			const uri = process.env.PORT ?
				'https://smoke-pit-playlist.herokuapp.com/home'
				:
				'http://localhost:3000/home';
			res.redirect(uri + '?access_token=' + access_token);
		});
	})
	.get('*', (req, res) => {
		res.sendFile(path.join(__dirname, '../public/error.html'));
	})
	.listen(PORT, () => console.log(`Listening on ${ PORT }`));