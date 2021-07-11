/** Zeros Origin Index. */

const webSocket = require( 'ws' );
const http = require( 'http' );
const path = require( 'path' );
const express = require( 'express' );
const nobots = require( 'express-nobots' );
const favicon = require( 'serve-favicon' );
const app = express();
const ngrok = require( 'ngrok' );
const main = require( './modules/origin' );
const server = http.createServer( app );
const wss = new webSocket.Server( { server: server } );
const fs = require( 'fs' );

const dir = __dirname + '/model/';

let port = process.env.PORT || 0;

require( './routes/main' )( path, app, main );

app.get( '*', function( req, res, next ) {
    if (!req.headers.host.includes("localhost")) {
        if (req.get('x-forwarded-proto') != "https") {
            res.set('x-forwarded-proto', 'https');
            res.redirect('https://' + req.get('host') + req.url);
        } else {
            next();
        }
    } else {
        next();
    }
});

app.get( '/', ( req, res ) => {
    res.sendFile (path.join( __dirname + '/html/index.html') );
    main.createNode();
    if ( !req.headers.host.includes( "localhost" ) ) {
        let wsp = new webSocket( 'ws://origin.zeros.run' );
        wsp.on('open', function open() {
            console.log( 'Peer sent: ' + req.headers.host );
            wsp.send( req.headers.host );
        })
        wsp.on( 'error', ( error ) => {
            console.log('client error', error);
        })
    }
});

/** Start ngrok for access to local. */
app.get( '/start-ngrok', ( req, res ) => {

    fs.readFile( dir + 'peers.json', 'utf8', (err, data) => {
        if ( err ) {
            console.log( 'No peers list.\n' );
        } else {
            let identityModel = fs.readFileSync( dir + 'identity.json' );
            let peerJson = JSON.parse(identityModel);
            let peerID = peerJson.peerID;
            let peersList = JSON.parse( data );
            peersList = peersList.filter( function( peersList ) {
                return peersList.peerID == peerID;
            });
            if ( Object.keys(peersList).length == 0 ) {
                let url = '';
                if ( req.headers.host.includes("localhost") ) {
                    ( async function() {
                        url = await ngrok.connect(req.socket.localPort);
                        res.sendFile(path.join(__dirname + '/html/ngrok.html'));
                        let wsp = new webSocket('ws://origin.zeros.run');
                        wsp.on('open', function open() {
                            console.log('Peer sent: ' + url);
                            wsp.send(url);
                            /** Add peer to peers list. */
                            fs.readFile( dir + 'peers.json', 'utf8', (err, data) => {
                                if ( err ) {
                                    let obj = JSON.parse( '{}' );
                                    if ( Object.keys(obj).length === 0 ) {
                                        let identityModel = fs.readFileSync( dir + 'identity.json' );
                                        let peerJson = JSON.parse(identityModel);
                                        let peerID = peerJson.peerID;
                                        console.log( 'Add peer ID: ' + peerID + '\n' );
                                        let origin = 'origin.zeros.run'
                                        let peersList = [];
                                        let input = JSON.parse( '{"peerID":"'+ peerID +'", "url":"'+ url +'", "origin":"'+ origin +'"}' );
                                        peersList.push( input );
                                        let json = JSON.stringify( peersList, null, 4 );
                                        fs.writeFile( dir + 'peers.json', json, ( err ) => {
                                            if ( err ) throw err;
                                            console.log( 'Saved peer to peers list.\n' );
                                        })
                                    }
                                } else {
                                    let identityModel = fs.readFileSync( dir + 'identity.json' );
                                    let peerJson = JSON.parse(identityModel);
                                    let peerID = peerJson.peerID;
                                    console.log( 'Add peer ID: ' + peerID + '\n' );
                                    let origin = 'origin.zeros.run'
                                    let peersList = JSON.parse( data );
                                    peersList = peersList.filter( function( peersList ) {
                                        return peersList.peerID != peerID;
                                    });
                                    peersList.push( { "peerID": peerID, "url": url, "origin": origin } );
                                    let json = JSON.stringify( peersList, null, 4 );
                                    fs.writeFile( dir + 'peers.json', json, ( err ) => {
                                        if ( err ) throw err;
                                        console.log( 'Saved peer to peers list.\n' );
                                    })
                                }
                            });
                        })
                        wsp.on('error', (error) => {
                            console.log( 'client error', error );
                        })
                    } )();
                } else {
                    res.sendFile(path.join(__dirname + '/html/no-ngrok.html'));
                }
            } else {
                console.log( 'Already in peers list.' );
                res.sendFile(path.join(__dirname + '/html/ngrok.html'));
            }
        }
    });
});

/** Disconnect from ngrok server. */
app.get( '/close-ngrok', ( req, res ) => {
    if (req.headers.host.includes( "localhost" )) {
        (async function() {
            await ngrok.disconnect();
            fs.readFile( dir + 'peers.json', 'utf8', (err, data) => {
                if ( err ) {
                    console.log( 'No peers list.\n' );
                } else {
                    let identityModel = fs.readFileSync( dir + 'identity.json' );
                    let peerJson = JSON.parse(identityModel);
                    let peerID = peerJson.peerID;
                    console.log( 'Remove peer ID: ' + peerID + '\n' );
                    let peersList = JSON.parse( data );
                    peersList = peersList.filter( function( peersList ) {
                        return peersList.peerID != peerID;
                    });
                    let json = JSON.stringify( peersList, null, 4 );
                    fs.writeFile( dir + 'peers.json', json, ( err ) => {
                        if ( err ) throw err;
                        console.log( 'Removed peer to peers list.\n' );
                    })
                }
            });
        })();
        res.sendFile( path.join(__dirname + '/html/disconnect.html' ));
    }
});

/** Add favicon and block robots. */
app.use( nobots({block:true}) );
app.use( favicon(__dirname + '/favicon.ico') );
app.use( express.static('html') );

/** Show console log when get a message. */
wss.on( 'connection', function connection( ws ) {
    ws.on( 'message', function incoming( message ) {
        console.log( 'Server received: %s', message + '\n' );
    });
});

/** Echo error. */
wss.on('error', (error) => {
    console.log('client error', error);
})

/** Listen server. */
server.listen(port, () => {
    console.log( '\nZeros Origin Network is running... (Ctrl + c to exit)\n' );
    console.log( 'Socket port: '+ server.address().port +'\n' );
    port = server.address().port;
});