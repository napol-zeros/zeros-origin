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
                fs.open( dir + 'peers','r',function( err ){
                    if ( err ) {
                        obj = JSON.parse( '{}' );
                        if ( Object.keys(obj).length === 0 ) {
                            let identityModel = fs.readFileSync( dir + 'identity' );
                            let peerJson = JSON.parse(identityModel);
                            let peerID = peerJson.peerID;
                            console.log( 'Add peer ID: ' + peerID + '\n' );
                            let origin = 'origin.zeros.run'
                            let input = JSON.parse( '{"peerID":"'+ peerID +'", "url":"'+ url +'", "origin":"'+ origin +'"}' );
                            json = JSON.stringify( input );
                            fs.writeFile( dir + 'peers', json, ( err ) => {
                                if ( err ) throw err;
                                console.log( 'Saved peer to peers list.\n' );
                            })
                        }
                    }
                });
            })
            wsp.on('error', (error) => {
                console.log('client error', error);
            })
           } )();
      } else {
        res.sendFile(path.join(__dirname + '/html/no-ngrok.html'));
      }
});

/** Disconnect from ngrok server. */
app.get( '/close-ngrok', ( req, res ) => {
    if (req.headers.host.includes( "localhost" )) {
        (async function() {
            await ngrok.disconnect();
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