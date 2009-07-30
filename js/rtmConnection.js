var conn = {};
conn.apiKey = '6a0f2df056721fb0f6ec9dfd04973053';
conn.secret = '7fafbe6a8c6ff6b7';
conn.start = null;
conn.end = null;
conn.authToken = '';
conn.lists = [];
conn.locations = [];
conn.activeCount = 0;
conn.list = [];
conn.apiURL = 'http://api.rememberthemilk.com/services/rest/';
//conn.apiURL = 'http://localhost:12088/api/';

conn.active = function(){
	return this.activeCount>0;
}

conn.buildPost = function(data, method){
	var aURL = '';
	var toMD5 = conn.secret;
	var ids = [];
	data.api_key = this.apiKey;
	data.method = method;
	data.auth_token = conn.authToken;
	for(var id in data){
		if(data[id]){
			ids.push(id);
		}
	}
	ids.sort();
	for(var i = 0; i<ids.length; i++){
		var id = ids[i];
		toMD5 += id;
		toMD5 += data[id];
		aURL += (encodeURIComponent(id)+'='+encodeURIComponent(data[id])+'&');
	}
	aURL += 'api_sig='+hex_md5(toMD5);
	air.trace('toMD5 = '+toMD5+', data = '+aURL);
	return aURL;
}

conn.buildURL = function(data, method, aURL){
	if(!aURL)
		aURL = this.apiURL;
	aURL += '?';
	var toMD5 = conn.secret;
	var ids = [];
	data.api_key = this.apiKey;
	if(method){
		data.method = method;
		data.auth_token = conn.authToken;
	}else{
	}
	for(var id in data){
		if(data[id]){
			ids.push(id);
		}
	}
	ids.sort();
	for(var i = 0; i<ids.length; i++){
		var id = ids[i];
		toMD5 += id;
		toMD5 += data[id];
		aURL += (id+'='+encodeURIComponent(data[id])+'&');
	}
	aURL += 'api_sig='+hex_md5(toMD5);
	air.trace('toMD5 = '+toMD5+', data = '+aURL);
	return aURL;
}

conn.makeQuery = function(config){
	var req = new XMLHttpRequest();
	req.onreadystatechange = function() {
//		air.trace(req.readyState);
        if (req.readyState == 4) {
			conn.activeCount--;
			air.trace('response text: ',req.responseText);
            var xml = req.responseXML;
			if(!xml){
				var code = 1;
				var msg = 'Can\'t connect to RTM host, please check connection settings';
				if(conn.end && conn.activeCount==0)
					conn.end(code, msg);
				if(config.error)
					config.error(code, msg);
				return;
			}
			if(xml.getElementsByTagName("err").length>0){
				var code = xml.getElementsByTagName("err").item(0).getAttribute('code');
				var msg = xml.getElementsByTagName("err").item(0).getAttribute('msg');
				if(conn.end && conn.activeCount==0)
					conn.end(code, msg);
				if(config.error)
					config.error(code, msg);
			}else{
				if(conn.end && conn.activeCount==0)
					conn.end();
				if(config.ok)
					config.ok(xml);
			}
        }
    };
	if(conn.start && conn.activeCount==0)
		conn.start();
	conn.activeCount++;
	if(!config.url)
		config.url = this.apiURL;
	air.trace('makeQuery to '+config.url+' with '+config.data);
    req.open(config.data? 'POST': 'GET', config.url, true);
	req.setRequestHeader("Cache-Control", "no-cache");
	req.send(config.data? config.data: null);
}

conn.setUser = function(xml){
	var user = {};
	user.id = xml.getElementsByTagName('user').item(0).getAttribute('id');
	user.username = xml.getElementsByTagName('user').item(0).getAttribute('username');
	user.fullname = xml.getElementsByTagName('user').item(0).getAttribute('fullname');
	this.user = user;
	return user;
}

conn.checkToken = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.auth.checkToken'),
		ok: function(xml){
			conn.setUser(xml);
			if(ok)
				ok(conn.user);
		},
		error: error
	});
}

conn.getFrob = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.auth.getFrob'),
		ok: function(xml){
			var frob = xml.getElementsByTagName('frob').item(0).childNodes(0).nodeValue;
			conn.frob = frob;
			air.trace('frob = '+frob);
			if(ok)
				ok(frob);
		},
		error: error
	});
}

