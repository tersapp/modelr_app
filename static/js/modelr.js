/**
 * 
 */

/*
 * === === === === === === === Classes ===========================
 */

/*
 * Server class
 */
function PlotServer(hostname, rocks, earth_models) {

    // The host hosting plots.
    this.hostname = hostname;

    // (rock name , rock property) pairs
    this.rocks = rocks;

    this.earth_models = earth_models;


    /*
     * Asynchronously fetch the list of scripts from the 
     * plotting server 
     * @param callback(data): do something on finish.
     */

    function failure(){
	$.post('/server_error');
	alert("Modelr is experiencing technical difficulties. Please check back soon.");
	
    };

    this.get_scripts = function get_scripts(type, callback) {
        $.ajax({url:host + '/available_scripts.json', 
		data:{'type': type}, success:callback,
	       error:failure,type:"GET"});
    };

    /*
     * Asynchronously fetch the information from a single scripts 
     * from the plotting server. 
     * @param callback(data): do something on finish.
     */
    this.get_script_info = function get_script_info(script,type,
						    callback){
        $.getJSON(this.hostname + '/script_help.json?script=' + 
		  script, {'type':type}, callback);
    };
 
};

function EarthStructure(image, mapping, datafile){
    /*
     * Object for dealing with Earth Structures. 
     */

    this.image = image;
    this.mapping = mapping;
    this.datafile = datafile;
    this.info = null;
    this.arguments = {};
};

EarthStructure.prototype.default_args = function default_args(argumentss) {
    console.log('default_args', argumentss);
    
    var args = this.info.arguments;

    this.arguments = {};

    for (var i = 0; i < args.length; i++) {
        this.arguments[args[i]["name"]] = args[i]['default'];
        if (args[i]["name"] in argumentss) {
            this.arguments[args[i]["name"]] = argumentss[args[i]["name"]];
        };
    };
};

EarthStructure.prototype.update = function update(attr, value) {
    this.arguments[attr] = value;
    this.on_change();
};

EarthStructure.prototype.callback = function(data){
    
};

EarthStructure.prototype.pull_rocks =function(){
    // fill rock properties from the front-end server

    cb = (function(data){
	this.mapping[i].property = rock_to_string(data);
    }).bind(this)

    for (var i in this.mapping){

	rock_key = this.mapping[i].key
	$.ajax("/rock?id="+rock_key, {type: "GET",
				     async: false,
				     success: cb})
    };
};


function PropertyMap(images, colour_maps, keys, current_index){
    this.images = images;
    this.colour_maps = colour_maps;
    this.keys = keys;
    this.current_index = current_index;
};

PropertyMap.prototype.get_image = function(){
    return this.images[this.current_index];
}

PropertyMap.prototype.get_mapping = function(){
    return this.colour_maps[this.current_index];
}

PropertyMap.prototype.set_current_map = function(map){
    this.colour_maps[this.current_index] = map;
}


PropertyMap.prototype.update_mapping = function(colour, name,
                                                rock_key){
    
    this.colour_maps[this.current_index][colour].name = name;
    this.colour_maps[this.current_index][colour].key = rock_key;
}

PropertyMap.prototype.get_key = function(){
    return this.keys[this.current_index]
}

PropertyMap.prototype.set_index = function(index){
    this.current_index = index;
}

PropertyMap.prototype.get_key_index = function(key){
    return this.keys.indexOf(key);
}

PropertyMap.prototype.get_colours = function(){
    mapping = this.colour_maps[this.current_index];

    colours = [];

    for (c in mapping){
	colours.push(c);
    }
    return colours;
}

PropertyMap.prototype.n_maps = function(){

    return this.images.length;
};

function ForwardModel(name,earth_struct, 
		      seismic_model, plots) {

    this.name = name;
    this.earth_struct = earth_struct;
    this.seismic_model = seismic_model;
    this.plots = plots;
};

