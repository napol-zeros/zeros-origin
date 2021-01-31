// Zeros Origin main router

function router (path, app, main){

    app.get('/connect-peer', (req, res) => {
        if (req.query.id !== undefined) {
            if (req.query.address !== undefined) {
                main.connectPeer(req.query.address, req.query.id, req, res)
            } else {
                res.send('Invalid address')
            }
        }
    })
}

module.exports = router