const bodyParser = require('body-parser');
const path = require('path')
const fs = require('fs')
const wifi_utils = require('ttbd-wifi-utils')({hydra_exec_host: "mosquitto"})

const name = 'portal'
var settingsPath = null

var stats = {
  initialized: false,
  status: 'nok',
  validateAction: 'reboot'
}

function init(app, apiToExpose, persistenceDir) {
  settingsPath = path.join(persistenceDir, name)
  try {
    fs.mkdirSync(settingsPath, { recursive: true })
  } catch(e){}
  settingsPath = path.join(settingsPath, 'settings.json')
  syncStats()

  app.use(apiToExpose, bodyParser.json());
  app.get(apiToExpose, function(req, res){
    syncStats()
    res.json(stats)
  });

  app.get(`${apiToExpose}/scan`, function(req, res){
    var _tout = false
    wifi_utils.scan().then(data => {
      res.send(data)
    })
  });

  app.post(apiToExpose, function(req, res){
    var data = req.body;
    if((data.secured === "true" || data.secured === true) && data.password === ""){
      res.status(403).json({message: "Password should be filled", error: "no_password"})
    } else if(!data.ssid) {
      res.status(403).json({message: "Missing WiFi ssid", error: "no_ssid"})
    } else {
      wifi_utils.setWiFi(data)
      .then(() => {
          stats.status - 'ok'
          syncStats()
          res.json({message: `The WiFi ${data.ssid} has been set.`})
      })
      .catch( err => {
        res.status(500).json({message:"Cannot set the Wifi", error: err})
      })
    }
  });
}

function syncStats(){
  if(!settingsPath){
    return
  }
  try {
    stats = JSON.parse(fs.readFileSync(settingsPath))
  } catch(e){
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(stats, null, 4), { encoding: 'utf8'})
    } catch(e){}
  }
  if(stats.initialized === false){
    stats.initialized = true
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(stats, null, 4), { encoding: 'utf8'})
    } catch(e){}
  }
}

function getStats(){
  return stats
}

module.exports = {
  init: init,
  getStats: getStats,
  syncStats: syncStats,
  order: 50,
  canIgnore: false,
  enableAPOnWlan: wifi_utils.enableAPOnWlan
}