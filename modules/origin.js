/** Zeros Origin Main. */

const webSocket = require( 'ws' );
const sha256 = require( 'crypto-js/sha256' );
const fs = require( 'fs' );
let { json } = require('express');

let peerID = 'NULL';
const randomID = randomString();
const dir = __dirname + '/../model/';

/** Random string for id creation. */
function randomString() {
    let length = 80;
    let result = '';
    let all = 'zerosZEROS01';
    let allLength = all.length;
    for ( let i = 0; i < length; i++ ) {
       result += all.charAt( Math.floor( Math.random() * allLength) );
    }
    return result;
 }

/** Create peer and save id in model folder. */
function createNode () {
    /** Create model folder if not exist. */
    if ( !fs.existsSync( dir ) ){
        fs.mkdirSync( dir );
    }
    /** Create identity file if not exist. */
    if ( !fs.existsSync( dir + 'identity.json' ) ){
        fs.open( dir + 'identity.json','r',function( err ){
            if ( err ) {
                obj = JSON.parse( '{}' );
                if ( Object.keys(obj).length === 0 ) {
                    peerID = sha256( randomID ).toString();
                    console.log( 'Peer ID: ' + peerID + '\n' );
                    let date = new Date();
                    let input = JSON.parse( '{"peerID":"'+ peerID +'", "date":"'+ date +'"}' );
                    json = JSON.stringify( input, null, 4 );
                    fs.writeFile( dir + 'identity.json', json, ( err ) => {
                        if ( err ) throw err;
                        console.log( 'Saved peer id.\n' );
                    });
                }
                registerPeer( peerID );
            }
        });
    }
}

/** Register peer to Zeros Origin. */
function registerPeer(id) {
    let wsp = new webSocket( 'ws://origin.zeros.run' );
    wsp.on('open', function open() {
        wsp.send( id );
        console.log( 'Peer sent: ' + id );
    });

    wsp.on( 'error', ( error ) => {
        console.log( 'client error', error );
    });
}

/** Connect peer to Zeros Origin. */
function connectPeer( address, id, req, res ) {
    let wsScheme = '';
    if ( req.protocol == "https:" ) {
        wsScheme = "wss://";
    } else {
        wsScheme = "ws://";
    }
    let wsp = new webSocket( wsScheme + address );
    wsp.on( 'open', function open() {
        let peerID = readPeerID();
        console.log( peerID );
        res.send( peerID );
        if ( json.includes( id ) ) {
            wsp.send( json );
            console.log( peerID );
            res.send( peerID );
        } else {
            return 'denied';
        }
    })

    wsp.on( 'error', ( error ) => {
        console.log( 'client error', error );
    })
}

module.exports = { createNode, connectPeer }