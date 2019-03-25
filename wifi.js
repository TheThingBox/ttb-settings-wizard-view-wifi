var VIEW_WIFI = function() {
  var Wifi = function(options) {
    this.type = Wifi.type
    this.tab_name = this.type
    this.tab_id = `tab_${this.type}`
    this.navtab_id = `navtab_${this.type}`
    this.main_container_id = `wizard_${this.type}`
    this.index = modules.findIndex(m => m.type === this.type)
    this.params = Object.assign({}, params.views[this.index])
    this.lang = {}
    this.view = ''
    this.form = {}
  }

  Wifi.prototype = new VIEW;

  Wifi.prototype.load = function(){
    return new Promise( (resolve, reject) => {
      this.getLang()
      .then( (lang) => {
        this.lang = i18n.create({ values: lang })
        return this.getView()
      })
      .then( (view) => {
        var _html = ejs.render(view, { name: this.type, lang: this.lang })
        if(!_html){
          throw new Error(`cannot render ${this.params.ejs}`)
        } else {
          this.tab_name = this.lang('name')
          document.getElementById(this.navtab_id).innerHTML = this.tab_name
          document.getElementById(this.main_container_id).innerHTML = _html
          this.defaultWifiSelect('wizard_wifi_form_ssid')

          var select_elems = document.querySelectorAll('#wizard_wifi_form_ssid');
          M.FormSelect.init(select_elems, {});

          this.form = {}
          this.form.ssid = ''
          this.form.password = ''
          this.form.secured = true
          this.form._willShowErrors = null

          document.getElementById("wizard_wifi_scan").addEventListener('click', (e) => { this.wifiScanClick(e) });
          document.getElementById("wizard_wifi_form_ssid").addEventListener('change',  (e) => { this.wifiSSIDChange(e) });
          document.getElementById("wizard_wifi_form_psswrd").addEventListener('input',  (e) => { this.wifiPasswordChange(e) });
          this.wifiScanClick()
          resolve()
        }
      })
      .catch(err => {
        reject(err)
      })
    })

  }

  Wifi.prototype.post = function(){
    var request = new Request(this.params.api)

    if(!this.isOk()){
      request.setData({})
    } else {
      request.setData({
        ssid: this.form.ssid,
        password: this.getWifiPassphrase(this.form.password, this.form.ssid),
        secured: this.form.secured
      })
    }
    return request.post()
  }

  Wifi.prototype.isOk = function(willShowErrors){
    var _errors = []

    this.form.ssid = this.form.ssid.trim()
    this.form.password = this.form.password.trim()

    if(this.form.ssid === ''){
      _errors[_errors.length] = { title: this.lang('isok_ssid_title'), corpus: this.lang('isok_ssid_corpus')}
    }

    if(this.form.secured === true && this.form.password === ''){
      _errors[_errors.length] = { title: this.lang('isok_password_title'), corpus: this.lang('isok_password_corpus')}
    }

    if(willShowErrors === true || _errors.length === 0){
      this.showErrors(_errors)
    }

    if(_errors.length === 0){
      return true
    }
    return false
  }

  Wifi.prototype.getResumed = function(){
    var _html = ''
      var _liStyle = 'background-color: rgba(0, 0, 0, 0); border-bottom-width: 1px;'
    if(this.form.secured === false){
      _html =  `
  <ul class="collection" style="border-width:0px">
    <li style="${_liStyle}" class="collection-header"><b>${this.lang('network')}</b><br/>${this.form.ssid || this.lang('not_set')}</li>
    <li style="${_liStyle} border-bottom-width: 0px;" class="collection-header"><b>${this.lang('password')}</b><br/>${this.lang('none')}</li>
  </ul>`
    } else {
      _html =  `
  <ul class="collection" style="border-width:0px">
    <li style="${_liStyle}" class="collection-header"><b>${this.lang('network')}</b><br/>${this.form.ssid || this.lang('not_set')}</li>
    <li style="${_liStyle} border-bottom-width: 0px;" class="collection-header"><b>${this.lang('password')}</b><br/>${this.form.password.replace(/./g, "&#183;") || this.lang('none')}</li>
  </ul>`
    }
    return _html
  }

  Wifi.prototype.getWifiPassphrase = function(pwd, ssid){
    var derivedKey = CryptoJS.PBKDF2(pwd, ssid, { iterations: 4096, keySize: 256/32 } );
    return CryptoJS.enc.Hex.stringify(derivedKey);
  }

  Wifi.prototype.wifiScanClick = function(e){
    var selectDivId = 'wizard_wifi_form_ssid'
    this.wifi_scanning_select(selectDivId)
    var request = new Request(`${this.params.api}/scan`)
    request.get().then( scan_result => {
      if(scan_result && scan_result.wifilist){
        this.wifi_build_select(selectDivId, scan_result.wifilist);
      } else {
        this.defaultWifiSelect(selectDivId)
      }
      document.getElementById('wizard_wifi_scan').classList.remove('disabled')
    })
  }

  Wifi.prototype.wifiSSIDChange = function(e){
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
    this.form.ssid = values
    this.form.secured = (group==='secured')?true:false

    this.checkButtonNextStats()
    if(this.form._willShowErrors){
      clearTimeout(this.form._willShowErrors)
    }
    this.form._willShowErrors = setTimeout(() => { this.isOk(true) }, 3000)
  }

  Wifi.prototype.wifiPasswordChange = function(e){
    this.form.password = document.getElementById('wizard_wifi_form_psswrd').value
    this.checkButtonNextStats()
    if(this.form._willShowErrors){
      clearTimeout(this.form._willShowErrors)
    }
    this.form._willShowErrors = setTimeout(() => { this.isOk(true) }, 3000)
  }

  Wifi.prototype.wifi_scanning_select = function(id){
    document.getElementById('wizard_wifi_scan').classList.add('disabled')
    var sel = document.getElementById(id)
    sel.innerHTML = '';
    sel.disabled  = 'true'
    var scanning = document.createElement('OPTION');
    scanning.value = 'none';
    scanning.textContent = this.lang('scanning')
    scanning.disabled  = 'true'
    scanning.selected = 'true'
    sel.appendChild(scanning);
    var select_elems = document.querySelectorAll(`#${id}`);
    M.FormSelect.init(select_elems, {});
  }

  Wifi.prototype.wifi_build_select = function(id, opt){
    var sel = document.getElementById(id)
    sel.innerHTML = '';
    sel.disabled  = null
    var none = document.createElement('OPTION');
    none.value = 'none';
    none.textContent = this.lang('choose_network')
    none.disabled  = 'true'
    none.selected = 'true'
    sel.appendChild(none);
    var prop;
    for (prop in opt) {
        if (opt.hasOwnProperty(prop)) {
            this.wifi_add_optgr(sel, prop, opt[prop]);
        }
    }
    var select_elems = document.querySelectorAll(`#${id}`);
    M.FormSelect.init(select_elems, {});
  }

  Wifi.prototype.defaultWifiSelect = function(id){
    var sel = document.getElementById(id)
    sel.innerHTML = '';
    sel.disabled  = 'true'
    var scanning = document.createElement('OPTION');
    scanning.value = 'none';
    scanning.textContent = this.lang('scan_first')
    scanning.disabled  = 'true'
    scanning.selected = 'true'
    sel.appendChild(scanning);
    var select_elems = document.querySelectorAll(`#${id}`);
    M.FormSelect.init(select_elems, {});
  }

  Wifi.prototype.wifi_add_optgr = function(sel, lab, opts){
    var i;
    var opt;
    var gr = document.createElement('OPTGROUP');
    var len = opts.length;
    var labels = [
      {
        name: 'open',
        wording: this.lang('free_wifi')
      },
      {
        name: 'secured',
        wording: this.lang('secure_wifi')
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

  Wifi.type = 'wifi'

  return Wifi
}()

modules.push({type: VIEW_WIFI.type, module: VIEW_WIFI})
