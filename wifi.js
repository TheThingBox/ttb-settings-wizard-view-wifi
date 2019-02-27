_wizard_view_wifi_index = params.views.findIndex(v => v.name === 'wifi')

ejs.renderFile(
  params.views[_wizard_view_wifi_index].ejs,
  Object.assign({
    viewIndex: _wizard_view_wifi_index
  }, params),
  { async: false },
  (_err, _str) => {
    document.getElementById('wizard_wifi').innerHTML = _str
    defaultWifiSelect('wizard_wifi_form_ssid')

    var select_elems = document.querySelectorAll('#wizard_wifi_form_ssid');
    M.FormSelect.init(select_elems, {});

    form_params.wifi = {}
    form_params.wifi.ssid = ''
    form_params.wifi.password = ''
    form_params.wifi.secured = true
    form_params.wifi._willShowErrors = null

    document.getElementById("wizard_wifi_scan").addEventListener('click', wifiScanClick);
    document.getElementById("wizard_wifi_form_ssid").addEventListener('change', wifiSSIDChange);
    document.getElementById("wizard_wifi_form_psswrd").addEventListener('input', wifiPasswordChange);

  }
)

params.views[_wizard_view_wifi_index].getWifiPassphrase = function(pwd, ssid){
  var derivedKey = CryptoJS.PBKDF2(pwd, ssid, { iterations: 4096, keySize: 256/32 } );
  return CryptoJS.enc.Hex.stringify(derivedKey);
}

params.views[_wizard_view_wifi_index].post = function() {
  var request = new Request(params.views[_wizard_view_wifi_index].api)

  var ok = params.views[_wizard_view_wifi_index].isOk()
  if(!ok){
    request.setData({})
  } else {
    request.setData({
      ssid: form_params.wifi.ssid,
      password: params.views[_wizard_view_wifi_index].getWifiPassphrase(form_params.wifi.password, form_params.wifi.ssid),
      secured: form_params.wifi.secured
    })
  }
  return request.post()
}

params.views[_wizard_view_wifi_index].isOk = function(willShowErrors){
  _errors = []

  form_params.wifi.ssid = form_params.wifi.ssid.trim()
  form_params.wifi.password = form_params.wifi.password.trim()

  if(form_params.wifi.ssid === ''){
    _errors[_errors.length] = { title: 'WiFi', corpus: 'You have to choose a WiFi network'}
  }

  if(form_params.wifi.secured === true && form_params.wifi.password === ''){
    _errors[_errors.length] = { title: 'Password', corpus: 'password is empty'}
  }

  if(willShowErrors === true || _errors.length === 0){
    showErrors(_errors, params.views[_wizard_view_wifi_index].order)
  }

  if(_errors.length === 0){
    return true
  }
  return false
}

params.views[_wizard_view_wifi_index].getResumed = function(){
  var _html = ''
    var _liStyle = 'background-color: rgba(0, 0, 0, 0); border-bottom-width: 1px;'
  if(form_params.wifi.secured === false){
    _html =  `
<ul class="collection" style="border-width:0px">
  <li style="${_liStyle}" class="collection-header"><b>Network</b><br/>${form_params.wifi.ssid || 'not set'}</li>
  <li style="${_liStyle} border-bottom-width: 0px;" class="collection-header"><b>Password</b><br/>Aucun</li>
</ul>`
  } else {
    _html =  `
<ul class="collection" style="border-width:0px">
  <li style="${_liStyle}" class="collection-header"><b>Network</b><br/>${form_params.wifi.ssid || 'not set'}</li>
  <li style="${_liStyle} border-bottom-width: 0px;" class="collection-header"><b>Password</b><br/>${form_params.wifi.password.replace(/./g, "&#183;") || 'not set'}</li>
</ul>`
  }
  return _html
}

function wifiScanClick(e){
  var selectDivId = 'wizard_wifi_form_ssid'
  wifi_scanning_select(selectDivId)
  var request = new Request(`${params.views[_wizard_view_wifi_index].api}/scan`)
  request.get().then( scan_result => {
    if(scan_result && scan_result.wifilist){
      wifi_build_select(selectDivId, scan_result.wifilist);
    } else {
      defaultWifiSelect(selectDivId)
    }
    document.getElementById('wizard_wifi_scan').classList.remove('disabled')
  })
}

