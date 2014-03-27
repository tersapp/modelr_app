/**
 * 
 */

/*
 * === === === === === === === Classes ===========================
 */

/*
 * Server class
 */
function PlotServer(hostname, rocks) {

    // The host hosting plots.
    this.hostname = hostname;

    // (rock name , rock property) pairs
    this.rocks = rocks;

    /*
     * Asynchronously fetch the list of scripts from the 
     * plotting server 
     * @param callback(data): do something on finish.
     */

    function failure(){
	$.post('/server_error');
	alert("Modelr is experience technical difficulties. Please check back soon.");
	
    };

    this.get_scripts = function get_scripts(callback) {
        $.ajax({url:host + '/available_scripts.json', success:callback,
	       error:failure,type:"GET"});
    };

    /*
     * Asynchronously fetch the information from a single scripts 
     * from the plotting server. 
     * @param callback(data): do something on finish.
     */
    this.get_script_info = function get_script_info(script, callback){
        $.getJSON(this.hostname + '/script_help.json?script=' + 
		  script, callback);
    };
 
};

function EarthStructure(image, depth, length, units, mapping){
    /*
     * Object for dealing with Earth Structures. 
     */

    this.image = image;
    this.mapping = mapping;
    this.depth = depth;
    this.length = length;
    this.units = units;
};

function PropertyMap(images, colour_maps, keys, current_index){
    this.images = images;
    this.colour_maps = colour_maps;
    this.keys = keys;
    this.current_index = current_index;
}

PropertyMap.prototype.get_image = function(){
    return this.images[this.current_index];
}

PropertyMap.prototype.get_mapping = function(){
    return this.colour_maps[this.current_index];
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
}

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
	    'json': this.get_json()}
    $.post('/forward_model', data, callback)
}
    
ForwardModel.prototype.get_json = function get_json(){

    data = JSON.stringify({'earth_model':this.earth_struct,
			   'seismic_model':{script:this.seismic_model.script, 
					    args:this.seismic_model.arguments}, 
			   'plots':{script:this.plots.script,
				    args:this.plots.arguments}});
    return data
}

ForwardModel.prototype.post = function get(server,callback){

    $.post(server.hostname + '/forward_model.json', 
	   this.get_json(), 
	   callback);
};




/*
 * Class for building geometry model images
 */
function ModelBuilder(name, script, arguments) {
    
    this.name = name;
    this.script = script;
    this.arguments = arguments;
}


ModelBuilder.prototype.qs = function() {
    var args = this.arguments;

    query_str = '?script=' + this.script;

    for (argname in args) {
	var value = args[argname];
	query_str += '&' + argname + '=' + encodeURIComponent(value);
	}
    return query_str;
}

/*
 * Update the scenario with the default arguments provided by the 
 * plotting server.
 */
ModelBuilder.prototype.default_args=function default_args(argumentss){
    console.log('default_args', argumentss);
    var args = this.info.arguments;

    this.arguments = {};

    for ( var arg in args) {
        this.arguments[arg] = args[arg]['default'];
        if (arg in argumentss) {
            this.arguments[arg] = argumentss[arg];
        }
    }
}

/*
 * Update an argument.
 */
ModelBuilder.prototype.update = function update(attr, value) {
    this.arguments[attr] = value;
    this.on_change();
}

/*
 * Store the current arguments of this scenario on the server.
 */
ModelBuilder.prototype.put = function() {

    var url = this.qs();

    console.log(url);


    function success(url, textStatus, jqXHR) {
        console.log('post', textStatus);
    }

    $.post('/model_builder', {
        'URL' : url    
    }, success);
    $.document.window.href="/dashboard";
}


/*
 * Scenario 'class'
 */
function Scenario(name, script, arguments, rocks) {
    this.name = name;
    this.script = script;
    this.arguments = arguments;
    this.rocks = rocks;
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

    $.post('/save_scenario', {
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

    $.get('/save_scenario', {
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

    for (argname in args) {
        if (this.info.arguments[argname]['type'] == 'rock_properties_type') {
            var value = this.rocks[args[argname]];
        } else {
            var value = args[argname];

        };
        query_str += '&' + argname + '=' + encodeURIComponent(value);
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
function populate_scripts(server, selection) {

    console.log("populate_scripts!");

    select_script = $(selection);

    // Remove options
    select_script.find('option').remove();

    server.get_scripts(function(data) {

        select_script = $(selection);
        select_script.find('option').remove();

        select_script.append('<option value="" selected disabled hidden>Scripts </option>');

        for ( var i = 0; i < data.length; i++) {
            var script_doc = data[i];
            var script = script_doc[0];
            var doc = script_doc[1];
            select_script.append('<option value=' + script + '>' + 
				 script + ' --- ' + doc.slice(0, 20)+ 
				 '</option>');
        };

    });

};

// This function is specific to the scenario.html
/*
 * @param sel: is a div to put the resulting form into.
 */
function display_form(sel) {

    var div = $(sel);
    div.children().remove();

    div.append('<form id=script_form action=""></form>');

    form = div.find('form#script_form');
    var data = this.info;

    form.append('<div class="well well-sm"><strong>' + data.description + '</strong></div>');

    args = data.arguments;

    form_text = '<table>';

    for (var arg = 0; arg < args.length; arg++) {
        form_text += '<tr>';

        var deflt = this.arguments[args[arg]["name"]];
        var req = args[arg]['required'];

        if (deflt === null) {
            deflt = '';
        };

//        form_text += '<td>' + arg + ':</td>';
        form_text += '<td>' + args[arg]['help'] + '</td>';

        if (args[arg]['type'] == 'rock_properties_type') {
            form_text += '<td><select name="'
                    + args[arg]["name"]
                    + '" class="script_form rock_selector"><option selected hidden disabled value=""></option></select></td>';
        } else if (args[arg]['choices'] != null) {

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

        } else {
            form_text += '<td><input class="script_form" type="text" name="' + args[arg]["name"] + '" value="' + deflt
                    + '"></input></td>';
        };
    };

    form_text += '</table>';

    form.append(form_text);

    // inputs = form.find('.script_form');
    // inputs.change(server.input_changed);
    inputs = form.find('.script_form');

    var scenario = this;
    inputs.change(function(ip) {
        scenario.update($(this).attr('name'), $(this).val());
    });

    selectors = form.find('.rock_selector');

    for (rname in server.rocks) {
        rock_prop = server.rocks[rname];

        selectors.append('<option value="' + rname + '">' + rname + '</option>');
    };

    var scenario = this;
    $("select.rock_selector option").filter(function() {
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
    list_of_rocks = $(datalist).find('option');

    var rcks = {};
    list_of_rocks.each(function(index) {
        var name = $(list_of_rocks[index]).attr('data-name');
        var value = $(list_of_rocks[index]).attr('data-value');

        rcks[name] = value;
    });

    return rcks;
};

function save_scenario(scenario) {

};
