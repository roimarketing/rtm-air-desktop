/*!
 * Ext JS Library 3.0.0
 * Copyright(c) 2006-2009 Ext JS, LLC
 * licensing@extjs.com
 * http://www.extjs.com/license
 */
 Ext.data.AirDB = Ext.extend(Ext.data.SqlDB, {
	open : function(db, cb, scope){
		this.conn = new air.SQLConnection();

		var file = air.File.applicationStorageDirectory.resolvePath(db);

		this.conn.addEventListener(air.SQLEvent.OPEN, this.onOpen.createDelegate(this, [cb, scope]));
		this.conn.addEventListener(air.SQLEvent.CLOSE, this.onClose.createDelegate(this));
		this.conn.open(file);
	},

	close : function(){
//		air.trace('SQL: conn closed');
		this.conn.close();
	},

	onOpen : function(cb, scope){
//		air.trace('SQL: conn opened');
		this.openState = true;
		Ext.callback(cb, scope, [this]);
		this.fireEvent('open', this);
	},

	onClose : function(){
//		air.trace('SQL: onClose');
		this.fireEvent('close', this);
	},

	onError : function(e, stmt, type, cb, scope){
//		air.trace('SQL: onError', type);
		Ext.callback(cb, scope, [false, e, stmt]);
	},

	onResult : function(e, stmt, type, cb, scope){
		if(type == 'exec'){
			Ext.callback(cb, scope, [true, e, stmt]);
		}else{
			var r = [];
			var result = stmt.getResult();
//			air.trace('onResult', result.rowsAffected);
			if(result && result.data){
		        var len = result.data.length;
		        for(var i = 0; i < len; i++) {
		            r[r.length] = result.data[i];
		        }
		    }
			Ext.callback(cb, scope, [r, e, stmt]);
		}
	},

	createStatement : function(type, cb, scope){

		var stmt = new air.SQLStatement();

		stmt.addEventListener(air.SQLErrorEvent.ERROR, this.onError.createDelegate(this, [stmt, type, cb, scope], true));
		stmt.addEventListener(air.SQLEvent.RESULT, this.onResult.createDelegate(this, [stmt, type, cb, scope], true));

		stmt.sqlConnection = this.conn;

		return stmt;
	},

	exec : function(sql, cb, scope){
//		air.trace('exec', sql);
		var stmt = this.createStatement('exec', cb, scope);
		stmt.text = sql;
		stmt.execute();
	},

	execBy : function(sql, args, cb, scope){
//		air.trace('execBy', sql, args);
		var stmt = this.createStatement('exec', cb, scope);
		stmt.text = sql;
		this.addParams(stmt, args);
		stmt.execute();
	},

	query : function(sql, cb, scope){
//		air.trace('query', sql);
		var stmt = this.createStatement('query', cb, scope);
		stmt.text = sql;
		stmt.execute(this.maxResults);
	},

	queryBy : function(sql, args, cb, scope){
//		air.trace('queryBy', sql);
		var stmt = this.createStatement('query', cb, scope);
		stmt.text = sql;
		this.addParams(stmt, args);
		stmt.execute(this.maxResults);
	},

    addParams : function(stmt, args){
		if(!args){ return; }
		for(var key in args){
			if(args.hasOwnProperty(key)){
				if(!isNaN(key)){
					stmt.parameters[parseInt(key)] = args[key];
				}else{
					stmt.parameters[':' + key] = args[key];
				}
			}
		}
//		return stmt;
	}
});
