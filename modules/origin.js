// Zeros Origin main

const WebSocket = require('ws')
const SHA256 = require('crypto-js/sha256')
const fs = require('fs')

var nodeID = 'NULL'
var randomString = randomString()
var dir = __dirname + '/../model/'

// Random string for id creation.
function randomString() {
    let length = 80
    let result = ''
    let all = 'zerosZEROS01'
    var allLength = all.length
    for ( var i = 0; i < length; i++ ) {
       result += all.charAt(Math.floor(Math.random() * allLength))
    }
    return result
 }

// Create node and save id in model folder.
function createNode () {
    if (!fs.existsSync(dir)){
        fs.mkdirSync(dir)
        fs.open(dir + 'identity','r',function(err, fd){
            if (err) {
                obj = JSON.parse('{}')
                if (Object.keys(obj).length === 0) {
                    nodeID = SHA256(randomString).toString()
                    console.log('Node ID: ' + nodeID + '\n')
                    let input = JSON.parse('{"node_id":"'+ nodeID +'"}')
                    json = JSON.stringify(input)
                    fs.writeFile(dir + 'identity', json, (err) => {
                        if (err) throw err
                        console.log('Saved node id\n')
                    })
                }
                registerPeer(nodeID)
            }
        })
    }
}

// Register peer to Zeros Origin.
function registerPeer(id) {
    let wsp = new WebSocket('ws://origin.zeros.run')
    wsp.on('open', function open() {
        wsp.send(id)
        console.log('Peer sent: ' + id)
    })

    wsp.on('error', (error) => {
        console.log('client error', error)
    })
}

// Connect peer to Zeros Origin.
function connectPeer(address, id, req, res) {
    let ws_scheme = ''
    if (req.protocol == "https:") {
        ws_scheme = "wss://"
    } else {
        ws_scheme = "ws://"
    }
    let wsp = new WebSocket(ws_scheme + address)
    wsp.on('open', function open() {
        fs.readFile(dir + 'identity', 'utf8', function readFileCallback(err, data){
            if (err){
                console.log(err)
            } else {
                obj = JSON.parse(data)
                json = JSON.stringify(obj)
                if (json.includes(id)) {
                    wsp.send(json)
                    console.log('Peer sent: ' + json)
                    res.send('Peer sent')
                    
                } else {
                    console.log('denied')
                    res.send('denied')
                }
            }
        })
    })

    wsp.on('error', (error) => {
        console.log('client error', error)
    })
}

module.exports = { createNode, connectPeer }