ForwardModel.prototype.get = function get(name, callback){

    data = {'name': name}
    var fm = this;
    success = function success(data){

	var info = JSON.parse(data);
	var data = JSON.parse(info["data"]);

	fm.name = name;

	fm.earth_struct = data.earth_model;

	fm.seismic_model.script = data.seismic_model["script"];
	fm.seismic_model.set_current_script(fm.seismic_model.script,
					    data.seismic_model["args"]);

	fm.plots.script = data.plots["script"];
	fm.plots.set_current_script(fm.plots.script, 
				      data.plots["args"]);
    }

    $.ajax({type:"GET", url: '/modify_forward_model', data:data, 
	    success:function(data){ success(data); 
				    callback(data);}});
}

ForwardModel.prototype.put = function put(input_image_key,
					  output_image,
					  callback){
    data = {'name': this.name, 
	    'input_image_id': input_image_key,
	    'output_image': output_image,
	    'json': this.json_data()}
    $.post('/forward_model', data, callback)
}
    
ForwardModel.prototype.json_data = function json_data(){

    this.earth_struct.pull_rocks();
    data = JSON.stringify({'earth_model':this.earth_struct,
			   'seismic_model':{script:this.seismic_model.script, 
					    args:this.seismic_model.arguments}, 
			   'plots':{script:this.plots.script,
				    args:this.plots.arguments}});
    return data
}

ForwardModel.prototype.cleanUp = function cleanUp(server){

    $.post(server.hostname + '/delete_model',
	   JSON.stringify({filename: this.earth_struct.datafile}));
}
ForwardModel.prototype.post = function post(server,callback,
                                            update){

    this.earth_struct.update_model=update;
    $.post(server.hostname + '/forward_model.json', 
	   this.json_data(), 
	   callback);
};

/*
 * Scenario 'class'
 * Class for handling all script style queries to the backend
 */
function Scenario(name, script, arguments, rocks, models) {
    this.name = name;
    this.script = script;
    this.arguments = arguments;
    this.rocks = rocks;
    this.models = models
    this.info = null;

};

Scenario.prototype.json_data = function json_data(){
    var data = JSON.stringify({'plot_args': this.arguments});
    return data 
};

/*
 * Store the current arguments of this scenario on the server.
 */
Scenario.prototype.put = function put() {

    var data = JSON.stringify({
        'script' : this.script,
        'arguments' : this.arguments
    });
    console.log(data);

    function success(data, textStatus, jqXHR) {
        console.log('post', textStatus)
    };

    $.post('/scenario_db', {
        'name' : this.name,
        'json' : data
    }, success, 'json');
};

/*
 * Get the Scenario from the plotting server. keyed on the 'name' 
 * attr of this Scenario.
 */
Scenario.prototype.get = function get() {

    var scenario = this;

    function success(data, textStatus, jqXHR) {
        console.log('success');
        console.log(JSON.stringify(data), textStatus);

        scenario.script = data.script;
        scenario.set_current_script(data.script, data.arguments);
    };

    $.get('/scenario_db', {
        'name' : this.name
    }, success, 'json');
};


/*
 * Update an argument.
 */
Scenario.prototype.update = function update(attr, value) {
    this.arguments[attr] = value;
    this.on_change();
};

/*
 * Update the scenario with the default arguments provided by the plotting
 * server.
 */
Scenario.prototype.default_args = function default_args(argumentss) {
    console.log('default_args', argumentss);
    var args = this.info.arguments;

    this.arguments = {};

    for (var i = 0; i < args.length; i++) {
        this.arguments[args[i]["name"]] = args[i]['default'];
        if (args[i]["name"] in argumentss) {
            this.arguments[args[i]["name"]] = argumentss[args[i]["name"]];
        };

    };

};

/*
 * Create the query string for this Scenario. (to send to the plotting server)
 * 
 * eq result is ?script=foo.py&arg1=value1
 */
