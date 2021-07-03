/** Zeros Origin Main. */

const web_socket = require( 'ws' );
const sha256 = require( 'crypto-js/sha256' );
const fs = require( 'fs' );

let node_id = 'NULL';
const random_id = random_string();
const dir = __dirname + '/../model/';

/** Random string for id creation. */
function random_string() {
    let length = 80;
    let result = '';
    let all = 'zerosZEROS01';
    let allLength = all.length;
    for ( let i = 0; i < length; i++ ) {
       result += all.charAt( Math.floor( Math.random() * allLength) );
    }
    return result;
 }

/** Create node and save id in model folder. */
function create_node () {
    if ( !fs.existsSync(dir) ){
        fs.mkdirSync( dir );
        fs.open( dir + 'identity','r',function( err ){
            if ( err ) {
                obj = JSON.parse( '{}' );
                if ( Object.keys(obj).length === 0 ) {
                    node_id = sha256( random_id ).toString();
                    console.log( 'Node ID: ' + node_id + '\n' );
                    let date = new Date();
                    let input = JSON.parse( '{"node_id":"'+ node_id +'", "date":"'+ date +'"}' );
                    json = JSON.stringify( input );
                    fs.writeFile( dir + 'identity', json, ( err ) => {
                        if ( err ) throw err;
                        console.log( 'Saved node id\n' );
                    })
                }
                register_peer( node_id );
            }
        })
    }
}

/** Register peer to Zeros Origin. */
function register_peer(id) {
    let wsp = new web_socket( 'ws://origin.zeros.run' );
    wsp.on('open', function open() {
        wsp.send( id );
        console.log( 'Peer sent: ' + id );
    })

    wsp.on( 'error', ( error ) => {
        console.log( 'client error', error );
    })
}

/** Connect peer to Zeros Origin. */
function connect_peer( address, id, req, res ) {
    let ws_scheme = '';
    if ( req.protocol == "https:" ) {
        ws_scheme = "wss://";
    } else {
        ws_scheme = "ws://";
    }
    let wsp = new web_socket( ws_scheme + address );
    wsp.on( 'open', function open() {
        fs.readFile( dir + 'identity', 'utf8', function readFileCallback( err, data ){
            if ( err ) {
                console.log( err );
            } else {
                obj = JSON.parse( data );
                json = JSON.stringify( obj );
                if ( json.includes( id ) ) {
                    wsp.send( json );
                    console.log( 'Peer sent: ' + json );
                    res.send( 'Peer sent' );
                    
                } else {
                    console.log( 'denied' );
                    res.send( 'denied' );
                }
            }
        })
    })

    wsp.on( 'error', ( error ) => {
        console.log( 'client error', error );
    })
}

module.exports = { create_node, connect_peer }