function defaultWifiSelect(id){
  var sel = document.getElementById(id)
  sel.innerHTML = '';
  sel.disabled  = 'true'
  var scanning = document.createElement('OPTION');
  scanning.value = 'none';
  scanning.textContent = "first, start a scan."
  scanning.disabled  = 'true'
  scanning.selected = 'true'
  sel.appendChild(scanning);
  var select_elems = document.querySelectorAll(`#${id}`);
  M.FormSelect.init(select_elems, {});
}

function wifiSSIDChange(e){
  var values = e.srcElement.selectedOptions
  if(values.length > 0){
    values = values[0].value
  } else {
    values = 'none'
  }
  var group = 'none'
  if(values !== 'none'){
    values = values.split('_')
    if(values.length>1){
      group = values.shift()
      values = values.join('_')
    } else {
      values = values.join('_')
    }
  }
  var wifi_hide_on_non_secured = document.getElementsByClassName('wifi_hide_on_non_secured')
  if(wifi_hide_on_non_secured){
    Array.from(wifi_hide_on_non_secured).forEach(e => {
      if(group === 'secured'){
        e.classList.add('is-visible')
      } else {
        e.classList.remove('is-visible')
      }
    })
  }
  form_params.wifi.ssid = values
  form_params.wifi.secured = (group==='secured')?true:false

  params.views[_wizard_view_wifi_index].checkButtonNextStats()
  if(form_params.wifi._willShowErrors){
    clearTimeout(form_params.wifi._willShowErrors)
  }
  form_params.wifi._willShowErrors = setTimeout(() => { params.views[_wizard_view_wifi_index].isOk(true) }, 3000)
}

function wifi_build_select(id, opt) {
    var sel = document.getElementById(id)
    sel.innerHTML = '';
    sel.disabled  = null
    var none = document.createElement('OPTION');
    none.value = 'none';
    none.textContent = 'Choose your network :'
    none.disabled  = 'true'
    none.selected = 'true'
    sel.appendChild(none);
    var prop;
    for (prop in opt) {
        if (opt.hasOwnProperty(prop)) {
            wifi_add_optgr(sel, prop, opt[prop]);
        }
    }
    var select_elems = document.querySelectorAll(`#${id}`);
    M.FormSelect.init(select_elems, {});
}

function wifi_scanning_select(id){
    document.getElementById('wizard_wifi_scan').classList.add('disabled')
    var sel = document.getElementById(id)
    sel.innerHTML = '';
    sel.disabled  = 'true'
    var scanning = document.createElement('OPTION');
    scanning.value = 'none';
    scanning.textContent = 'scanning ...'
    scanning.disabled  = 'true'
    scanning.selected = 'true'
    sel.appendChild(scanning);
    var select_elems = document.querySelectorAll(`#${id}`);
    M.FormSelect.init(select_elems, {});
}

function wifi_add_optgr(sel, lab, opts) {
    var i;
    var opt;
    var gr = document.createElement('OPTGROUP');
    var len = opts.length;
    var labels = [
      {
        name: 'open',
        wording: 'Open'
      },
      {
        name: 'secured',
        wording: 'Secured'
      }
    ]

    gr.label = labels.filter(l => l.name === lab).map(l => l.wording)[0];
    for (i = 0; i < len; ++i) {
        opt = document.createElement('OPTION');
        opt.value = `${lab}_${opts[i].essid}`;
        opt.textContent = opts[i].essid;
        gr.appendChild(opt);
    }
    sel.appendChild(gr);
    return gr;
}

function wifiPasswordChange(e){
  form_params.wifi.password = document.getElementById('wizard_wifi_form_psswrd').value
  params.views[_wizard_view_wifi_index].checkButtonNextStats()
  if(form_params.wifi._willShowErrors){
    clearTimeout(form_params.wifi._willShowErrors)
  }
  form_params.wifi._willShowErrors = setTimeout(() => { params.views[_wizard_view_wifi_index].isOk(true) }, 3000)
}