Scenario.prototype.qs = function() {
    var args = this.arguments;
    query_str = '?script=' + this.script;

    if(this.info){
    for (arg in this.info.arguments) {
	argname=this.info.arguments[arg]['name'];
        if (this.info.arguments[arg]['type'] == 
	    'rock_properties_type') {

            var rock_name = this.rocks[args[argname]];
	    if (rock_name){
		cb = function(data){
		    // data = data;
		    //We should send the json object, but would
		    //break other apps
		    value = rock_to_string(data);
		            
		    query_str += '&' + argname + '=' + encodeURIComponent(value);
		}
		$.ajax("/rock?name="+rock_name,{success: cb, 
						type: "GET",
						async: false});
	    }

        } else if(this.info.arguments[arg]['type'] == 
		  'earth_model_type'){
	    var value = JSON.stringify(this.models[args[argname]]);
	    query_str += '&' + argname + '=' + encodeURIComponent(value);
	}
	else{
            var value = args[argname];
	    query_str += '&' + argname + '=' + encodeURIComponent(value);
        };
        
    };
    };

    return query_str;

};


/*
 * === === === === === === === === === === === === === === === === Functions ===
 * === === === === === === === === === === === === === === ===
 */

/*
 * Re populate select script with other options. @param server: a server object.
 * @param selection: selection string or tag 'select' element.
 * 
 */
function populate_scripts(server, type, selection, placeholder) {

    // Broswer-tolerant way to assign default
    //placeholder = (typeof placeholder !== 'undefined') ? placeholder = "Scripts";
    // Not sure about syntax so I'll do it the simple way
    placeholder = placeholder || "Scripts";

    console.log("populate_scripts!");

    select_script = $(selection);

    // Remove options
    select_script.find('option').remove();

    server.get_scripts(type, function(data) {

        select_script = $(selection);
        select_script.find('option').remove();

        select_script.append('<option value="" selected disabled hidden>' + placeholder +' </option>');

        for ( var i = 0; i < data.length; i++) {
            var script_doc = data[i];
            var script = script_doc[0];
            var doc = script_doc[1];
            select_script.append('<option value=' + script + '>' + 
				 doc.slice(0, 50)+ 
				 '</option>');
        };

    });

};

// This function is specific to the scenario.html
/*
 * @param sel: is a div to put the resulting form into.
 */