conn.getToken = function(ok, error){
	this.makeQuery({
		url: this.buildURL({
			frob: conn.frob
		}, 'rtm.auth.getToken'),
		ok: function(xml){
			var token = xml.getElementsByTagName('token').item(0).firstChild.nodeValue;
//			air.trace('Token: '+token);
			conn.authToken = token;
			conn.setUser(xml);
			if(ok)
				ok(conn.user);
		},
		error: error
	});
}

conn.getLists = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.lists.getList'),
		ok: function(xml){
			conn.lists = [];
			var nl = xml.getElementsByTagName('list');
			for(var i = 0; i<nl.length; i++){
				if(nl.item(i).getAttribute('archived')==0 && nl.item(i).getAttribute('deleted')==0){
//					air.trace('adding list: '+nl.item(i).getAttribute('name'));
					conn.lists.push({
						id: nl.item(i).getAttribute('id'),
						name: nl.item(i).getAttribute('name'),
						locked: nl.item(i).getAttribute('locked')!=0,
						smart: nl.item(i).getAttribute('smart')!=0
					});
				}
			}
			if(ok)
				ok(conn.lists);
		}, error: error
	});
}

conn.getLocations = function(ok, error){
	this.makeQuery({
		url: this.buildURL({}, 'rtm.locations.getList'),
		ok: function(xml){
			conn.locations = [];
			var nl = xml.getElementsByTagName('location');
			for(var i = 0; i<nl.length; i++){
//				air.trace('adding location: '+nl.item(i).getAttribute('name'), nl.item(i).getAttribute('address'));
				conn.locations.push({
					id: nl.item(i).getAttribute('id'),
					name: nl.item(i).getAttribute('name'),
					address: nl.item(i).getAttribute('address')
				});
			}
			if(ok)
				ok(conn.locations);
		}, error: error
	});
};

conn.getList = function(listid, ok, error){
	conn.list = [];
	this.makeQuery({
		url: this.buildURL({
			list_id: listid
		}, 'rtm.tasks.getList'),
		ok: function(xml){
			var list = xml.getElementsByTagName('list');
			var zoneOffset = parseInt(new Date().format('Z'));
			air.trace('Zone offset = '+zoneOffset);
			if(list.length>0){
				var nl = list.item(0).childNodes;
				for(var i = 0; i<nl.length; i++){
					var s = nl.item(i);
					if(s.nodeName=='taskseries'){
						var task = {
							series_id: s.getAttribute('id'),
							name: s.getAttribute('name'),
							source: s.getAttribute('source')
						};
						var t = s.getElementsByTagName('task').item(0);
						if(!t)
							continue;
						task.completed = t.getAttribute('completed')!='';
						task.deleted = t.getAttribute('deleted')!='';
						var due = t.getAttribute('due');
						if(due!=''){
							task.due = Date.parseDate(due, 'Y-m-d\\TH:i:s\\Z');
							if(task.due){
								task.due = task.due.add(Date.SECOND, zoneOffset);
							}
							task.hasTime = t.getAttribute('has_due_time')!='0';
						}else{
							task.due = null;
							task.hasTime = false;
						}
						task.priority = parseInt(t.getAttribute('priority')=='N'? 0: t.getAttribute('priority'));
						task.estimate = t.getAttribute('estimate');
						task.id = t.getAttribute('id')
						air.trace('Task', task.id, task.series_id, task.name, task.source, task.completed,
								  task.deleted, task.priority, task.estimate, task.due, task.hasTime);
						var tags = s.getElementsByTagName('tag');
						task.tags = [];
						for(var j = 0; j<tags.length; j++){
							task.tags.push(tags.item(j).firstChild.nodeValue);
							air.trace('Tag', task.tags[j]);
						}
						var notes = s.getElementsByTagName('note');
						task.notes = [];
						for(var j = 0; j<notes.length; j++){
							task.notes.push({
								id: notes.item(j).getAttribute('id'),
								title: notes.item(j).getAttribute('title'),
								body: notes.item(j).firstChild.nodeValue
							});
							air.trace('Note', task.notes[j].id, task.notes[j].title);
						}

						conn.list.push(task);
					}
				}
			}
			if(ok)
				ok(conn.list);
		}, error: error
	})
}