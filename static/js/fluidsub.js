
function FluidSub(canvas, core_width, core_height,
		  rocks, fluids, rock_cmap, fluid_cmap,
		  menu_div,onchange){

    // Make convenience scale for arranging plot
    var xScale = d3.scale.linear()
	    .domain([0,1])
	    .range([0, core_width]);
    var yScale = d3.scale.linear()
	    .domain([0,1])
	    .range([0, core_height]);

    // Set various vars
    var max_depth = 10000.0;
    var total_depth = max_depth * 0.10;
    var y_offset = 0.00;
    var x_offset = xScale(-0.25);
    var intervals = [];
    var rock_width = xScale(0.3);
    var fluid_width = xScale(0.15);

    // Make the y scales
    var scale = d3.scale.linear()
            .domain([0,total_depth]) 
            .range([0, core_height]);

    // For adjusting the maximum depth of the scale
    var max_scale = d3.scale.linear()
            .domain([0, max_depth])
            .range([y_offset, core_height]);
  
    var drag = d3.behavior.drag()
	    .on("drag", dragResize)
	    .on("dragend", onchange);

    var fluidtop_drag = d3.behavior.drag()
	    .on("drag", fluidDrag)
	    .on("dragend", onchange);

    //------ Main canvas -------------------------//    
    canvas.append("text")
        .attr("class", "y-label")
        .attr("text-anchor", "end")
        .attr("y", xScale(0.2))
        .attr("x", yScale(-0.0))
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .text("depth [m]");

    // scaling circle
    var circle = canvas.append("g");
    
    //-------------------Rock Graphics-------------------

    // Make the rock element grouping
    var rgroup = canvas.append("g")
	    .attr("transform", "translate(" + 
                  x_offset.toString() + ",0)");

    // Title/plot label
    rgroup.append("text")
        .attr("class", "y-label")
        .attr("style", "color:blue")
        .attr("text-anchor", "beginning")
        .attr("y", yScale(-0.05)) 
        .attr("x", xScale(0.3))
        .text("Rock");

    rgroup.append("text")
        .attr("class", "y-label")
        .attr("style", "color:blue")
        .attr("text-anchor", "beginning")
        .attr("y", yScale(-0.05)) 
        .attr("x", xScale(0.72))
        .text("F")
        .append("tspan")
        .attr("dy", ".7em")
        .text("0");

    rgroup.append("text")
        .attr("class", "y-label")
        .attr("style", "color:blue")
        .attr("text-anchor", "beginning")
        .attr("y", yScale(-0.05)) 
        .attr("x", xScale(1.0))
        .text("F")
        .append("tspan")
        .attr("dy", ".7em")
        .text("S");

    // var yAxis = d3.svg.axis()
    //         .scale(scale)
    //         .orient("right")
    //         .ticks(5);

    // rgroup.call(yAxis);

    // These groups are made in this order for specifically for 
    // layering order
    var rock_offset = xScale(0.3);
    var rock_intervals = rgroup.append("g")
	    .attr("transform", "translate("+rock_offset.toString() +",0)");
    var rock_tops = rgroup.append("g")
	    .attr("transform", "translate("+rock_offset.toString() +",0)"); 
    
    initialize_menu(menu_div);
    
    // Load up to intervals
    add_interval(0,0,total_depth);
    add_interval(1, total_depth/2,total_depth/2);

    

    // --------------- end of init --------------------------- //

    function add_interval(i, depth, thickness){
	// adds an interval with depth and thickness at the ith layer
	
	// Initialize with a rock
	var rock_ind = Math.floor(Math.random()*50.0) % rocks.length;
	
	var interval = {depth: depth,
			rock: rocks[rock_ind]};
	interval.colour = rock_cmap[interval.rock.name];

	// Check that thickness is defined
	if(typeof thickness !== 'undefined'){
            interval.thickness = thickness;
	}
	
	if(interval.rock.fluid){
            interval.fluid_colour = fluid_cmap[interval.rock.fluid.name];

            var fluid_ind = i % fluids.length;
            var subfluid = {depth: depth,
			    fluid: fluids[fluid_ind],
			    thickness: interval.thickness};
            subfluid.colour = 
		fluid_cmap[subfluid.fluid.name];
            interval.subfluids = [subfluid];
	} else {
            interval.subfluids = [];
	}

	// Add to the interval data list
	intervals.splice(i+1,0, interval);
	
	// update the interval thickness
	calculate_thickness();
	
	// update the core plot
	draw();

    }

    function calculate_thickness(){
	// updates the thickness values in each layer

	// Depth of model
	var end_point = intervals[intervals.length-1].depth +
                intervals[intervals.length-1].thickness;

	// calculation thickness based on depths of tops
	for (var i=0; i<intervals.length-1; i++) {    
            intervals[i].thickness = 
		intervals[i+1].depth - intervals[i].depth;

            if (intervals[i].subfluids.length > 0){

		for (var j=0; j< intervals[i].subfluids.length-1; j++){
		    intervals[i].subfluids[j].thickness = 
			intervals[i].subfluids[j+1].depth - 
			intervals[i].subfluids[j].depth;
		}

		intervals[i]
		    .subfluids[intervals[i]
			       .subfluids.length-1].thickness = 
		    intervals[i].depth + intervals[i].thickness -
		    intervals[i].subfluids[intervals[i].subfluids.length-1].depth;
            }
	}
	
	// Update the last layer
	intervals[intervals.length-1].thickness = end_point - 
            intervals[intervals.length-1].depth;

	var last_interval = intervals[intervals.length-1];

	if (last_interval.subfluids.length > 0){
            for( var j=0; j<last_interval.subfluids.length-1; j++){
		last_interval.subfluids[j].thickness = 
		    last_interval.subfluids[j+1].depth - 
		    last_interval.subfluids[j].depth;
            }
            last_interval
		.subfluids[last_interval.subfluids.length-1]
		.thickness = end_point - 
		last_interval
		.subfluids[last_interval.subfluids.length-1].depth; 
	} // end of if
    } // end of function declaration


    function draw(){
	// Updates the d3 associations and redraws the plot


	// Update the menu
	var menu_row = d3.select("tbody")
	        .selectAll(".intervalRow").data(intervals);

	menu_row.each(update_table_row);

	menu_row.enter().append("tr").attr("class", "intervalRow")
	    .each(update_table_row);

	menu_row.exit().remove();

	// -------------------- Rock Graphics --------------//

	var interval = rock_intervals.selectAll("g")
                .data(intervals);

	// update the existing graphic blocks
	interval.selectAll("#rock")
            .data(function(d){return [d];})
            .attr("fill", function(d){return d.colour;})
            .attr("y", update_depth)
            .attr("height",update_thickness);

	var rock_fluid = interval.selectAll("#rock_fluid")
                .data(function(d){
		    if (d.rock.fluid){
		        return [d];
		    } else {
		        return [];
		    }
                });

	rock_fluid.attr("y", update_depth)
            .attr("fill", function(d){
		return d.fluid_colour;
            })
            .attr("height",update_thickness);

	rock_fluid.enter().append("rect")
            .attr("id","rock_fluid")
            .attr("y", update_depth)
            .attr("x", rock_width + xScale(0.1))
            .attr("width", fluid_width)
            .attr("fill", function(d){
		return d.fluid_colour;
            })
            .attr("height",update_thickness);

	rock_fluid.exit().remove();
	
	var fluidsub = interval.selectAll("#subfluid")
                .data(function(d){
		    if (d.rock.fluid){
		        return d.subfluids;
		    } else {
		        return [];
		    }
	        });

	fluidsub.attr("fill", function(d)
		      { return d.colour; })
            .attr("y", update_depth)
            .attr("height",update_thickness);
	
	fluidsub.enter().append("rect")
            .attr("id", "subfluid")
            .attr("fill", function(d)
		  {return d.colour;})
            .attr("y", update_depth)
            .attr("height",update_thickness)
            .attr("x", rock_width + xScale(0.2) + fluid_width)
            .attr("width", fluid_width)
            .attr("cursor","crosshair")
            .on("click", fluidsub_click);

	fluidsub.exit().remove();

	// fluid sub tops
	var fluid_tops = interval.selectAll("#fluidtop")
                .data(function(d){
		    if (d.rock.fluid){
		        return d.subfluids.slice(1,d.subfluids.length);
		    } else {
		        return [];
		    }
	        });

	fluid_tops.attr("y1", update_depth)
            .attr("y2", update_depth);

	fluid_tops.enter().append("line")
            .attr("x1", rock_width + xScale(0.2) + fluid_width)
            .attr("x2", rock_width + xScale(0.2) + 2*fluid_width)
            .attr("y1", update_depth).attr("y2", update_depth)
            .attr("id", "fluidtop")
            .attr("cursor", "ns-resize")
            .attr("style","stroke:rgb(0,0,0);stroke-width:2")
            .call(fluidtop_drag);

	fluid_tops.exit().remove();

	// New Arrivals
	var new_interval = interval.enter().append("g");

	new_interval.append("rect")
            .attr("width", rock_width)
            .attr("cursor","crosshair")
            .attr("id", "rock")
            .attr("fill", function(d){
		return d.colour;
            })
            .attr("y", update_depth)
            .attr("height",update_thickness)
            .on("click", rock_click)
	
	
	new_interval.selectAll("#rock_fluid")
            .data(function(d){ if(d.rock.fluid){
		return [d];
            } else {
		return [];
            }})
            .enter().append("rect")
            .attr("id", "rock_fluid")
            .attr("y", update_depth)
            .attr("fill", function(d){
		return d.fluid_colour;
            })
            .attr("height",update_thickness)
            .attr("x", rock_width + xScale(0.1))
            .attr("width", fluid_width);
	
	new_interval.selectAll("#subfluid")
            .data(function(d){
		return d.subfluids;
            })
            .enter().append("rect")
            .attr("id", "subfluid")
            .attr("y", update_depth)
            .attr("fill", function(d){
		return d.colour;
            })
            .attr("height",update_thickness)
            .attr("x", rock_width + xScale(0.2) + fluid_width)
            .attr("width", fluid_width)
            .attr("cursor","crosshair")
            .on("click", fluidsub_click)

	new_interval.selectAll("#fluidtop")
            .data(function(d){
		return d.subfluids.slice(1,d.subfluids.length);
            })
            .enter()
            .append("line")
            .attr("x1",60).attr("x2", 70)
            .attr("y1", update_depth)
            .attr("y2", update_depth)
            .attr("id", "fluidtop")
            .attr("cursor", "ns-resize")
            .attr("style","stroke:rgb(0,0,0);stroke-width:2")
            .call(fluidtop_drag);

	interval.exit().remove();

	// Rock Tops
	var top = rock_tops.selectAll("line")
                .data(intervals.slice(1, intervals.length));
	
	// existing
	top.attr("y1", update_depth)
	    .attr("y2",update_depth);
	
	//for the new elements
	top.enter()
            .append("line")
            .attr("x1", 0).attr("x2", xScale(1))
            .attr("y1", update_depth)
            .attr("y2", update_depth)
            .attr("style","stroke:rgb(0,0,0);stroke-width:2")
            .attr("cursor", "ns-resize")
            .call(drag);
	
	top.exit().remove();

	interval.exit().remove();
	
    }

    // Functions for D3 callbacks
    function update_thickness(d){
	return scale(d.thickness) - y_offset;
    }

    function update_depth(d){
	return scale(d.depth);
    }

    function update_bottom(d) {
	return scale(d.depth + d.thickness);
    }

    function fluidDrag(d,i){
	
	var event = d3.event;
	var end_point = d.depth + d.thickness;

	d.depth = scale.invert(event.y);
	if (d.depth > end_point) {
            d.depth = end_point;
	}

	var subfluids = this.parentNode.__data__.subfluids;
	var start_point = subfluids[i].depth;
	if (d.depth < start_point) {
            d.depth = start_point;
	}
	if (i < subfluids.length-2) {
            subfluids[i+2].depth = end_point;
	} else {
            d.thickness = end_point - d.depth;
	}

	calculate_thickness();
	draw();
    }

    // Resize call back
    function dragResize(d,i){
	var event = d3.event;

	var thickness0 = d.thickness;
	var end_point = d.depth + d.thickness;

	d.depth = scale.invert(event.y);
	if (d.depth >= end_point) {
            d.depth = end_point-1;
	}
	var start_point = intervals[i].depth;
	if (d.depth <= start_point) {
            d.depth = start_point +1;
	}
	if (i < intervals.length-2) {
            intervals[i+2].depth = end_point;
	} else {
            d.thickness = end_point - d.depth;
	}

	// current interval
	var squish = (end_point - d.depth)/thickness0;

	if (d.subfluids.length > 0){
            d.subfluids[0].depth = d.depth;
            rescale_subfluids(d, squish);
	}
	
	if (intervals[i].subfluids.length > 0){
            squish = (d.depth -intervals[i].depth) / intervals[i].thickness;
            rescale_subfluids(intervals[i], squish);
	}

	calculate_thickness();
	draw();
    } // end of dragResize

    function rescale_subfluids(interval, squish){
	if((interval.subfluids.length > 0)){

            var upper_fluids = interval.subfluids;
            upper_fluids[0].thickness = 
		upper_fluids[0].thickness * squish;

            for(var j=1; j<upper_fluids.length; j++){
		upper_fluids[j].depth = upper_fluids[j-1].depth + 
		    upper_fluids[j-1].thickness;
		upper_fluids[j].thickness = 
		    upper_fluids[j].thickness * squish;
            } // end for
	}  // end of if
    } // end of function


    function delete_fluidsub(interval,i){
        
	// delete sub fluid
	// always keep one layer
        if (interval.subfluids.length > 1){
	    interval.subfluids.splice(i,1);
	    if(i == 0){
		interval.subfluids[i].depth = interval.depth;
	    };

	    calculate_thickness();
	    draw();
	    onchange();
        };
    };


    function fluidsub_click(d,i){



	var bottom = d.depth + d.thickness;
	d.thickness = scale.invert(d3.mouse(this)[1]) - d.depth;
	var depth = d.depth + d.thickness;
	var thickness = bottom - depth;
	var subfluids = this.parentNode.__data__.subfluids;
	var fluid_ind = i % fluids.length;
	var subfluid = {depth: depth,
			fluid: fluids[fluid_ind],
			thickness: thickness};
	subfluid.colour = 
            fluid_cmap[subfluid.fluid.name]; 
	subfluids.splice(i+1,0, subfluid);

	draw();
	onchange();
    }

    function delete_interval(d, i){
	// deletes interval d from the ith layer
	d3.event.preventDefault();
	// always keep 2 layers
	if (intervals.length > 2) {
            if (i == (intervals.length-1)) {
		var thickness0 = intervals[i-1].thickness;
		intervals[i-1].thickness = 
		    d.thickness + d.depth - intervals[i-1].depth;
		var squish = intervals[i-1].thickness/ thickness0;
		rescale_subfluids(intervals[i-1],squish);
            } else if (i>0){

		var thickness0 = intervals[i-1].thickness;
		var new_thickness = d.depth + d.thickness - 
		        intervals[i-1].depth;
		var squish = new_thickness / thickness0;
		rescale_subfluids(intervals[i-1], squish);
            } 
            
            intervals.splice(i,1);

	    if (i==0){
		intervals[0].depth = 0;
		intervals[0].thickness = intervals[1].depth;
		if(intervals[0].subfluids.length > 0){
		    intervals[0].subfluids[0].depth = 0;
		};
	    };
            calculate_thickness();
            draw();

            onchange();
	} // end of outer if
    } // end of function delete_interval


    function rock_click(d, i, j){

	
        var bottom = d.depth + d.thickness;
        thickness0 = d.thickness;
        d.thickness = scale.invert(d3.mouse(this)[1]) - d.depth;
        var depth = d.depth + d.thickness;
        var thickness = bottom - depth;
        var squish = (thickness0 - thickness) / thickness0;
        
        rescale_subfluids(d, squish);
        add_interval(i, depth, thickness);
        
        onchange();
        
    }

    function update_table_row(d,i){
        
	var div  = d3.select(this);
	div.html("");

        var rock_div = div.append("td");
        
	
	var btn =  rock_div.append("span")
	        .attr("class", 
		      "glyphicon glyphicon-remove-sign deleteBtn btn btn-xs")
	        .attr("id", "deleteBtn")
	        .attr("style", "color: grey");
	

	if(intervals.length >2){
	    btn.attr("style", "color: red")
		.attr("cursor", "pointer")
		.on("click", function(){delete_interval(d,i)});
	} else{ btn.attr("disabled", "disabled")};

        rock_div.append("span")
            .attr("class", "glyphicon glyphicon-stop cblock")
            .attr("id", "rock_colour")
	    .attr("style", "color:" +
		  d.colour);


	var rock_ind = rocks.indexOf(d.rock);
        var select = rock_div.append("select")
	        .attr("class", "menuSelect")
                .on("change", update_rock);

        select.selectAll("option").data(rocks)
            .enter().append("option")
            .attr("value", function(d,i){ return i; })
            .text(function(d){return d.name; });

	select.property("value", rock_ind);



        var fluid_div = div.append("td")
	if (d.rock.fluid){

	    fluid_div.append("span")
		.attr("class", "glyphicon glyphicon-stop cblock")
		.attr("style", "color:" + fluid_cmap[d.rock.fluid.name]);
	    fluid_div.append("label").text(d.rock.fluid.name)
		.attr("style", "vertical-align: top; margin: 8px 0 0 0;");
	    
	} else {
            fluid_div.html("");
	}

        var fluidsub_div = div.append("td");
        

	fluidsub_div.html("");

	var fluidsub_row = fluidsub_div.selectAll(".row")
                .data(function(){
		    if(d.rock.fluid){
		        return d.subfluids;
		    } else {
		        return [];
		    }
                })
                .enter()
                .append("div")
                .attr("class","row");


	var deleteFluidBtn = fluidsub_row.append("span")
	        .attr("class",  
		      "glyphicon glyphicon-remove-sign deleteBtn btn btn-xs")
	        .attr("style", "color: grey;");

	if(d.subfluids.length > 1){
	    deleteFluidBtn.attr("cursor", "pointer")
		.attr("style", "color: red;")
		.on("click", function(dummy,i){delete_fluidsub(d,i)});
	} else{deleteFluidBtn.attr("disabled", "disabled")};

	fluidsub_row.append("span")
            .attr("class", "glyphicon glyphicon-stop cblock")
            .attr("style",function(d){
		return "color:" +
		    d.colour});

	var fluidsub_select = fluidsub_row.append("select")
	        .attr("class", "menuSelect")
                .on("change", update_fluid);

	var option = fluidsub_select.selectAll("option")
                .data(fluids).enter().append("option")
                .text(function(d){return d.name;})
                .attr("value", function(d,i){
		    return i;
                })
                .property("selected", function(d){
		    if (this.parentNode.__data__.fluid.name == d.name){
		        return true;
		    } else {
		        return false;
		    }
                });


	if(d.subfluids.length == 0){
	    fluidsub_div.text("");
	}
    };
    
    function update_rock(){
	var rock = rocks[this.value];
	var interval = d3.select(this.parentNode);
	var d = interval.datum();

	d.rock = rock;
	d.colour = rock_cmap[rock.name];

	if(d.rock.fluid){
            d.fluid_colour = fluid_cmap[d.rock.fluid.name];

            if (d.subfluids.length === 0){
		var subfluid ={depth: d.depth,
			       fluid: fluids[0],
			       thickness: d.thickness};
		subfluid.colour = fluid_cmap[subfluid.fluid.name];
		d.subfluids = [subfluid];
            }
	}
	draw();
    }

    function update_fluid(d, i){
	var fluid = fluids[this.value];
	d.fluid = fluid;
	d.colour = fluid_cmap[fluid.name];

	draw();
    } 


    function initialize_menu(menu){

	var html = '<table class="table table-condensed" id="menu_table" style="width:95%"><th>&nbsp;&nbsp;Rock</th><th>Fluid</th><th>Subbed fluid</th></table>'
	
	var menu_item = d3.select(menu).html(html);
    };// end of function declaration

    function payload(){

        var payload = {dz: 1};
        var layers = [];

        for(var i = 0; i < intervals.length; i++){

            var layer = {};
            interval = intervals[i];
            layer.rock = interval.rock;
            layer.thickness = interval.thickness;
            
            //$.ajax('/rock',{type: "GET", async: false,
            //                data: {keys: JSON.stringify([interval.rock.key])},
            //                success: function (data){
            //                    layer.rock = data;
            //                    layer.thickness = interval.thickness;
            //                }
            //               });
            

            layer.subfluids = [];
            for(var j=0; j<interval.subfluids.length;j++){

                var subinterval = intervals[i].subfluids[j];
                var subfluid = {};
                subfluid.fluid = subinterval.fluid;
                subfluid.thickness = subinterval.thickness;
                layer.subfluids.push(subfluid);
                
                //$.ajax('/fluid', {type: "GET", async: false,
                //                  data: {keys: subinterval.fluid.key},
                //                  success: function (data){
                //                      var subfluid = {};
                //                      subfluid.fluid = data;
                //                      subfluid.thickness = subinterval.thickness;
                //                      layer.subfluids.push(subfluid);
                //                  }
                //                 }
                //     );
            }

            layers.push(layer);
        }

        payload.layers = layers
        return payload;
    }
            
    return {intervals:payload};
}