function display_form(sel, metadata) {

    var div = $(sel);
    div.children().remove();

    div.append('<form id=script_form action=""></form>');

    form = div.find('form#script_form');
    var data = this.info;

    var sliders = [];

    form.append('<div class="well well-sm"><strong>' + data.description + '</strong></div>');

    args = data.arguments;

    form_text = '<table width="100%">';

    for (var arg = 0; arg < args.length; arg++) {
        form_text += '<tr>';

        var deflt = this.arguments[args[arg]["name"]];
        var req = args[arg]['required'];

        if (deflt === null) {
            deflt = '';
        };

//        form_text += '<td>' + arg + ':</td>';
        

        if (args[arg]['type'] == 'rock_properties_type') {
            form_text += '<td><select name="'
                    + args[arg]["name"]
                    + '" class="script_form rock_selector"><option selected hidden disabled value=""></option></select></td>';
        } else if(args[arg]['type'] == 'earth_model_type') {
 form_text += '<td><select name="'
                    + args[arg]["name"]
                    + '" class="script_form model_selector"><option selected hidden disabled value=""></option></select></td>';}
	else if (args[arg]['choices'] != null) {

            form_text += '<td><select name="' + args[arg]["name"] + '" class="script_form choices_selector">';

            for (idx in args[arg]['choices']) {
                console.log('DEF', args[arg]['choices'][idx], deflt, args[arg]['choices'][idx] == deflt);
                if (args[arg]['choices'][idx] == deflt) {
                    form_text += '<option selected>' + args[arg]['choices'][idx] + '</option>';
                } else{
                    
                    form_text += '<option>' + args[arg]['choices'][idx] + '</option>';
                };
                
            };
            form_text += '</select></td>';

        } else if(args[arg]['interface'] == 'slider'){
	    min = args[arg]['range'][0]
	    max = args[arg]['range'][1]
	    name = args[arg]['name']

	    if(name in metadata){
		scale = metadata[name];
		def = scale[deflt];
		pos = 1000 * (deflt/scale.length);
	    }
	    else {def = deflt;
		  pos = deflt };//args[arg]['default']};
	    current =  '<td><label id="'+name+'dis">'+def.toString().substring(0,4) + '</label><input id="'+ name +'" data-slider-id=type="text" data-slider-min="'+min+'" data-slider-max="'+max+'" data-slider-step="1" data-slider-value="'+pos+'"/>'
	    form_text += current;

	    sliders.push(name);
	} else {
	    current = '<td><input class="script_form" type="text" name="' + args[arg]["name"] + '" value="' + deflt
                    + '"></input></td>';
            form_text += current;
        };
	form_text += '<td style="font-size:90%; padding-left:6px;">' + args[arg]['help'] + '</td>';
    };

    form_text += '</table>';

    form.append(form_text);

    for (var i=0; i < sliders.length; i++){
	$('#'+sliders[i]).slider({
	    tooltip:'hide',
	    formater: function(value) {
		return  value;
	    }
	}).on('slideStop', function(ev){

	    if(ev.target.id in metadata){
		// Assume scale is generic 0->1000
		scale = metadata[ev.target.id]
		index = (scale.length * ev.value / 1000.0) +1
		value = index | 0
		if(value >= scale.length){
		    value = scale.length -1;
		};
	    } else {value=ev.value}

	    scenario.update(ev.target.id, value);
	}).on('slide', function(ev){
	    if(ev.target.id in metadata){
		scale = metadata[ev.target.id]
		index = scale.length * ev.value / 1000
		index = (index) | 0
		if(index >= scale.length){
		    index = scale.length -1;
		};
		value = scale[index]
	    } else {value=ev.value}
	    label = $('#'+ev.target.id +'dis');
	    value = value.toString().substring(0,4)
	    label.text(value);});
	

    };
    // inputs = form.find('.script_form');
    // inputs.change(server.input_changed);
    inputs = form.find('.script_form');

    var scenario = this;
    inputs.change(function(ip) {
        scenario.update($(this).attr('name'), $(this).val());
    });

    selectors = form.find('.rock_selector');

    for (rkey in server.rocks) {
        rname = server.rocks[rkey];

        selectors.append('<option value="' + rkey + '">' + rname + 
			 '</option>');
    };

    model_selectors = form.find('.model_selector');

    if (model_selectors){
	for (var model in server.earth_models){
	    model_selectors.append('<option value="' + 
				   model +'">' +
				   model + '</option>');
	};
    };
    var scenario = this;
    $("select.rock_selector option").filter(function() {
        // may want to use $.trim in here
        var name = $(this).parent().attr('name');

        return $(this).val() == scenario.arguments[name];
    }).attr('selected', true);

$("select.model_selector option").filter(function() {
        // may want to use $.trim in here
        var name = $(this).parent().attr('name');

        return $(this).val() == scenario.arguments[name];
    }).attr('selected', true);

    // server.input_changed();

};

/*
 * Get the rocks from a datalist element. inner option elements must 
 * contain the
 * elements data-name and data-value eg: <option data-name='NAME'
 * data-value='VALUE' />
 */
function get_rocks(datalist) {
    var list_of_rocks = $(datalist).find('option');

    var rcks = {};
    list_of_rocks.each(function(index) {
        var name = $(list_of_rocks[index]).attr('data-name');
        var value = $(list_of_rocks[index]).attr('data-value');

        rcks[value] = name;
    });

    return rcks;
};

function get_models(datalist) {
    var list_of_models = $(datalist).find('option');

    var models = [];
    list_of_models.each(function(index) {
        var name = $(list_of_models[index]).attr('data-name');
	var key = $(list_of_models[index]).attr('data-value');
        
	$.get('/earth_model', {keys: key},
	      function callback(data){
		  models[name] = data;
	      });
    });   
    
    return models;
};


function rock_to_string(data){
    return data.vp.toString() +','+ data.vs.toString() + 
	','+data.rho.toString() + ','+ data.vp_std.toString() +
	','+data.vs_std.toString() + 
    ','+data.rho_std.toString();
}



function save_scenario(scenario) {

};
