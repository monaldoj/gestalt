angular.module("group-nodes-directive", [])

.directive("groupNodes", ["d3Service", "contentService", function(d3Service, contentService) {
	return {
		restrict: "E",
		scope: {
			vizData: "=",
			grouping: "=",
            startGroup: "=",
            canvasWidth: "=",
            canvasHeight: "="
		},
        template: "<div></div>",
		link: function(scope, element, attrs) {
			
			// get d3 promise
			d3Service.d3().then(function(d3) {
                
                ///////////////////////////////////////////////
                /////////////// d3 SET-UP START ///////////////
                ///////////////////////////////////////////////
                                
                // set sizes from attributes in html element
                // if not attributes present - use default
				var width = parseInt(attrs.canvasWidth) || 500;
                var height = parseInt(attrs.canvasHeight) || width;
                var radius = 4;
				var maxRadius = height * 0.5;
                var diameter = radius * 2;
                var	center = { "x": (width / 2), "y": (height/ 2) };
                var nodePadding = 1;
                var charge = {
                    default: 0,
                    geo: -20
                };
                var transition = {
                    time: 500
                };
                
                // x-scale
                var xScale = d3.scale.ordinal();
                
                // circle scale
                var cScale = d3.scale.linear();
                    geo: -8
                };
                var transition = {
                    time: 500
                };
                
                // x-scale
                var xScale = d3.scale.ordinal();
                
                // circle scale
                var cScale = d3.scale.linear();
				
                // set up force layout algorithm
				var force = d3.layout.force()
					//.charge(charge.default)
                    //.charge(function(d, i) {return i ? 0 : -2000;})
					//.charge(function(d, i) { return i==0 ? -10000 : -500; }) // for central node with links
					.charge(function charge(d) { return -Math.pow(d.radius, 2.0) / 8;})
					.gravity(-0.01)
  					.friction(0.9)
                    //.linkDistance(50)
                    .size([(width - diameter), (height - diameter)]);
				
				// set up pack layout algorithm
				var pack = d3.layout.pack()
					.size([(width - diameter), (height - diameter)])
					.padding(1.5)
					.value(function(d) { return /*d.count*/1; });
                
                // set up svg canvas
                var canvas = d3.select(element[0])
                    .append("svg")
                    .attr({
                        viewBox: "0 0 " + width + " " + height
                    });
                
				var links = [{source: 0, target: 20}];
				
                /////////////////////////////////////////////
                /////////////// d3 SET-UP END ///////////////
                /////////////////////////////////////////////
                
                // bind data
                scope.$watchGroup(["vizData", "grouping"], function(newData, oldData) {
                    
                    var startGroup = scope.startGroup;
                    
                    // track which group is currently filtered for
                    var currentGroup = startGroup;
                    var subgroups = [];
                        
                    // async check
                    if (newData[0] !== undefined && newData[1] !== undefined) {
						
						function draw(data, groups) {
                            
                            ///////////////////////////////////////////////
                            /////////////// d3 RENDER START ///////////////
                            ///////////////////////////////////////////////
                                                   
                            // map data to c-scale
                            cScale.domain(d3.extent(data, function(d) { return d.count; }));
                            cScale.range([radius, maxRadius]);
							
							// draw flows between nodes
							function drawFlows() {
								
								// network health
                                contentService.getData("visualization/flows/unique_targets/46/").then(function(data) {

                                    // map raw links to d3 index-specific objects for layout algorithm
									// 3rd param is the connector key in the raw data that connects nodes
									function mapLinks(links, nodes, key) {

										var data = [];

										links.forEach(function(l) {

											// set up the source node
											var source = nodes.filter(function(o, i) {

												// add index to obj
												// note: d3 replaces any "index" key
												o.i = i;

												return o[key] === l.source;

											})[0].i;

											// set up target node
											var target = nodes.filter(function(o, i) {

												// add index to obj
												// note: d3 replaces any "index" key
												o.i = i;

												return o[key] === l.target;

											})[0].i;

											// push to new array
											data.push({
												source: source,
												target: target
											});

										});

										return data;

									};
									console.log(data);
									//links = mapLinks(data, nodes, "id"); // remap links b/c d3 wants use an index to connect nodes
									links = data;
									
									force.nodes(nodes)
									force.links(links)
									force.start();

                                });
								
							};
                            
                            // update nodes based on cluster groups
                            function clusterNodes() {
                                
                                // network health
                                contentService.getData("visualization/network/health/").then(function(data) {

                                    // set scope
                                    scope.$parent.healthMetrics = data;

                                });
                                
                                var groupType = this.innerHTML;
                                
                                // check group type
                                if (groupType == "country") {
                                    
                                    // reset force charge so layout is more accurate
                                    force.charge(charge.geo);
                                    
                                } else {
                                    
                                    // reset force to default
                                    force.charge(charge.default);
                                    
                                };
                                
                                force.start();
                                    
                                // non-region specific grouping
                                d3.range(nodes.length).map(function(i) {

                                    // current node
                                    var curr_node = nodes[i];
                                    var group = groupType;
                                    var subgroup = foci[groupType][curr_node.id];

                                    // move into cluster group
                                    curr_node.cluster = group;
                                    curr_node.subgroup = subgroup;

                                    // set coords
                                    curr_node.cx = foci[groupType][subgroup].x;
                                    curr_node.cy = foci[groupType][subgroup].y;

                                });

                                // resume force layout
                                force.resume();	
                                
                                // update labels
                                updateLabels(groupType);
                                
                            };
                            
                            // change node attributes based on storyline
                            function storyChange() {
                                
                                // set nodes from data
                                // map radius value so collision detection can evaluate nodes
                                nodes = data.map(function(o) {
                                    o.radius = cScale(calcRadius(o.count))
                                    return o;
                                });
                                
                            };
                            
                            // force layout started
                            function startForce(e) {
                                
                                // update cluster labels
                                updateLabels(currentGroup);
                                
                            };
                            
                            // update cluster labels
                            function updateLabels(group) {
                                
                                // set new group
                                currentGroup = group;
                                
                                                    
                                groups.forEach(function(d) {
                                    
                                    // check group name
                                    if (d.name == currentGroup) {
                                        
                                        // set new subgroup
                                        subgroups = d.subgroups;
                                        
                                        // add foci coords to object
                                        subgroups.map(function(d) {
                                            d.x = foci[group][d.id].x;
                                            d.y = foci[group][d.id].y;
                                        });
                                        
                                    };
                                    
                                });
                                
                                // calc max/min scales
                                var xDomain = subgroups.map(function(d) { return d.name; });
                                
                                // add data to x-scale layout algorithm
                                xScale.domain(xDomain);
                                xScale.rangePoints([radius, width - radius]);
                                
                                // check for group type
                                if (currentGroup == "country") {
                                    
                                    // hide labels so viz is legible
                                    subgroups = [];
                                    
                                };
                                
                                // GROUP LABEL
                                var label = canvas
                                    .selectAll(".group-label")
                                    .data(subgroups);

                                // update selection
                                label
                                    .transition()
                                    .duration(transition.time)
                                    .attr({
                                        class: "group-label",
                                        dx: function(d) { return d.x },
                                        dy: function(d) { return d.y }
                                    })
                                    .text(function(d) { return d.name; });

                                // enter selection
                                label
                                    .enter()
                                    .append("text")
                                    .transition()
                                    .duration(transition.time)
                                    .attr({
                                        class: "group-label",
                                        dx: function(d) { return d.x; },
                                        dy: function(d) { return d.y }
                                    })
                                    .text(function(d) { return d.name; });

                                // exit selection
                                label
                                    .exit()
                                    .transition()
                                    .duration(transition.time)
                                    .remove();
                                    
                                });
								
								// GROUP LABEL
                                /*var bkgrnd = canvas
                                    .selectAll(".group-bkgrnd")
                                    .data(subgroups);

                                // update selection
                                bkgrnd
                                    .transition()
                                    .duration(transition.time)
                                    .attr({
                                        class: "group-bkgrnd",
                                        x: function(d, i) { return (width / subgroups.length) * i; },
                                        y: 0,
										width: width / subgroups.length,
										height: height
                                    })
									.style({
									fill: "red",
									opacity: function(d, i) { return i * .1; }
								});

                                // enter selection
                                bkgrnd
                                    .enter()
                                    .append("rect")
                                    .transition()
                                    .duration(transition.time)
                                    .attr({
                                        class: "group-bkgrnd",
                                        x: function(d, i) { return (width / subgroups.length) * i; },
                                        y: 0,
									width: width / subgroups.length,
									height: height
                                    })
									.style({
									fill: "red",
									opacity: function(d, i) { return i * .1; }
								});

                                // exit selection
                                bkgrnd
                                    .exit()
                                    .transition()
                                    .duration(transition.time)
                                    .remove();*/
                                
                            };
                            
                            // force ticks
                            function tick(e) {
                                
                                // force direction and shape of clusters
                                var k = e.alpha * 0.102;

                                // set new node location
                                nodes.forEach(function(o, i) {
									
                                    // get focus x,y values
                                    o.y += (foci[o.cluster][o.subgroup].y - o.y) * k;
                                    o.x += (foci[o.cluster][o.subgroup].x - o.x) * k;
                                                                 
                                });
								
								link
									.attr({
										x1: function(d) { return d.source.x; },
										y1: function(d) { return d.source.y; },
										x2: function(d) { return d.target.x; },
										y2: function(d) { return d.target.y; }
									});
								                                
                                // push nodes toward focus
                                node
                                    .each(collide(0.5))
                                    .attr({
                                        transform: function(d) { return "translate(" + d.x + "," + d.y + ")"; }
                                    });
								
                            };
                            
                            // force layout done
                            function endForce(e) {
                                console.log("do something when layout complete");                                
                            };
                                                     
                            // calc circle radius when area is mapped to count
                            function calcRadius(value) {
                                
                                return Math.sqrt(value / Math.PI);
                                
                            };
                            
							// managae collision detection between nodes
                            function collide(alpha) {
                                
                                var quadtree = d3.geom.quadtree(nodes);
                                
                                return function(d) {
                                    
                                    // select node DOM elements
                                    var nodeGroup = canvas
                                        .select("#node-" + d.id).node();

                                    // get size of the group element
                                    var groupSize = nodeGroup.getBBox().height + nodePadding;

                                    // get coordinate values
                                    var r = groupSize / 2 + nodePadding;
                                    var nx1 = d.x - r;
                                    var nx2 = d.x + r;
                                    var ny1 = d.y - r;
                                    var ny2 = d.y + r;
                                    
                                    quadtree.visit(function(quad, x1, y1, x2, y2) {
                                        
                                        if (quad.point && (quad.point !== d)) {
                                
                                            var x = d.x - quad.point.x;
                                            var y = d.y - quad.point.y;
                                            var l = Math.sqrt(x * x + y * y);
                                            var r = groupSize / 2 + quad.point.r;

                                            // check if location against radius
                                            if (l < r) {

                                                l = (l - r) / l * 0.5;
                                                d.x -= x *= l;
                                                d.y -= y *= l;
                                                quad.point.x += x;
                                                quad.point.y += y;

                                            };

                                        };
                                        
                                         return x1 > nx2 || x2 < nx1 || y1 > ny2 || y2 < ny1;
                                        
                                    })
                                    
                                }
                            };
                            
                            // make foci objects for each group
                            var foci = {};
                            groups.map(function(o) {
                                
                                // check for starting group
                                if (o.name == startGroup) {
                                    
                                    // add x,y values
                                    // assumes starting is a single group
                                    // if we want to be able to start in a different grouping
                                    // need to adjust logic to accomodate
                                    o.subgroups[0].center_x = center.x;
                                    o.subgroups[0].center_y = center.y;
                                    
                                    // update nodes with default group and subgroup
                                    data.map(function(n) {

                                        // add values from data
                                        n["cluster"] = startGroup;
                                        n["subgroup"] = o.subgroups[0].id;

                                    });
                                    
                                };
                                
                                var subgroups = {};
                                
                                // track cursor for grided layouts
                                var cellWidth = width / o.subgroups.length;
								var halfCell = cellWidth / 2;
                                var cursorX = halfCell;
                                
                                // add subgroups to obj
                                o.subgroups.map(function(s) {//console.log(s)
                                    
                                    // check for nulls and do math to figure out new coords
                                    if (s.center_x == null && s.center_y == null) {
                                        
                                        // set coords evenly in the available space
                                        var coords = {};
                                        
                                        coords["x"] = cursorX;
                                        coords["y"] = height / 2;
                                        
                                        cursorX += cellWidth;
                                        
									// default group
                                    } else {
                                    
                                        // nulls mean non-geographic groups
                                        var coords = {};
                                        coords["x"] = s.center_x;
                                        coords["y"] = s.center_y;
                                        
                                        
                                    };
                                    
                                    // add values to use as lookups later
                                    subgroups[s.id] = coords;
                                    
                                    // add nodes as subgroups
                                    s.nodes.map(function(n) {
                                        
                                        // check for null node arrays
                                        // TODO see if endponit can expose empty array vs. null array
                                        if (n !== null) {

                                            subgroups[n.iso] = s.id;
                                            
                                        };
                                        
                                    });
                                    
                                });
                                
                                foci[o.name] = subgroups;
                                
                            });
                            
                            // attach event to button
							d3.select(element.find("div")[0])
								.selectAll(".country-group")
								.data(groups)
								.enter()
								.append("button")
								.attr({
									type: "button"
								})
								.text(function(d) { return d.name; })
                                .on("click", clusterNodes);
                            
                            var storyButtons = ["high centrality"]
                            
                            // temp buttons while we build more transition options
                            d3.select(element.find("div")[0])
                                .selectAll(".temp")
                                .data(storyButtons)
                                .enter()
                                .append("button")
                                .attr({
                                    type: "button"
                                })
                                .text(function(d) { return d; })
                                .on("click", storyChange);
                            
                            // set nodes from data
                            // map radius value so collision detection can evaluate nodes
                            var data = data.map(function(o) {
                                o.r = radius;
                                return o;
                            });
														
							// bind data to pack layout
							//var nodes = pack.nodes({children:data}).filter(function(d) { return !d.children; });
							var nodes = data;
                            
                            // bind data to force layout
                            force
                                .nodes(nodes)
								//.links(links)
                                .on("start", startForce)
                                .on("tick", tick)
                                .on("end", endForce)
                                .start();
							
							// LINK
							var link = canvas
								.selectAll(".link")
								.data(force.links());
							
							// update selection
							link
								.transition()
								.duration(transition.time)
								.attr({
									class: "link",
									x1: function(d) { return d.source.x; },
									y1: function(d) { return d.source.y; },
									x2: function(d) { return d.target.x; },
									y2: function(d) { return d.target.y; }
								});
							
							// enter selection
							link
								.enter()
								.append("line")
								.transition()
								.duration(transition.time)
								.attr({
									class: "link",
									x1: function(d) { return d.source.x; },
									y1: function(d) { return d.source.y; },
									x2: function(d) { return d.target.x; },
									y2: function(d) { return d.target.y; }
								});
							
							// exit selection
							link
								.exit()
								.transition()
								.duration(transition.time)
								.remove();
                            
                            // NODE
                            var node = canvas
                                .selectAll(".node")
                                .data(nodes)
                                .enter()
                                .append("g")
                                .attr({
                                    class: "node",
                                    id: function(d) { return "node-" + d.id; },
                                    transform: function(d) { return "translate(" + d.x + "," + d.y + ")"; }
                                })
                            
                                .each(function(group) {
                                    
                                    var currentGroup = d3.select(this);
                                    
                                    // circle
                                    currentGroup
                                        .append("circle")
                                        .attr({
                                            r: function(d) { return d.r; }
                                        });
                                    
                                    // label
                                    currentGroup
                                        .append("text")
                                        .attr({
                                            dx: 0,
                                            dy: "0.35em"
                                        })
                                        .text(function(d) { return d.id });
                                })
								//.call(force.drag)
								//.on("click", drawFlows);
                                
                        };

                        // update the viz
                        draw(newData[0], newData[1]);
                        
                        /////////////////////////////////////////////
                        /////////////// d3 RENDER END ///////////////
                        /////////////////////////////////////////////
                        
                    };
                    
                });
                
			});
			
		}
		
	};
}]);
