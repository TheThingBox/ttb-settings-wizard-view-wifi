const bodyParser = require('body-parser');
const path = require('path')
const fs = require('fs')
const InterfaceUtils = require('ttbd-interface-utils')
const interface_utils = new InterfaceUtils({hydra_exec_host: "mosquitto"})

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
    interface_utils.scanWiFi().then(data => {
      res.send(data)
    })
  });

  app.post(apiToExpose, function(req, res){
    var data = req.body;
    if((data.secured === "true" || data.secured === true) && data.password === ""){
      res.json({message: "Error", key: "answer_no_password", params: {} })
    } else if(!data.ssid) {
      res.json({message: "Error", key: "answer_no_ssid", params: {} })
    } else {
      interface_utils.setWiFi(data)
      .then(() => {
          stats.status = 'ok'
          syncStats(true)
          res.json({message: "OK", key: "answer_set", params: { ssid: data.ssid } })
      })
      .catch( err => {
        res.json({message:"Error", key: "answer_cannot_set", params: {} })
      })
    }
  });
}

function syncStats(update){
  if(!settingsPath){
    return
  }
  var statsFromFile
  try {
    statsFromFile = JSON.parse(fs.readFileSync(settingsPath))
    if(update === true){
      stats = Object.assign({}, statsFromFile, stats)
    } else {
      stats = Object.assign({}, stats, statsFromFile)
    }
  } catch(e){
    try {
      fs.writeFileSync(settingsPath, JSON.stringify(stats, null, 4), { encoding: 'utf8'})
    } catch(e){}
  }
  if(stats.initialized === false || update === true){
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
  order: 15,
  canIgnore: true,
  enableAPOnWlan: function(ssid){
    return interface_utils.enableAcessPointOnWlan(ssid)
  }
}
